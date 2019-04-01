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
var JUnitBuilder = require('./junit_reporter')
var request = require('request-promise').defaults({ jar: true });
var tough = require('tough-cookie');
var lightHouseArr
var trigger
var sesionCookie
var sesionState
var user_variables

function ScenarioBuilder(test_name, influx_conf, rp, lightHouseDevice, suite, user_vars) {
    this.testName = test_name.replace(/\.y.?ml/g, '')
    if (influx_conf && influx_conf['url'] != null) {
        trigger = true;
    }
    else {
        trigger = false;
    }
    this.logger = new Logger(influx_conf, this.testName, trigger, suite)
    if (rp) {
        this.rp = rp
    }
    this.junit = new JUnitBuilder(this.testName)

    this.lighthouse = new Lighthouse()
    lightHouseArr = lightHouseDevice
    user_variables = user_vars || {}
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

ScenarioBuilder.prototype.testStep_v1 = async function (driver, page_name, baseUrl, parameters, pageCheck, stepList, waiter, iteration, scenarioIter, targetUrl) {
    var page_name = page_name.replace(/[^a-zA-Z0-9_]+/g, '_')
    var lh_name = `${page_name}_lh_${iteration}`
    var status = 'ok';
    var outer_this = this;
    await driver.sleep(200)
        .then(() => { console.log("\nOpening %s TestCase (%d)", page_name, iteration) })
        .then(() => outer_this.execList(driver, scenarioIter, baseUrl, pageCheck, stepList, waiter, targetUrl))
        .catch((error) => outer_this.errorHandler(driver, page_name, error, baseUrl, parameters, lh_name, status))
        .then((status) => outer_this.analyseAndReportResult(driver, page_name, baseUrl, parameters, lh_name, status))
}

ScenarioBuilder.prototype.execList = async function (driver, scenarioIter, baseUrl, pageCheck, stepList, waiter, targetUrl) {

    var outer_this = this;
    var locator;
    var actionStep;

    if (scenarioIter == 0 || targetUrl != baseUrl) {
        await driver.get(baseUrl)
    }

    for (let step in stepList) {
        actionStep = stepList[step]
        if (actionStep == undefined || actionStep == null) {
            continue;
        }
        if (actionStep[0] == 'input') {
            if (actionStep[1] == 'xpath') {
                locator = By.xpath(actionStep[2])
            }
            else {
                locator = By.css(actionStep[2])
            }
            value = actionStep[3]
            await driver.findElement(locator).clear()
            await driver.findElement(locator).sendKeys(value)
        }
        if (actionStep[0] == 'check') {
            if (actionStep[1] == 'xpath') {
                locator = By.xpath(actionStep[2])
            }
            else {
                locator = By.css(actionStep[2])
            }
            await waiter.waitFor(locator).then((element) => waiter.waitUntilVisible(element))
        }
        if (actionStep[0] == 'checkIsNot') {
            if (actionStep[1] == 'xpath') {
                locator = By.xpath(actionStep[2])
            }
            else {
                locator = By.css(actionStep[2])
            }
            await waiter.waitFor(locator).then((element) => waiter.waitUntilNotVisible(element))
        }
        if (actionStep[0] == 'click') {
            if (actionStep[1] == 'xpath') {
                locator = By.xpath(actionStep[2])
            }
            else {
                locator = By.css(actionStep[2])
            }
            await driver.findElement(locator).click()
        }
        if (actionStep[0] == 'switchToFrame') {
            if (actionStep[1] == 'id') {
                locator = stepList[0][2]
            }
            if (actionStep[1] == 'xpath') {
                locator = driver.findElement(By.xpath(stepList[i][2]))
            }
            if (actionStep[1] == 'css') {
                locator = driver.findElement(By.css(stepList[i][2]))
            }
            await driver.switchTo().frame(locator)
        }
        if (actionStep[0] == 'switchToDefault') {
            if (sactionStep[1]) {
                await driver.switchTo().defaultContent()
            }
        }
        if (actionStep[0] == 'url') {
            await driver.get(actionStep[1])
            await driver.sleep(1000)
        }
    }
    if (pageCheck != null || pageCheck != undefined) {
        if (pageCheck['xpath'] != null || pageCheck['xpath'] != undefined) {
            locator = By.xpath(pageCheck['xpath'])
        } else {
            locator = By.css(pageCheck['css'])
        }
        await waiter.waitFor(locator).then((element) => waiter.waitUntilVisible(element))
    }
    sesionCookie = await driver.manage().getCookies();
    await driver.sleep(2000)
}

ScenarioBuilder.prototype.errorHandler = async function (driver, page_name, error, pageUrl, param, lh_name, status) {
    console.log(`Test Case ${page_name} failed.`)
    status = 'ko';
    var outer_this = this;

    if (!outer_this.logger && !outer_this.rp) {
        await utils.takeScreenshot(driver, `${page_name}_Failed`)
    }
    if (outer_this.logger) {
        await outer_this.logger.logError(error, pageUrl, page_name, param)
    }
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
    if (outer_this.rp) {
        await outer_this.rp.reportIssue(error, pageUrl, param, page_name, driver, lh_name_mobile, lh_name_desktop)
    }
    await outer_this.junit.failCase(page_name, error)

    return status
}
ScenarioBuilder.prototype.analyseAndReportResult = async function (driver, page_name, pageUrl, param, lh_name, status) {
    var outer_this = this;

    console.log(`Starting Analyse ${page_name}.`)
    if (status == null || status == undefined) {
        status = 'ok'
    }
    if (!outer_this.logger && !outer_this.rp && status != 'ko') {
        await utils.takeScreenshot(driver, page_name)
    }

    var isAction = await outer_this.logger.logInfo(driver, page_name, status)
    await driver.executeScript('performance.clearResourceTimings()');
    if (status != 'ko' && !isAction) {
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
        outer_this.junit.successCase(page_name)
    }
    if (outer_this.rp && status != 'ko') {
        await outer_this.rp.reportResult(page_name, pageUrl, param, driver, lh_name_mobile, lh_name_desktop)
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

ScenarioBuilder.prototype.scn = async function (scenario, iteration, times) {

    var outer_this = this;

    var driver
    var waiter

    var test_name = outer_this.testName
    var scenarioIter = 0;
    var baseUrl
    var targetUrl
    var cookieJar = request.jar();
    var constRegex = /[$]{(.*.)}/

    try {
        console.log(`\n${test_name} test, iteration ${iteration}`)
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
                                console.log("\nSend %s Request (%d)", page_name, iteration)
                                var parametrUserVar = callParamPair[parameter]

                                for (let value in callParamPair[parameter]) {
                                    if (constRegex.test(callParamPair[parameter][value])) {
                                        var test = constRegex.exec(callParamPair[parameter][value])
                                        var test = test[1]
                                        if (user_variables[test] != null || user_variables[test] != undefined) {
                                            parametrUserVar[value] = user_variables[test]
                                            
                                        }
                                        else{
                                            console.error("Cant read user variable " + parametrUserVar[value])
                                        }
                                    }

                                }
                                getOption.qs = parametrUserVar
                                await request(getOption)
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
                                                    user_variables[tempUserVar] = grabValue
                                                }
                                                if (postActions[action]['jsonPath']) {
                                                    var jsonPathValue = postActions[action]['jsonPath']
                                                    var tempUserVar = postActions[action]['saveAs']
                                                    var grabValue = JSONPATH.value(temp, jsonPathValue)
                                                    user_variables[tempUserVar] = grabValue
                                                }
                                                if (postActions[action]['regEx']) {
                                                    var regexValue = postActions[action]['regEx']
                                                    var tempUserVar = postActions[action]['saveAs']
                                                    try{
                                                        var grabValue = JSON.stringify(temp).match(regexValue)
                                                    }
                                                    catch(err){
                                                        var grabValue = temp.toString().match(regexValue)
                                                    }
                                                    if (grabValue != null || grabValue != undefined){
                                                        user_variables[tempUserVar] = grabValue[1]
                                                    }
                                                    else{
                                                        user_variables[tempUserVar] = undefined
                                                    }
                                                }
                                            }
                                        }
                                        if (res.headers['set-cookie']) {
                                            if (res.headers['set-cookie'] instanceof Array) {
                                                sesionState = res.headers['set-cookie'].map(tough.Cookie.parse)
                                            }
                                            else {
                                                sesionState = [tough.Cookie.parse(res.headers['set-cookie'])];
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
                                console.log("\nSend %s Request (%d)", page_name, iteration)
                                getOption.headers.body = callBodyPair[reqbody]
                                await request(getOption)
                                    .then((res) => {
                                        if (res.headers['set-cookie']) {
                                            if (res.headers['set-cookie'] instanceof Array) {
                                                sesionState = res.headers['set-cookie'].map(tough.Cookie.parse)
                                            }
                                            else {
                                                sesionState = [tough.Cookie.parse(res.headers['set-cookie'])];
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
                            console.log("\nSend %s Request (%d)", page_name, iteration)
                            await request(getOption)
                                .then((res) => {
                                    if (res.headers['set-cookie']) {
                                        if (res.headers['set-cookie'] instanceof Array) {
                                            sesionState = res.headers['set-cookie'].map(tough.Cookie.parse)
                                        }
                                        else {
                                            sesionState = [tough.Cookie.parse(res.headers['set-cookie'])];
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
                                        if (user_variables[test] != null || user_variables[test] != undefined) {
                                            parametrUserVar[value] = user_variables[test]
                                        }
                                        else{
                                            console.error("Cant read user variable " + parametrUserVar[value])
                                        }
                                    }

                                }
                                postOption.qs = parametrUserVar
                            }
                        }
                        for (let reqbody in callBodyPair) {
                            console.log("\nSend %s Request (%d)", page_name, iteration)
                            postOption.body = callBodyPair[reqbody]
                            await request(postOption)
                                .then((res) => {
                                    var temp = res.body
                                    if (postActions) {
                                        for (let action in postActions) {
                                            if (postActions[action]['jsonValue']) {
                                                var jsonValue = postActions[action]['jsonValue']
                                                var tempUserVar = postActions[action]['saveAs']
                                                var grabValue = temp[jsonValue]
                                                user_variables[tempUserVar] = grabValue
                                            }
                                            if (postActions[action]['jsonPath']) {
                                                var jsonPathValue = postActions[action]['jsonPath']
                                                var tempUserVar = postActions[action]['saveAs']
                                                var grabValue = JSONPATH.value(temp, jsonPathValue)
                                                user_variables[tempUserVar] = grabValue
                                            }
                                            if (postActions[action]['regEx']) {
                                                var regexValue = postActions[action]['regEx']
                                                var tempUserVar = postActions[action]['saveAs']
                                                try{
                                                    var grabValue = JSON.stringify(temp).match(regexValue)
                                                }
                                                catch(err){
                                                    var grabValue = temp.toString().match(regexValue)
                                                }
                                                if (grabValue != null || grabValue != undefined){
                                                    user_variables[tempUserVar] = grabValue[1]
                                                }
                                                else{
                                                    user_variables[tempUserVar] = undefined
                                                }
                                            }
                                        }
                                    }
                                    if (res.headers['set-cookie']) {
                                        if (res.headers['set-cookie'] instanceof Array) {
                                            sesionState = res.headers['set-cookie'].map(tough.Cookie.parse)
                                        }
                                        else {
                                            sesionState = [tough.Cookie.parse(res.headers['set-cookie'])];
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
                            console.log("\nSend %s Request (%d)", page_name, iteration)
                            postOption.form = callFormPair[xform]
                            await request(postOption)
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
                                        if (user_variables[test] != null || user_variables[test] != undefined) {
                                            parametrUserVar[value] = user_variables[test]
                                        }
                                        else{
                                            console.error("Cant read user variable " + parametrUserVar[value])
                                        }
                                    }

                                }
                                putOption.qs = parametrUserVar
                            }
                        }
                        for (let reqbody in callBodyPair) {
                            console.log("\nSend %s Request (%d)", page_name, iteration)
                            putOption.body = callBodyPair[reqbody]
                            await request(putOption)
                                .then((res) => {
                                    var temp = res.body
                                    if (postActions) {
                                        for (let action in postActions) {
                                            if (postActions[action]['jsonValue']) {
                                                var jsonValue = postActions[action]['jsonValue']
                                                var tempUserVar = postActions[action]['saveAs']
                                                var grabValue = temp[jsonValue]
                                                user_variables[tempUserVar] = grabValue
                                            }
                                            if (postActions[action]['jsonPath']) {
                                                var jsonPathValue = postActions[action]['jsonPath']
                                                var tempUserVar = postActions[action]['saveAs']
                                                var grabValue = JSONPATH.value(temp, jsonPathValue)
                                                user_variables[tempUserVar] = grabValue
                                            }
                                            if (postActions[action]['regEx']) {
                                                var regexValue = postActions[action]['regEx']
                                                var tempUserVar = postActions[action]['saveAs']
                                                try{
                                                    var grabValue = JSON.stringify(temp).match(regexValue)
                                                }
                                                catch(err){
                                                    var grabValue = temp.toString().match(regexValue)
                                                }
                                                if (grabValue != null || grabValue != undefined){
                                                    user_variables[tempUserVar] = grabValue[1]
                                                }
                                                else{
                                                    user_variables[tempUserVar] = undefined
                                                }
                                            }
                                        }
                                    }
                                    if (res.headers['set-cookie']) {
                                        if (res.headers['set-cookie'] instanceof Array) {
                                            sesionState = res.headers['set-cookie'].map(tough.Cookie.parse)
                                        }
                                        else {
                                            sesionState = [tough.Cookie.parse(res.headers['set-cookie'])];
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
                            console.log("\nSend %s Request (%d)", page_name, iteration)
                            putOption.form = callFormPair[xform]
                            await request(putOption)
                                .then((res) => {
                                    if (res.headers['set-cookie']) {
                                        if (res.headers['set-cookie'] instanceof Array) {
                                            sesionState = res.headers['set-cookie'].map(tough.Cookie.parse)
                                        }
                                        else {
                                            sesionState = [tough.Cookie.parse(res.headers['set-cookie'])];
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
                                        if (user_variables[test] != null || user_variables[test] != undefined) {
                                            parametrUserVar[value] = user_variables[test]
                                        }
                                        else{
                                            console.error("Cant read user variable " + parametrUserVar[value])
                                        }
                                    }

                                }
                                deleteOption.qs = parametrUserVar
                            }
                        }
                        console.log("\nSend %s Request (%d)", page_name, iteration)
                        await request(deleteOption)
                            .then((res) => {
                                if (res.headers['set-cookie']) {
                                    if (res.headers['set-cookie'] instanceof Array) {
                                        sesionState = res.headers['set-cookie'].map(tough.Cookie.parse)
                                    }
                                    else {
                                        sesionState = [tough.Cookie.parse(res.headers['set-cookie'])];
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
                        console.log("\nSend %s Request (%d)", page_name, iteration)
                        await request(optionsOption)
                            .then((res) => {
                                if (res.headers['set-cookie']) {
                                    if (res.headers['set-cookie'] instanceof Array) {
                                        sesionState = res.headers['set-cookie'].map(tough.Cookie.parse)
                                    }
                                    else {
                                        sesionState = [tough.Cookie.parse(res.headers['set-cookie'])];
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
                            await outer_this.testStep_v1(driver, pageNameWithParameter, pageUrlWithParameters, parameter, pageCheck, stepList, waiter, iteration, scenarioIter, targetUrl)
                            paramIterator += 1
                        }

                    } else {
                        var pageUrlWithParameters = baseUrl + parameters
                        await outer_this.testStep_v1(driver, page_name, pageUrlWithParameters, parameters, pageCheck, stepList, waiter, iteration, scenarioIter, targetUrl)
                    }
                }
                else {
                    await outer_this.testStep_v1(driver, page_name, baseUrl, parameters, pageCheck, stepList, waiter, iteration, scenarioIter, targetUrl)
                }
                await utils.sleep(3)
                scenarioIter += 1
                targetUrl = baseUrl
                user_variables = {}
            }
        }
    } catch (error) {
        console.log(error)
        outer_this.junit.errorCase(error)
    } finally {
        if (iteration == (times)) {
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