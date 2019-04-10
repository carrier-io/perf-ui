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

const testSteps = 'steps'

var Waiter = require("./waiters")
var Lighthouse = require('./lighthouse')
var Logger = require('./logger')
var utils = require('./utils')
var WebDriverActionWrapper = require('./execution_module/action_wrapper')
var PageStepsBuilder = require('./execution_module/page_steps_builder')

var JUnitBuilder = require('./junit_reporter')
var lightHouseArr
var triggerForInfluxConfig

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
    var locator;
    var actionStep;

    if (scenarioIter == 0 || targetUrl != baseUrl) {
        await driver.get(baseUrl)
    }
    for (let step in stepList) {
        actionStep = stepList[step]
        locator = await WebDriverActionWrapper.GetWebElementLocator(actionStep)
        switch (actionStep[0]) {
            case 'input':
                await WebDriverActionWrapper.ExecuteInput(driver, locator, actionStep[3])
                break;
            case 'check':
                await WebDriverActionWrapper.ExecuteCheckIsPresent(waiter, locator)
                break;
            case 'checkIsNot':
                await WebDriverActionWrapper.ExecuteCheckIsNotPresent(waiter, locator)
                break;
            case 'click':
                await WebDriverActionWrapper.ExecuteClick(driver, locator)
                break;
            case 'switchToFrame':
                await WebDriverActionWrapper.ExecuteSwitchToFrame(driver, locator)
                break;
            case 'switchToDefault':
                await WebDriverActionWrapper.ExecuteSwitchToDefaultContent(driver)
                break;
            case 'url':
                await WebDriverActionWrapper.ExecuteNavigateToUrl(driver, actionStep[1])
                break;
            default:
                break;
        }
    }
    if (pageCheck != null || pageCheck != undefined) {
        locator = await WebDriverActionWrapper.GetWebElementLocator(pageCheck)
        await WebDriverActionWrapper.ExecuteCheckIsPresent(waiter, locator)
    }
    sesionCookie = await WebDriverActionWrapper.GetSessionCookie(driver);
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

ScenarioBuilder.prototype.getSession = function (sessionState, url, cookieJar, reqOptions) {
    if (sessionState.length > 1) {
        for (let cookie in sessionState) {
            cookieJar.setCookie(sessionState[cookie], url)
        }
    }
    else {
        cookieJar.setCookie(sessionState, url)
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

    try {
        console.log(`\n${test_name} test, iteration ${globalIteration}`)
        for (let page_name in scenario) {

            var stepList = []
            var page = scenario[page_name]
            var pageSteps = page[testSteps]
            var parameters = page['parameters']
            var pageUrlWithParameters
            var pageCheck
            
            if (page['url'] != null || page['url'] != undefined) {
                baseUrl = page['url']
            }
            if (page['check'] != null || page['check']) {
                pageCheck = page['check']
            } else {
                pageCheck = null;
            }
            stepList = PageStepsBuilder.StepListForExecution(pageSteps)
            
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
                    pageUrlWithParameters = baseUrl + parameters
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