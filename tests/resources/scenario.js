/*
   Copyright 2018 getcarrier.io

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

const {
    Builder,
    By
} = require('selenium-webdriver')

require('chromedriver');
var JSONPATH = require('jsonpath')

const testSteps = 'steps'
const locatorXpath = 'xpath'
const locatorCss = 'css'
const locatorId = 'id'
const testUrl = 'url'
const testInput = 'input'
const inputValue = 'value'
const testClick = 'click'
const testCheck = 'check'
const testCheckNotPresent = 'checkIsNot'
const switchToFrame = 'switchToFrame'
const switchToDefault = 'switchToDefault'

var Waiter = require("./waiters")
var Lighthouse = require('./lighthouse')
var Logger = require('./logger')
const { format } = require('util')
var utils = require('./utils')
var ActionWraper = require('./execution_module/action_wraper')
var JUnitBuilder = require('./junit_reporter')
var requestREST = require('request-promise').defaults({ jar: true });
var toughCookie = require('tough-cookie');
var lightHouseArr
var triggerForInfluxConfig
var sesionCookie
var sesionState
var globalUserVariablesStore

function ScenarioBuilder(test_name, influxConfig, reportPortalConfig, lightHouseDevice, suite, preSettedGlobalUserVariable) {
    this.testName = test_name.replace(/\.y.?ml/g, '')
    if (influxConfig && influxConfig['url'] != null) {
        triggerForInfluxConfig = true;
    }
    else {
        triggerForInfluxConfig = false;
    }
    this.logger = new Logger(influxConfig, this.testName, triggerForInfluxConfig, suite)
    if (reportPortalConfig) {
        this.rp = reportPortalConfig
    }
    this.junit = new JUnitBuilder(this.testName)

    this.lighthouse = new Lighthouse()
    lightHouseArr = lightHouseDevice
    globalUserVariablesStore = preSettedGlobalUserVariable || {}
}

const lighthouse_opts = {
    chromeFlags: ['--show-paint-rects', '--window-size=1440,900'],
    disableDeviceEmulation: true
};

const lighthouse_opts_mobile = {
    chromeFlags: ['--show-paint-rects', '--window-size=1440,900']
};

const capabilities = {
    "browserName": 'chrome',
    "chromeOptions": {
        "args": ["--window-size=1440,900", "--disable-dev-shm-usage", "--no-sandbox"],
        "extensions": []
    }
}

ScenarioBuilder.prototype.TestStepsExecute = async function (driver, page_name, baseUrl, parameters, pageCheck, stepList, waiter, iteration, scenarioIter, targetUrl) {
    var page_name = page_name.replace(/[^a-zA-Z0-9_]+/g, '_')
    var lh_name = `${page_name}_lh_${iteration}`
    var outer_this = this;
    await driver.sleep(200)
        .then(() => { console.log("\nOpening %s TestCase (%d)", page_name, iteration) })
        .then(() => outer_this.ExecuteTest(driver, scenarioIter, baseUrl, pageCheck, stepList, waiter, targetUrl))
        .catch((error) => { return error })
        .then((error) => outer_this.ResultReport(driver, page_name, baseUrl, parameters, lh_name, error))
}

/// Method which executing list of steps
ScenarioBuilder.prototype.ExecuteTest = async function (driver, scenarioIter, baseUrl, pageCheck, stepList, waiter, targetUrl) {
    var outer_this = this;
    var locator;
    var actionStep;

    if (scenarioIter == 0 || targetUrl != baseUrl) {
        await driver.get(baseUrl)
    }
    for (let step in stepList) {
        actionStep = stepList[step]
        locator = await ActionWraper.GetWebElementLocator(actionStep)
        switch (actionStep[0]) {
            case 'input':
                await ActionWraper.ExecuteInput(driver, locator, actionStep[3])
                break;
            case 'check':
                await ActionWraper.ExecuteCheckIsPresent(waiter, locator)
                break;
            case 'checkIsNot':
                await ActionWraper.ExecuteCheckIsNotPresent(waiter, locator)
                break;
            case 'click':
                await ActionWraper.ExecuteClick(driver, locator)
                break;
            case 'switchToFrame':
                await ActionWraper.ExecuteSwitchToFrame(driver, locator)
                break;
            case 'switchToDefault':
                await ActionWraper.ExecuteSwitchToDefaultContent(driver)
                break;
            case 'url':
                await ActionWraper.ExecuteNavigateToUrl(driver, actionStep[1])
                break;
            default:
                break;
        }
    }
    if (pageCheck != null || pageCheck != undefined) {
        locator = await ActionWraper.GetWebElementLocator(pageCheck)
        await ActionWraper.ExecuteCheckIsPresent(waiter, locator)
    }
    sesionCookie = await ActionWraper.GetSessionCookie(driver);
}

ScenarioBuilder.prototype.ResultReport = async function (driver, pageName, pageUrl, parameter, lh_name, error) {
    var outer_this = this;
    var isAction
    if (error) {
        console.log(`Test Case ${pageName} failed.`)
        await outer_this.junit.failCase(pageName, error)
    }
    else {
        console.log(`Starting Analyse ${pageName}.`)
        await outer_this.junit.successCase(pageName)
    }
    if (!outer_this.rp) {
        if (error) {
            await utils.takeScreenshot(driver, `${pageName}_Failed`)
        }
        else {
            await utils.takeScreenshot(driver, pageName)
        }
    }
    if (outer_this.logger) {
        if (error) {
            var status = 'ko'
            await outer_this.logger.logError(error, pageUrl, pageName, parameter)
            await outer_this.logger.logInfo(driver, pageName, status)
        }
        else {
            var status = 'ok'
            isAction = await outer_this.logger.logInfo(driver, pageName, status)
            await driver.executeScript('performance.clearResourceTimings()');
        }
    }
    if (!isAction) {
        if (lightHouseArr != undefined || lightHouseArr != null) {
            if (lightHouseArr['mobile']) {
                var lh_name_mobile = lh_name + "_mobile"
                await outer_this.lighthouse.startLighthouse(lh_name_mobile, lighthouse_opts_mobile, driver, this.testName);
            }
            if (lightHouseArr['desktop']) {
                var lh_name_desktop = lh_name + "_desktop"
                await outer_this.lighthouse.startLighthouse(lh_name_desktop, lighthouse_opts, driver, this.testName);
            }
        }
    }
    if (outer_this.rp) {
        if (error) {
            await outer_this.rp.reportIssue(error, pageUrl, parameter, pageName, driver, lh_name_mobile, lh_name_desktop)
        }
        else {
            await outer_this.rp.reportResult(pageName, pageUrl, parameter, driver, lh_name_mobile, lh_name_desktop)
        }
    }
}

ScenarioBuilder.prototype.getSesion = function (sesionState, url, cookieJar, reqOptions) {
    if (sesionState.length > 1) {
        for (let cookie in sesionState) {
            cookieJar.setCookie(sesionState[cookie], url)
        }
    }
    else {
        cookieJar.setCookie(sesionState, url)
    }
    reqOptions.jar = cookieJar
    return reqOptions
}

ScenarioBuilder.prototype.scn = async function (scenario, globalIteration, times) {
    var outer_this = this;
    var driver
    var waiter
    var test_name = outer_this.testName
    var scenarioIter = 0;
    var baseUrl
    var additionalUrl
    var cookieJar = requestREST.jar();
    var constRegex = /[$]{(.*.)}/

    try {
        console.log(`\n${test_name} test, iteration ${globalIteration}`)
        for (let page_name in scenario) {

            var stepList = []
            var page = scenario[page_name]
            var parameters = page['parameters']
            var pageUrlWithParameters
            var pageCheck

            if (page['method']) {
                switch (page['method']) {
                    case 'GET':
                    case 'HEAD':
                        var callParamPair = page['parameters']
                        var callBodyPair = page['body']
                        var postActions = page['postActions']
                        var getOption = {
                            method: page['method'],
                            headers: page['headers'] || { perfui: "carrier-io" },
                            time: true,
                            resolveWithFullResponse: true
                        }
                        var path = page['path'] || '/'
                        getOption.uri = page['url'] + path
                        if (sesionCookie != null || sesionCookie != undefined) {
                            var cookieToAdd = ''
                            for (let cookie in sesionCookie) {
                                var cookieBuilder = sesionCookie[cookie].name + "=" + sesionCookie[cookie].value + ";"
                                cookieToAdd += cookieBuilder
                            }
                            getOption.headers.Cookie = cookieToAdd
                        }
                        if (sesionState != null || sesionState != undefined) {
                            getOptions = outer_this.getSesion(sesionState, page['url'], cookieJar, getOption)
                        }
                        if (callParamPair != undefined || callBodyPair != undefined) {
                            for (let parameter in callParamPair) {
                                console.log("\nSend %s Request (%d)", page_name, globalIteration)
                                var parametrUserVar = callParamPair[parameter]

                                for (let value in callParamPair[parameter]) {
                                    if (constRegex.test(callParamPair[parameter][value])) {
                                        var test = constRegex.exec(callParamPair[parameter][value])
                                        var test = test[1]
                                        if (globalUserVariablesStore[test] != null || globalUserVariablesStore[test] != undefined) {
                                            parametrUserVar[value] = globalUserVariablesStore[test]

                                        }
                                        else {
                                            console.error("Cant read user variable " + parametrUserVar[value])
                                        }
                                    }

                                }
                                getOption.qs = parametrUserVar
                                await requestREST(getOption)
                                    .then((res) => {
                                        try {
                                            var temp = JSON.parse(res.body)
                                        }
                                        catch (err) {
                                            var temp = res.body
                                        }
                                        if (postActions) {
                                            for (let action in postActions) {
                                                if (postActions[action]['jsonValue']) {
                                                    var jsonValue = postActions[action]['jsonValue']
                                                    var tempUserVar = postActions[action]['saveAs']
                                                    var grabValue = temp[jsonValue]
                                                    globalUserVariablesStore[tempUserVar] = grabValue
                                                }
                                                if (postActions[action]['jsonPath']) {
                                                    var jsonPathValue = postActions[action]['jsonPath']
                                                    var tempUserVar = postActions[action]['saveAs']
                                                    var grabValue = JSONPATH.value(temp, jsonPathValue)
                                                    globalUserVariablesStore[tempUserVar] = grabValue
                                                }
                                                if (postActions[action]['regEx']) {
                                                    var regexValue = postActions[action]['regEx']
                                                    var tempUserVar = postActions[action]['saveAs']
                                                    try {
                                                        var grabValue = JSON.stringify(temp).match(regexValue)
                                                    }
                                                    catch (err) {
                                                        var grabValue = temp.toString().match(regexValue)
                                                    }
                                                    if (grabValue != null || grabValue != undefined) {
                                                        globalUserVariablesStore[tempUserVar] = grabValue[1]
                                                    }
                                                    else {
                                                        globalUserVariablesStore[tempUserVar] = undefined
                                                    }
                                                }
                                            }
                                        }
                                        if (res.headers['set-cookie']) {
                                            if (res.headers['set-cookie'] instanceof Array) {
                                                sesionState = res.headers['set-cookie'].map(toughCookie.Cookie.parse)
                                            }
                                            else {
                                                sesionState = [toughCookie.Cookie.parse(res.headers['set-cookie'])];
                                            }
                                        }
                                        outer_this.logger.apiCallSuccess(res, page_name)
                                        outer_this.junit.successCase(page_name)
                                        if (outer_this.rp) {
                                            outer_this.rp.successCall(res, page_name)
                                        }
                                    })
                                    .catch((err) => {
                                        console.log(err)
                                        outer_this.logger.apiCallFail(err, page_name)
                                        var errorReason = err.statusCode + " response code. Message: " + JSON.stringify(err.error)
                                        outer_this.junit.failCase(page_name, errorReason)
                                        if (outer_this.rp) {
                                            outer_this.rp.failedCall(err, page_name)
                                        }
                                    })
                                await utils.sleep(1)
                            }
                            for (let reqbody in callBodyPair) {
                                console.log("\nSend %s Request (%d)", page_name, globalIteration)
                                getOption.headers.body = callBodyPair[reqbody]
                                await requestREST(getOption)
                                    .then((res) => {
                                        if (res.headers['set-cookie']) {
                                            if (res.headers['set-cookie'] instanceof Array) {
                                                sesionState = res.headers['set-cookie'].map(toughCookie.Cookie.parse)
                                            }
                                            else {
                                                sesionState = [toughCookie.Cookie.parse(res.headers['set-cookie'])];
                                            }
                                        }
                                        outer_this.logger.apiCallSuccess(res, page_name)
                                        outer_this.junit.successCase(page_name)
                                        if (outer_this.rp) {
                                            outer_this.rp.successCall(res, page_name)
                                        }
                                    })
                                    .catch((err) => {
                                        console.log(err)
                                        outer_this.logger.apiCallFail(err, page_name)
                                        var errorReason = err.statusCode + " response code. Message: " + JSON.stringify(err.error)
                                        outer_this.junit.failCase(page_name, errorReason)
                                        if (outer_this.rp) {
                                            outer_this.rp.failedCall(err, page_name)
                                        }
                                    })
                                await utils.sleep(1)
                            }
                        }
                        else {
                            console.log("\nSend %s Request (%d)", page_name, globalIteration)
                            await requestREST(getOption)
                                .then((res) => {
                                    if (res.headers['set-cookie']) {
                                        if (res.headers['set-cookie'] instanceof Array) {
                                            sesionState = res.headers['set-cookie'].map(toughCookie.Cookie.parse)
                                        }
                                        else {
                                            sesionState = [toughCookie.Cookie.parse(res.headers['set-cookie'])];
                                        }
                                    }
                                    outer_this.logger.apiCallSuccess(res, page_name)
                                    outer_this.junit.successCase(page_name)
                                    if (outer_this.rp) {
                                        outer_this.rp.successCall(res, page_name)
                                    }
                                })
                                .catch((err) => {
                                    outer_this.logger.apiCallFail(err, page_name)
                                    var errorReason = err.statusCode + " response code. Message: " + JSON.stringify(err.error)
                                    outer_this.junit.failCase(page_name, errorReason)
                                    if (outer_this.rp) {
                                        outer_this.rp.failedCall(err, page_name)
                                    }
                                })
                            await utils.sleep(1)
                        }
                        break;
                    case 'POST':
                        var callBodyPair = page['body']
                        var callFormPair = page['form']
                        var callParamPair = page['parameters']
                        var postActions = page['postActions']
                        var postHeaders = page['headers'] || { perfui: "carrier-io" }
                        var postOption = {
                            method: 'POST',
                            headers: postHeaders,
                            json: true,
                            time: true,
                            resolveWithFullResponse: true
                        }
                        var path = page['path'] || '/'
                        postOption.uri = page['url'] + path
                        if (sesionCookie != null || sesionCookie != undefined) {
                            var cookieToAdd = ''
                            for (let cookie in sesionCookie) {
                                var cookieBuilder = sesionCookie[cookie].name + "=" + sesionCookie[cookie].value + ";"
                                cookieToAdd += cookieBuilder
                            }
                            postOption.headers.Cookie = cookieToAdd
                        }
                        if (sesionState != null || sesionState != undefined) {
                            postOption = outer_this.getSesion(sesionState, page['url'], cookieJar, postOption)
                        }
                        if (callParamPair != undefined || callBodyPair != undefined) {
                            for (let parameter in callParamPair) {
                                var parametrUserVar = callParamPair[parameter]

                                for (let value in callParamPair[parameter]) {
                                    if (constRegex.test(callParamPair[parameter][value])) {
                                        var test = constRegex.exec(callParamPair[parameter][value])
                                        var test = test[1]
                                        if (globalUserVariablesStore[test] != null || globalUserVariablesStore[test] != undefined) {
                                            parametrUserVar[value] = globalUserVariablesStore[test]
                                        }
                                        else {
                                            console.error("Cant read user variable " + parametrUserVar[value])
                                        }
                                    }

                                }
                                postOption.qs = parametrUserVar
                            }
                        }
                        for (let reqbody in callBodyPair) {
                            console.log("\nSend %s Request (%d)", page_name, globalIteration)
                            postOption.body = callBodyPair[reqbody]
                            await requestREST(postOption)
                                .then((res) => {
                                    var temp = res.body
                                    if (postActions) {
                                        for (let action in postActions) {
                                            if (postActions[action]['jsonValue']) {
                                                var jsonValue = postActions[action]['jsonValue']
                                                var tempUserVar = postActions[action]['saveAs']
                                                var grabValue = temp[jsonValue]
                                                globalUserVariablesStore[tempUserVar] = grabValue
                                            }
                                            if (postActions[action]['jsonPath']) {
                                                var jsonPathValue = postActions[action]['jsonPath']
                                                var tempUserVar = postActions[action]['saveAs']
                                                var grabValue = JSONPATH.value(temp, jsonPathValue)
                                                globalUserVariablesStore[tempUserVar] = grabValue
                                            }
                                            if (postActions[action]['regEx']) {
                                                var regexValue = postActions[action]['regEx']
                                                var tempUserVar = postActions[action]['saveAs']
                                                try {
                                                    var grabValue = JSON.stringify(temp).match(regexValue)
                                                }
                                                catch (err) {
                                                    var grabValue = temp.toString().match(regexValue)
                                                }
                                                if (grabValue != null || grabValue != undefined) {
                                                    globalUserVariablesStore[tempUserVar] = grabValue[1]
                                                }
                                                else {
                                                    globalUserVariablesStore[tempUserVar] = undefined
                                                }
                                            }
                                        }
                                    }
                                    if (res.headers['set-cookie']) {
                                        if (res.headers['set-cookie'] instanceof Array) {
                                            sesionState = res.headers['set-cookie'].map(toughCookie.Cookie.parse)
                                        }
                                        else {
                                            sesionState = [toughCookie.Cookie.parse(res.headers['set-cookie'])];
                                        }
                                    }
                                    outer_this.logger.apiCallSuccess(res, page_name)
                                    outer_this.junit.successCase(page_name)
                                    if (outer_this.rp) {
                                        outer_this.rp.successCall(res, page_name)
                                    }
                                })
                                .catch((err) => {
                                    outer_this.logger.apiCallFail(err, page_name)
                                    var errorReason = err.statusCode + " response code. Message: " + JSON.stringify(err.error)
                                    outer_this.junit.failCase(page_name, errorReason)
                                    if (outer_this.rp) {
                                        outer_this.rp.failedCall(err, page_name)
                                    }
                                })
                            await utils.sleep(1)
                        }
                        for (let xform in callFormPair) {
                            console.log("\nSend %s Request (%d)", page_name, globalIteration)
                            postOption.form = callFormPair[xform]
                            await requestREST(postOption)
                                .then((res) => {
                                    outer_this.logger.apiCallSuccess(res, page_name)
                                    outer_this.junit.successCase(page_name)
                                    if (outer_this.rp) {
                                        outer_this.rp.successCall(res, page_name)
                                    }
                                })
                                .catch((err) => {
                                    outer_this.logger.apiCallFail(err, page_name)
                                    var errorReason = err.statusCode + " response code. Message: " + JSON.stringify(err.error)
                                    outer_this.junit.failCase(page_name, errorReason)
                                    if (outer_this.rp) {
                                        outer_this.rp.failedCall(err, page_name)
                                    }
                                })
                            await utils.sleep(1)
                        }
                        break;
                    case 'PUT':
                        var callBodyPair = page['body']
                        var callFormPair = page['form']
                        var postActions = page['postActions']
                        var putHeaders = page['headers'] || { perfui: "carrier-io" }
                        var putOption = {
                            method: 'PUT',
                            json: true,
                            headers: putHeaders,
                            time: true,
                            resolveWithFullResponse: true
                        }
                        var path = page['path'] || '/'
                        putOption.uri = page['url'] + path
                        if (sesionCookie != null || sesionCookie != undefined) {
                            var cookieToAdd = ''
                            for (let cookie in sesionCookie) {
                                var cookieBuilder = sesionCookie[cookie].name + "=" + sesionCookie[cookie].value + ";"
                                cookieToAdd += cookieBuilder
                            }
                            putOption.headers.Cookie = cookieToAdd
                        }
                        if (sesionState != null || sesionState != undefined) {
                            putOption = outer_this.getSesion(sesionState, page['url'], cookieJar, putOption)
                        }
                        if (callParamPair != undefined || callBodyPair != undefined) {
                            for (let parameter in callParamPair) {
                                var parametrUserVar = callParamPair[parameter]

                                for (let value in callParamPair[parameter]) {
                                    if (constRegex.test(callParamPair[parameter][value])) {
                                        var test = constRegex.exec(callParamPair[parameter][value])
                                        var test = test[1]
                                        if (globalUserVariablesStore[test] != null || globalUserVariablesStore[test] != undefined) {
                                            parametrUserVar[value] = globalUserVariablesStore[test]
                                        }
                                        else {
                                            console.error("Cant read user variable " + parametrUserVar[value])
                                        }
                                    }

                                }
                                putOption.qs = parametrUserVar
                            }
                        }
                        for (let reqbody in callBodyPair) {
                            console.log("\nSend %s Request (%d)", page_name, globalIteration)
                            putOption.body = callBodyPair[reqbody]
                            await requestREST(putOption)
                                .then((res) => {
                                    var temp = res.body
                                    if (postActions) {
                                        for (let action in postActions) {
                                            if (postActions[action]['jsonValue']) {
                                                var jsonValue = postActions[action]['jsonValue']
                                                var tempUserVar = postActions[action]['saveAs']
                                                var grabValue = temp[jsonValue]
                                                globalUserVariablesStore[tempUserVar] = grabValue
                                            }
                                            if (postActions[action]['jsonPath']) {
                                                var jsonPathValue = postActions[action]['jsonPath']
                                                var tempUserVar = postActions[action]['saveAs']
                                                var grabValue = JSONPATH.value(temp, jsonPathValue)
                                                globalUserVariablesStore[tempUserVar] = grabValue
                                            }
                                            if (postActions[action]['regEx']) {
                                                var regexValue = postActions[action]['regEx']
                                                var tempUserVar = postActions[action]['saveAs']
                                                try {
                                                    var grabValue = JSON.stringify(temp).match(regexValue)
                                                }
                                                catch (err) {
                                                    var grabValue = temp.toString().match(regexValue)
                                                }
                                                if (grabValue != null || grabValue != undefined) {
                                                    globalUserVariablesStore[tempUserVar] = grabValue[1]
                                                }
                                                else {
                                                    globalUserVariablesStore[tempUserVar] = undefined
                                                }
                                            }
                                        }
                                    }
                                    if (res.headers['set-cookie']) {
                                        if (res.headers['set-cookie'] instanceof Array) {
                                            sesionState = res.headers['set-cookie'].map(toughCookie.Cookie.parse)
                                        }
                                        else {
                                            sesionState = [toughCookie.Cookie.parse(res.headers['set-cookie'])];
                                        }
                                    }
                                    outer_this.logger.apiCallSuccess(res, page_name)
                                    outer_this.junit.successCase(page_name)
                                    if (outer_this.rp) {
                                        outer_this.rp.successCall(res, page_name)
                                    }
                                })
                                .catch((err) => {
                                    outer_this.logger.apiCallFail(err, page_name)
                                    var errorReason = err.statusCode + " response code. Message: " + JSON.stringify(err.error)
                                    outer_this.junit.failCase(page_name, errorReason)
                                    if (outer_this.rp) {
                                        outer_this.rp.failedCall(err, page_name)
                                    }
                                })
                            await utils.sleep(1)
                        }
                        for (let xform in callFormPair) {
                            console.log("\nSend %s Request (%d)", page_name, globalIteration)
                            putOption.form = callFormPair[xform]
                            await requestREST(putOption)
                                .then((res) => {
                                    if (res.headers['set-cookie']) {
                                        if (res.headers['set-cookie'] instanceof Array) {
                                            sesionState = res.headers['set-cookie'].map(toughCookie.Cookie.parse)
                                        }
                                        else {
                                            sesionState = [toughCookie.Cookie.parse(res.headers['set-cookie'])];
                                        }
                                    }
                                    outer_this.logger.apiCallSuccess(res, page_name)
                                    outer_this.junit.successCase(page_name)
                                    if (outer_this.rp) {
                                        outer_this.rp.successCall(res, page_name)
                                    }
                                })
                                .catch((err) => {
                                    outer_this.logger.apiCallFail(err, page_name)
                                    var errorReason = err.statusCode + " response code. Message: " + JSON.stringify(err.error)
                                    outer_this.junit.failCase(page_name, errorReason)
                                    if (outer_this.rp) {
                                        outer_this.rp.failedCall(err, page_name)
                                    }
                                })
                            await utils.sleep(1)
                        }
                        break;
                    case 'DELETE':
                        var callBodyPair = page['body']
                        var callFormPair = page['form']
                        var callParamPair = page['parameters']
                        var deleteHeaders = page['headers'] || { perfui: "carrier-io" }
                        var deleteOption = {
                            method: 'DELETE',
                            headers: deleteHeaders,
                            time: true,
                            resolveWithFullResponse: true
                        }
                        var path = page['path'] || '/'
                        deleteOption.uri = page['url'] + path
                        if (sesionCookie != null || sesionCookie != undefined) {
                            var cookieToAdd = ''
                            for (let cookie in sesionCookie) {
                                var cookieBuilder = sesionCookie[cookie].name + "=" + sesionCookie[cookie].value + ";"
                                cookieToAdd += cookieBuilder
                            }
                            deleteOption.headers.Cookie = cookieToAdd
                        }
                        if (sesionState != null || sesionState != undefined) {
                            deleteOption = outer_this.getSesion(sesionState, page['url'], cookieJar, deleteOption)
                        }
                        if (callParamPair != undefined || callBodyPair != undefined) {
                            for (let parameter in callParamPair) {
                                var parametrUserVar = callParamPair[parameter]

                                for (let value in callParamPair[parameter]) {
                                    if (constRegex.test(callParamPair[parameter][value])) {
                                        var test = constRegex.exec(callParamPair[parameter][value])
                                        var test = test[1]
                                        if (globalUserVariablesStore[test] != null || globalUserVariablesStore[test] != undefined) {
                                            parametrUserVar[value] = globalUserVariablesStore[test]
                                        }
                                        else {
                                            console.error("Cant read user variable " + parametrUserVar[value])
                                        }
                                    }

                                }
                                deleteOption.qs = parametrUserVar
                            }
                        }
                        console.log("\nSend %s Request (%d)", page_name, globalIteration)
                        await requestREST(deleteOption)
                            .then((res) => {
                                if (res.headers['set-cookie']) {
                                    if (res.headers['set-cookie'] instanceof Array) {
                                        sesionState = res.headers['set-cookie'].map(toughCookie.Cookie.parse)
                                    }
                                    else {
                                        sesionState = [toughCookie.Cookie.parse(res.headers['set-cookie'])];
                                    }
                                }
                                outer_this.logger.apiCallSuccess(res, page_name)
                                outer_this.junit.successCase(page_name)
                                if (outer_this.rp) {
                                    outer_this.rp.successCall(res, page_name)
                                }
                            })
                            .catch((err) => {
                                outer_this.logger.apiCallFail(err, page_name)
                                var errorReason = err.statusCode + " response code. Message: " + JSON.stringify(err.error)
                                outer_this.junit.failCase(page_name, errorReason)
                                if (outer_this.rp) {
                                    outer_this.rp.failedCall(err, page_name)
                                }
                            })
                        await utils.sleep(1)
                        break;
                    case 'OPTIONS':
                        var optionHeaders = page['headers'] || { perfui: "carrier-io" }
                        var optionsOption = {
                            method: 'OPTIONS',
                            headers: optionHeaders,
                            json: true,
                            time: true,
                            resolveWithFullResponse: true
                        }
                        var path = page['path'] || '/'
                        optionsOption.uri = page['url'] + path
                        if (sesionCookie != null || sesionCookie != undefined) {
                            var cookieToAdd = ''
                            for (let cookie in sesionCookie) {
                                var cookieBuilder = sesionCookie[cookie].name + "=" + sesionCookie[cookie].value + ";"
                                cookieToAdd += cookieBuilder
                            }
                            optionsOption.headers.Cookie = cookieToAdd
                        }
                        if (sesionState != null || sesionState != undefined) {
                            optionsOption = outer_this.getSesion(sesionState, page['url'], cookieJar, optionsOption)
                        }
                        console.log("\nSend %s Request (%d)", page_name, globalIteration)
                        await requestREST(optionsOption)
                            .then((res) => {
                                if (res.headers['set-cookie']) {
                                    if (res.headers['set-cookie'] instanceof Array) {
                                        sesionState = res.headers['set-cookie'].map(toughCookie.Cookie.parse)
                                    }
                                    else {
                                        sesionState = [toughCookie.Cookie.parse(res.headers['set-cookie'])];
                                    }
                                }
                                outer_this.logger.apiCallSuccess(res, page_name)
                                outer_this.junit.successCase(page_name)
                                if (outer_this.rp) {
                                    outer_this.rp.successCall(res, page_name)
                                }
                            })
                            .catch((err) => {
                                outer_this.logger.apiCallFail(err, page_name)
                                var errorReason = err.statusCode + " response code. Message: " + JSON.stringify(err.error)
                                outer_this.junit.failCase(page_name, errorReason)
                                if (outer_this.rp) {
                                    outer_this.rp.failedCall(err, page_name)
                                }
                            })
                        await utils.sleep(1)
                        break;
                    default:
                        break;
                }
                await utils.sleep(1)
            }
            else {

                if (page['url'] != null || page['url'] != undefined) {
                    baseUrl = page['url']
                }
                if (page['check'] != null || page['check']) {
                    pageCheck = page['check']
                } else {
                    pageCheck = null;
                }
                if (page[testSteps] != null || page[testSteps] != undefined) {
                    for (i = 0; i < page[testSteps].length; i++) {
                        if (page[testSteps][i][testUrl]) {
                            var url = page[testSteps][i][testUrl]
                            stepList[i] = [testUrl, url]
                        }
                        if (page[testSteps][i][testInput]) {
                            var inputStep = page[testSteps][i][testInput]
                            if (inputStep[locatorXpath]) {
                                stepList[i] = [testInput, locatorXpath, inputStep[locatorXpath], inputStep[inputValue]]
                            }
                            if (inputStep[locatorCss]) {
                                stepList[i] = [testInput, locatorCss, inputStep[locatorCss], inputStep[inputValue]]
                            }
                        }
                        if (page[testSteps][i][testCheckNotPresent]) {
                            var inputStep = page[testSteps][i][testCheckNotPresent]
                            if (inputStep[locatorXpath]) {
                                stepList[i] = [testCheckNotPresent, locatorXpath, inputStep[locatorXpath]]
                            }
                            if (inputStep[locatorCss]) {
                                stepList[i] = [testCheckNotPresent, locatorCss, inputStep[locatorCss]]
                            }
                        }
                        if (page[testSteps][i][testClick]) {
                            stepClick = page[testSteps][i][testClick]
                            if (stepClick[locatorXpath]) {
                                stepList[i] = [testClick, locatorXpath, stepClick[locatorXpath]]
                            }
                            if (stepClick[locatorCss]) {
                                stepList[i] = [testClick, locatorCss, stepClick[locatorCss]]
                            }
                        }
                        if (page[testSteps][i][testCheck]) {
                            stepCheck = page[testSteps][i][testCheck]
                            if (stepCheck[locatorXpath]) {
                                stepList[i] = [testCheck, locatorXpath, stepCheck[locatorXpath]]
                            }
                            if (stepCheck[locatorCss]) {
                                stepList[i] = [testCheck, locatorCss, stepCheck[locatorCss]]
                            }
                        }
                        if (page[testSteps][i][switchToFrame]) {
                            stepSwitch = page[testSteps][i][switchToFrame]
                            if (stepSwitch[locatorId]) {
                                stepList[i] = [switchToFrame, locatorId, stepSwitch[locatorId]]
                            }
                            if (stepSwitch[locatorXpath]) {
                                stepList[i] = [switchToFrame, locatorXpath, stepSwitch[locatorXpath]]
                            }
                            if (stepSwitch[locatorCss]) {
                                stepList[i] = [switchToFrame, locatorCss, stepSwitch[locatorCss]]
                            }
                        }
                        if (page[testSteps][i][switchToDefault]) {
                            stepSwitch = page[testSteps][i][switchToDefault]
                            stepList[i] = [switchToDefault, true]
                        }
                    }
                }
                if (driver == undefined || driver == null) {

                    driver = new Builder().withCapabilities(capabilities)
                        .setAlertBehavior('accept')
                        .forBrowser('chrome').build();
                    await driver.get("chrome://version");
                    let element = await driver.findElement(By.id('command_line'));
                    let text = await element.getText();
                    var splitStr = text.split(" ");
                    let port = 0
                    splitStr.filter(function (word, index) {
                        if (word.match(/--remote-debugging-port=*/)) {
                            port = Number(word.split('=')[1]);
                            lighthouse_opts.port = port;
                            lighthouse_opts_mobile.port = port;
                        } else { }
                    });
                    waiter = new Waiter(driver)
                }

                if (parameters != null || parameters != undefined) {
                    if (parameters.length > 1) {
                        var paramIterator = 1
                        for (let parameter of parameters) {
                            pageUrlWithParameters = baseUrl + parameter
                            pageNameWithParameter = page_name + "_" + paramIterator
                            await outer_this.TestStepsExecute(driver, pageNameWithParameter, pageUrlWithParameters, parameter, pageCheck, stepList, waiter, globalIteration, scenarioIter, additionalUrl)
                            paramIterator += 1
                        }

                    } else {
                        var pageUrlWithParameters = baseUrl + parameters
                        await outer_this.TestStepsExecute(driver, page_name, pageUrlWithParameters, parameters, pageCheck, stepList, waiter, globalIteration, scenarioIter, additionalUrl)
                    }
                }
                else {
                    await outer_this.TestStepsExecute(driver, page_name, baseUrl, parameters, pageCheck, stepList, waiter, globalIteration, scenarioIter, additionalUrl)
                }
                await utils.sleep(3)
                scenarioIter += 1
                additionalUrl = baseUrl
                globalUserVariablesStore = {}
            }
        }
    } catch (error) {
        console.log(error)
        outer_this.junit.errorCase(error)
    } finally {
        if (globalIteration == (times)) {
            if (outer_this.rp) {
                await outer_this.rp.finishTestLaunch()
            }
            outer_this.junit.writeXml()
            utils.sleep(5)
            console.info("Congrats, test is done.")
        }
        if (driver) {
            driver.quit();
        }
    }
}

module.exports = ScenarioBuilder