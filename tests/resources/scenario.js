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

const { By,
    Builder
} = require('selenium-webdriver')

require('chromedriver');

var Waiter = require("./waiters")
var Lighthouse = require('./lighthouse')
var Logger = require('./logger')
var utils = require('./utils')
var WebDriverActionWrapper = require('./execution_module/action_wrapper')
var PageStepsBuilder = require('./execution_module/page_steps_builder')

var JUnitBuilder = require('./junit_reporter')
var lightHouseArr
var driver
var baseUrl
var scenarioIter

function ScenarioBuilder(test_name, influxConfig, reportPortalConfig, lightHouseDevice, suite) {
    this.testName = test_name.replace(/\.y.?ml/g, '')
    this.logger = new Logger(influxConfig, this.testName, suite)
    if (reportPortalConfig) {
        this.rp = reportPortalConfig
    }
    this.junit = new JUnitBuilder(this.testName)

    this.lighthouse = new Lighthouse()
    lightHouseArr = lightHouseDevice
}

ScenarioBuilder.prototype.InitDriver = async function () {
    var outer_this = this
    outer_this.driver = new Builder().withCapabilities(browserCapabilities)
        .setAlertBehavior('accept')
        .forBrowser('chrome').build();
    outer_this.waiter = new Waiter(this.driver)
    await outer_this.driver.get("chrome://version");
    let element = await outer_this.driver.findElement(By.id('command_line'));
    let text = await element.getText();
    var splitStr = text.split(" ");
    let port = 0
    splitStr.filter(function (word, index) {
        if (word.match(/--remote-debugging-port=*/)) {
            port = Number(word.split('=')[1]);
            lighthouseOptionsDesktop.port = port;
            lighthouseOptionsMobile.port = port;
        } else { }
    });
}

var lighthouseOptionsDesktop = {
    chromeFlags: ['--show-paint-rects', '--window-size=1440,900'],
    "disableDeviceEmulation": true
}
var lighthouseOptionsMobile = {
    chromeFlags: ['--show-paint-rects', '--window-size=1440,900']
}
const browserCapabilities = {
    "browserName": 'chrome',
    "chromeOptions": {
        "args": ["--window-size=1440,900", "--disable-dev-shm-usage", "--no-sandbox"],
        "extensions": []
    }
}

ScenarioBuilder.prototype.TestStepsExecute = async function (page_name, urlWithParameter, parameters, page, stepList, iteration) {
    var page_name = page_name.replace(/[^a-zA-Z0-9_]+/g, '_')
    var lh_name = `${page_name}_lh_${iteration}`
    var outer_this = this;
    if (urlWithParameter) {
        var baseUrl = urlWithParameter
    } else {
        var baseUrl = outer_this.baseUrl
    }
    var pageCheck
    if (page['check'] != undefined || page['check'] != null) {
        pageCheck = page['check']
    } else {
        pageCheck = null
    }
    await outer_this.driver.sleep(200)
        .then(() => { console.log("\nOpening %s TestCase (%d)", page_name, iteration) })
        .then(() => outer_this.ExecuteTest(baseUrl, pageCheck, stepList))
        .catch((error) => { return error })
        .then((error) => outer_this.ResultReport(page_name, baseUrl, parameters, lh_name, error))
}

/// Method which executing list of steps
ScenarioBuilder.prototype.ExecuteTest = async function (baseUrl, pageCheck, stepList) {
    var locator;
    var actionStep;
    var outer_this = this
    var previousUrl = outer_this.previousUrl

    if (scenarioIter == 1 || previousUrl != baseUrl) {
        await outer_this.driver.get(baseUrl)
    }
    for (let step in stepList) {
        actionStep = stepList[step]
        locator = await WebDriverActionWrapper.GetWebElementLocator(actionStep)
        switch (actionStep[0]) {
            case 'input':
                await WebDriverActionWrapper.ExecuteInput(outer_this.driver, locator, actionStep[3])
                break;
            case 'check':
                await WebDriverActionWrapper.ExecuteCheckIsPresent(outer_this.waiter, locator)
                break;
            case 'checkIsNot':
                await WebDriverActionWrapper.ExecuteCheckIsNotPresent(outer_this.waiter, locator)
                break;
            case 'click':
                await WebDriverActionWrapper.ExecuteClick(outer_this.driver, locator)
                break;
            case 'switchToFrame':
                await WebDriverActionWrapper.ExecuteSwitchToFrame(outer_this.driver, locator)
                break;
            case 'switchToDefault':
                await WebDriverActionWrapper.ExecuteSwitchToDefaultContent(outer_this.driver)
                break;
            case 'url':
                await WebDriverActionWrapper.ExecuteNavigateToUrl(outer_this.driver, actionStep[1])
                break;
            default:
                break;
        }
    }
    if (pageCheck != null || pageCheck != undefined) {
        locator = await WebDriverActionWrapper.GetWebElementLocator(pageCheck)
        await WebDriverActionWrapper.ExecuteCheckIsPresent(outer_this.waiter, locator)
    }
}

ScenarioBuilder.prototype.ResultReport = async function (pageName, pageUrl, parameter, lh_name, error) {
    var outer_this = this;
    var isAction
    var status

    if (error) {
        console.log(`Test Case ${pageName} failed.`)
        await outer_this.junit.failCase(pageName, error)
        if (!outer_this.rp) {
            await utils.takeScreenshot(outer_this.driver, `${pageName}_Failed`)
        }
        if (outer_this.logger) {
            status = 'ko'
            await outer_this.logger.logError(error, pageUrl, pageName, parameter)
            isAction = await outer_this.logger.logInfo(outer_this.driver, pageName, status)
        }
        if (!isAction && (lightHouseArr != undefined || lightHouseArr != null)) {
            try {
                await outer_this.lighthouse.startAnalyse(lh_name, lightHouseArr, lighthouseOptionsDesktop, lighthouseOptionsMobile, outer_this.driver, outer_this.testName)
            }
            catch (error) {
                console.log(error.friendlyMessage)
            }
        }
        if (outer_this.rp) {
            if (isAction){
                await outer_this.rp.reportIssue(error, pageUrl, parameter, pageName, outer_this.driver, null, lh_name)
            }else {
                await outer_this.rp.reportIssue(error, pageUrl, parameter, pageName, outer_this.driver, lightHouseArr, lh_name)
            }
            
        }
    }
    else {
        console.log(`Starting Analyse ${pageName}.`)
        await outer_this.junit.successCase(pageName)
        if (!outer_this.rp) {
            await utils.takeScreenshot(outer_this.driver, pageName)
        }
        if (outer_this.logger) {
            status = 'ok'
            isAction = await outer_this.logger.logInfo(outer_this.driver, pageName, status)
            await outer_this.driver.executeScript('performance.clearResourceTimings()');
        }
        if (!isAction && (lightHouseArr != undefined || lightHouseArr != null)) {
            try {
                await outer_this.lighthouse.startAnalyse(lh_name, lightHouseArr, lighthouseOptionsDesktop, lighthouseOptionsMobile, outer_this.driver, outer_this.testName)
            }
            catch (error) {
                console.log(error.friendlyMessage)
            }
        }
        if (outer_this.rp) {
            if (isAction){
                await outer_this.rp.reportResult(pageName, pageUrl, parameter, outer_this.driver, null, lh_name)
            }else {
                await outer_this.rp.reportResult(pageName, pageUrl, parameter, outer_this.driver, lightHouseArr, lh_name)
            }       
        }
    }
}

ScenarioBuilder.prototype.scn = async function (scenario, globalIteration, times) {
    var outer_this = this;
    var test_name = outer_this.testName

    outer_this.InitDriver()
    try {
        console.log(`\n${test_name} test, iteration ${globalIteration}`)
        outer_this.scenarioIter = 1
        for (let page_name in scenario) {

            var stepList = []
            var page = scenario[page_name]
            var parameters = page['parameters']

            if (page['url'] != null || page['url'] != undefined) {
                outer_this.baseUrl = page['url']
            }
            stepList = PageStepsBuilder.StepListForExecution(page['steps'])

            if (parameters != null || parameters != undefined) {

                if (parameters.length > 1) {
                    var paramIterator = 1
                    for (let parameter of parameters) {
                        var urlWithParameter = outer_this.baseUrl + parameter
                        pageNameWithParameter = page_name + "_" + paramIterator
                        await outer_this.TestStepsExecute(pageNameWithParameter, urlWithParameter, parameter, page, stepList, globalIteration)
                        paramIterator += 1
                        outer_this.scenarioIter += 1
                        outer_this.previousUrl = outer_this.baseUrl
                    }
                } else {
                    var urlWithParameter = outer_this.baseUrl + parameters
                    await outer_this.TestStepsExecute(page_name, urlWithParameter, parameters, page, stepList, globalIteration)
                    outer_this.scenarioIter += 1
                    outer_this.previousUrl = outer_this.baseUrl
                }
            }
            else {
                await outer_this.TestStepsExecute(page_name, null, parameters, page, stepList, globalIteration)
                outer_this.scenarioIter += 1
                outer_this.previousUrl = outer_this.baseUrl
            }
            await utils.sleep(3)
        }
    } catch (error) {
        console.log(error.message)
        outer_this.junit.errorCase(error)
    } finally {
        if (globalIteration == (times)) {
            if (outer_this.rp) {
                await outer_this.rp.finishTestLaunch()
            }
            outer_this.junit.writeXml()
            utils.sleep(5)
            console.info("\nCongrats, test is done.")
        }
        if (outer_this.driver) {
            outer_this.driver.quit();
        }
    }
}

module.exports = ScenarioBuilder