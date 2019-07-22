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

const { Builder} = require('selenium-webdriver')
require('chromedriver');

var util = require('util')
var Executor = util.promisify(require('child_process').exec)
var Waiter = require("./waiters")
var Lighthouse = require('./lighthouse')
var Logger = require('./logger')
var utils = require('./utils')
var WebDriverActionWrapper = require('./execution_module/action_wrapper')
var PageStepsBuilder = require('./execution_module/page_steps_builder')
var reporter
var extractFrames = require('ffmpeg-extract-frames')

var JUnitBuilder = require('./junit_reporter')
var lightHouseArr
var driver
var baseUrl
var scenarioIter
var consoleLogger
var UserFeeders

var recordScreen = require('record-screen')

function ScenarioBuilder(test_name, influxConfig, reportPortalConfig, lightHouseDevice, suite, consoleLogger, UserFeeders) {
    try {
        this.testName = test_name.replace(/\.y.?ml/g, '')
    } catch (e) {}
    this.consoleLogger = consoleLogger
    this.lighthouse = new Lighthouse(consoleLogger)
    this.logger = new Logger(influxConfig, this.testName, suite, consoleLogger)
    if (reportPortalConfig) {
        this.rp = reportPortalConfig
    }
    this.junit = new JUnitBuilder(this.testName)
    this.lightHouseArr = lightHouseDevice
    this.UserFeeders = UserFeeders
    this.reporter = require('./report_module/page_audit')
}

ScenarioBuilder.prototype.InitDriver = async function () {
    var outer_this = this
    outer_this.driver = new Builder().withCapabilities(browserCapabilities)
        .setAlertBehavior('accept')
        .forBrowser('chrome').build();
    outer_this.waiter = new Waiter(this.driver)
}

var lighthouseOptionsDesktop = {
    chromeFlags: ['--show-paint-rects', '--window-size=1440,900'],
    "emulatedFormFactor": "none",
    "output":"html"
}
var lighthouseOptionsMobile = {
    chromeFlags: ['--show-paint-rects', '--window-size=1440,900'],
    "output":"html"
}
const browserCapabilities = {
    "browserName": 'chrome',
    "chromeOptions": {
        "args": ["--window-size=1440,900", "--disable-dev-shm-usage", "--no-sandbox", "--remote-debugging-port=9222"],
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
        .then(() => {
            outer_this.consoleLogger.info("Opening " + page_name + " TestCase (" + iteration + ")")
        })
        .then(() => outer_this.ExecuteTest(baseUrl, pageCheck, stepList, page_name))
        .catch((error) => {
            return error
        })
        .then((error) => outer_this.ResultReport(page_name, baseUrl, parameters, lh_name, error))
}

ScenarioBuilder.prototype.ExecuteTest = async function (baseUrl, pageCheck, stepList, page_name) {
    var locator;
    var actionStep;
    var outer_this = this
    var previousUrl = outer_this.previousUrl
    var videoPath = '/tmp/reports/' + page_name + '.mp4'

    var startMark = new Date().getTime()
    try {
        this.video = recordScreen(videoPath, {
            resolution: '1440x900',
            fps: 25,
            display: 20
        })
        this.video.promise.catch(error => {
            console.error(error)
        })

        if (scenarioIter == 1 || previousUrl != baseUrl || outer_this.driver) {
            outer_this.consoleLogger.debug("Open " + baseUrl)
            await outer_this.driver.get(baseUrl)
        }
        for (let step in stepList) {
            actionStep = stepList[step]
            locator = await WebDriverActionWrapper.GetWebElementLocator(actionStep)
            outer_this.consoleLogger.debug("Execute " + actionStep[0] + " " + locator + " step")
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
                case 'executeJS':
                    await WebDriverActionWrapper.ExecuteJS(outer_this.driver, actionStep[3])
                default:
                    break;
            }
        }
        if (pageCheck != null || pageCheck != undefined) {
            locator = await WebDriverActionWrapper.GetWebElementLocator(pageCheck)
            outer_this.consoleLogger.debug("Execute check step")
            await WebDriverActionWrapper.ExecuteCheckIsPresent(outer_this.waiter, locator)
        }
        var pageState
        do {
            pageState = await outer_this.driver.executeScript("return document.readyState").then((state) => {
                return state
            })
            if (pageState == "loading") {
                await utils.sleep(1)
            }
            outer_this.consoleLogger.debug("Page state is " + pageState)
        }
        while (pageState == "complite")
        
    } catch (err) {
        throw err
    } finally {
        var endMark = new Date().getTime()
        await this.video.stop()
        var navtime = await outer_this.driver.executeScript('return performance.timing').then((result) => {
            return result
        })
        var loadEventEnd = navtime.loadEventEnd - navtime.navigationStart
        var cuterStart = (navtime.navigationStart - startMark) / 1000
        if (cuterStart < 10) {
            cuterStart = "0" + cuterStart
        }
        var cutterComand = 'ffmpeg -i ' + videoPath + ' -ss 00:00:' + cuterStart + '  /tmp/reports/' + page_name + '_short.mp4 -y'
        var resultTimestampFrame = []
        var duration = endMark - navtime.navigationStart
        var cuterIterator = Math.floor(duration / 7)
        for (let index = cuterIterator; resultTimestampFrame.length < 6; index = index + cuterIterator) {
            resultTimestampFrame.push(index)
        }
        resultTimestampFrame.push(loadEventEnd)
        utils.sleep(5)
        await Executor(cutterComand)
        utils.sleep(2)
        await extractFrames({
            input: '/tmp/reports/' + page_name + '_short.mp4',
            output: '/tmp/reports/frame/' + page_name + '%d.jpg',
            offsets: resultTimestampFrame
        })
    }
}
ScenarioBuilder.prototype.ResultReport = async function (pageName, pageUrl, parameter, lh_name, error) {
    var outer_this = this;
    var isAction
    var status

    await outer_this.reporter.runPageAudit(outer_this.driver,pageName,error)
                        .then((status)=>{outer_this.consoleLogger.info(status)})
                        .catch((err)=> { outer_this.consoleLogger.error(err.message); outer_this.consoleLogger.debug(err)})

    if (error) {
        outer_this.consoleLogger.error(`Test Case ${pageName} failed.`)
        outer_this.consoleLogger.debug(error)
        await outer_this.junit.failCase(pageName, error)
        if (!outer_this.rp) {
            await utils.takeScreenshot(outer_this.driver, `${pageName}_Failed`, outer_this.consoleLogger)
        }
        if (outer_this.logger) {
            status = 'ko'
            await outer_this.logger.logError(error, pageUrl, pageName, parameter)
            isAction = await outer_this.logger.logInfo(outer_this.driver, pageName, status)
        }
        if (!isAction && (outer_this.lightHouseArr != undefined || outer_this.lightHouseArr != null)) {
            try {
                await outer_this.lighthouse.startAnalyse(lh_name, outer_this.lightHouseArr, lighthouseOptionsDesktop, lighthouseOptionsMobile, outer_this.driver, outer_this.testName)
            } catch (error) {
                outer_this.consoleLogger.error(error.friendlyMessage)
            }
        }
        if (outer_this.rp) {
            if (isAction) {
                await outer_this.rp.reportIssue(error, pageUrl, parameter, pageName, outer_this.driver, null, lh_name)
            } else {
                await outer_this.rp.reportIssue(error, pageUrl, parameter, pageName, outer_this.driver, lightHouseArr, lh_name)
            }
        }
    } else {
        outer_this.consoleLogger.info(`Starting Analyse ${pageName}.`)
        await outer_this.junit.successCase(pageName)
        if (!outer_this.rp) {
            await utils.takeScreenshot(outer_this.driver, pageName, outer_this.consoleLogger)
        }
        if (outer_this.logger) {
            status = 'ok'
            isAction = await outer_this.logger.logInfo(outer_this.driver, pageName, status)
            await outer_this.driver.executeScript('performance.clearResourceTimings()');
        }
        if (!isAction && (outer_this.lightHouseArr != undefined || outer_this.lightHouseArr != null)) {
            try {
                await outer_this.lighthouse.startAnalyse(lh_name, outer_this.lightHouseArr, lighthouseOptionsDesktop, lighthouseOptionsMobile, outer_this.driver, outer_this.testName)
            } catch (error) {
                outer_this.consoleLogger.error(error.friendlyMessage)
            }
        }
        if (outer_this.rp) {
            if (isAction) {
                await outer_this.rp.reportResult(pageName, pageUrl, parameter, outer_this.driver, null, lh_name)
            } else {
                await outer_this.rp.reportResult(pageName, pageUrl, parameter, outer_this.driver, outer_this.lightHouseArr, lh_name)
            }
        }
    }
}

ScenarioBuilder.prototype.scn = async function (scenario, globalIteration, times) {
    var outer_this = this;
    var test_name = outer_this.testName

    outer_this.InitDriver()
    try {
        outer_this.consoleLogger.info(`${test_name} suite, iteration ${globalIteration}`)
        outer_this.scenarioIter = 1
        for (let page_name in scenario) {

            var stepList = []
            var page = scenario[page_name]
            var parameters = page['parameters']

            if (page['url'] != null || page['url'] != undefined) {
                outer_this.baseUrl = page['url']
            }
            stepList = PageStepsBuilder.StepListForExecution(page['steps'], this.UserFeeders)

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
            } else {
                await outer_this.TestStepsExecute(page_name, null, parameters, page, stepList, globalIteration)
                outer_this.scenarioIter += 1
                outer_this.previousUrl = outer_this.baseUrl
            }
            await utils.sleep(3)
        }
    } catch (error) {
        outer_this.consoleLogger.error(error)
        outer_this.junit.errorCase(error)
    } finally {
        if (globalIteration == (times)) {
            outer_this.junit.writeXml()
            utils.sleep(5)
            outer_this.consoleLogger.info(`Congrats, ${test_name} suite is done.`)
        }
        if (outer_this.driver) {
            outer_this.driver.quit();
        }
    }
}

module.exports = ScenarioBuilder