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
const locatorXpath = 'xpath'
const locatorCss = 'css'
const locatorId = 'id'
const testUrl = 'url'
const testInput = 'input'
const inputValue = 'value'
const testClick = 'click'
const testCheck = 'check'

const switchToFrame = 'switchToFrame'
const switchToDefault = 'switchToDefault'


var Waiter = require("./waiters")
var Lighthouse = require('./lighthouse')
var Logger = require('./logger')
const {
    format
} = require('util')
var utils = require('./utils')
var JUnitBuilder = require('./junit_reporter')

function ScenarioBuilder(test_name, influx_conf, rp) {
    this.testName = test_name.replace(/\.y.?ml/g, '')
    if (influx_conf && influx_conf['url'] != null) {
        this.logger = new Logger(influx_conf, this.testName)
    }
    if (rp) {
        this.rp = rp
    }
    this.junit = new JUnitBuilder(this.testName)

    this.lighthouse = new Lighthouse()
}

const lighthouse_opts = {
    chromeFlags: ['--show-paint-rects', '--window-size=1440,900'],
    disableDeviceEmulation: true
};

const capabilities = {
    "browserName": 'chrome',
    "chromeOptions": {
        "args": ["--window-size=1440,900", "--disable-dev-shm-usage", "--no-sandbox"],
        "extensions": []
    }
}

ScenarioBuilder.prototype.testStep_v1 = function (driver, page_name, baseUrl, parameters, pageCheck, stepList, waiter, iteration, scenarioIter, targetUrl) {
    var page_name = page_name.replace(/[^a-zA-Z0-9_]+/g, '_')
    var lh_name = `${page_name}_lh_${iteration}`
    var status = 'ok';
    var outer_this = this;

    console.log("Opening %s TestCase (%d)", page_name, iteration)

    return driver.sleep(1).then(()=>outer_this.execList(driver, scenarioIter, baseUrl, pageCheck, stepList, waiter, targetUrl))
                    .catch((error) => outer_this.errorHandler(driver, page_name, error, baseUrl, parameters, lh_name, status))
                    .then((status) => outer_this.analyseAndReportResult(driver, page_name, baseUrl, parameters, lh_name, status))
}

ScenarioBuilder.prototype.execList = function (driver,scenarioIter, baseUrl, pageCheck, stepList, waiter, targetUrl) {

    var locator;
    var lastStep;

    if (scenarioIter == 0 || targetUrl!=baseUrl){
        lastStep = driver.get(baseUrl)
    }

    for (i = 0; i < stepList.length; i++) {
        if (stepList[i] == undefined || stepList[i] == null) {
            continue;
        }
        if (stepList[i][0] == 'url') {
            var targetUrl = stepList[i][1]
            lastStep = driver.get(targetUrl)
        }
        if (stepList[i][0] == 'input') {
            if (stepList[i][1] == 'xpath') {
                locator = By.xpath(stepList[i][2])
            } else {
                locator = By.css(stepList[i][2])
            }
            var value = stepList[i][3]
            var inputField = driver.findElement(locator)
            if (inputField.getText != "") {
                inputField.clear()
            }
            lastStep = inputField.sendKeys(value);
        }
        if (stepList[i][0] == 'click') {
            if (stepList[i][1] == 'xpath') {
                locator = By.xpath(stepList[i][2])
            } else {
                locator = By.css(stepList[i][2])
            }
            var clickElement = driver.findElement(locator)
            lastStep = clickElement.click()
        }
        if (stepList[i][0] == 'check') {
            if (stepList[i][1] == 'xpath') {
                locator = By.xpath(stepList[i][2])
            } else {
                locator = By.css(stepList[i][2])
            }
            var firstWait = waiter.waitFor(locator).then(() => waiter.waitUntilVisible(locator))
            lastStep = driver.executeScript("arguments[0].scrollIntoView();", firstWait)
        }
        if (stepList[i][0] == 'switchToFrame') {
            if (stepList[i][1] == 'id'){
                locator = stepList[0][2]
            }
            if (stepList[i][1] == 'xpath'){
                locator = driver.findElement(By.xpath(stepList[i][2]))
            }
            if (stepList[i][1] == 'css'){
                locator = driver.findElement(By.css(stepList[i][2]))
            }
            lastStep = driver.switchTo().frame(locator)
        }
        if (stepList[i][0] == 'switchToDefault'){
            if (stepList[i][1]){
                lastStep = driver.switchTo().defaultContent()
            }
        }
    }
    if (pageCheck != null || pageCheck != undefined) {
        if (pageCheck['xpath'] != null || pageCheck['xpath'] != undefined) {
            locator = By.xpath(pageCheck['xpath'])
        } else {
            locator = By.css(pageCheck['css'])
        }
        lastStep = waiter.waitFor(locator).then(() => waiter.waitUntilVisible(locator))
    }
    lastStep = driver.sleep(2000)
    return lastStep
}

ScenarioBuilder.prototype.errorHandler = function (driver, page_name, error, pageUrl, param, lh_name, status) {
    console.log(`Test Case ${page_name} failed.`)
    status = 'ko';
    var outer_this = this;

    if (!outer_this.logger && !outer_this.rp) {
        utils.takeScreenshot(driver, `${page_name}_Failed`)
    }

    outer_this.lighthouse.startLighthouse(lh_name, lighthouse_opts, driver, this.testName);

    if (outer_this.logger) {
        utils.takeScreenshot(driver, `${page_name}_Failed`)
        outer_this.logger.logError(error, pageUrl, page_name, param)
    }
    if (outer_this.rp) {
        outer_this.rp.reportIssue(error, pageUrl, param, page_name, driver, lh_name)
    }
    outer_this.junit.failCase(page_name, error)

    return status
}
ScenarioBuilder.prototype.analyseAndReportResult = function (driver, page_name, pageUrl, param, lh_name, status) {
    var outer_this = this;
    console.log(`Starting Analyse ${page_name}.`)
    if (status == null || status == undefined) {
        status = 'ok'
    }
    if (!outer_this.logger && !outer_this.rp && status != 'ko') {
        utils.takeScreenshot(driver, page_name)
    }
    if (status != 'ko') {
        outer_this.lighthouse.startLighthouse(lh_name, lighthouse_opts, driver, this.testName);
        outer_this.junit.successCase(page_name)
    }
    if (outer_this.logger) {
        if (status != 'ko') {
            utils.takeScreenshot(driver, page_name)
        }
        outer_this.logger.logInfo(driver, page_name, status)
    }
    if (outer_this.rp && status != 'ko') {
        outer_this.rp.reportResult(page_name, pageUrl, param, driver, lh_name)
    }
}

ScenarioBuilder.prototype.scn = async function (scenario, iteration, times) {

    var outer_this = this;

    var driver = new Builder().withCapabilities(capabilities)
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
        } else { }
    });

    var test_name = outer_this.testName

    var waiter = new Waiter(driver)
    var scenarioIter = 0;
    var baseUrl
    var targetUrl

    try {
        console.log(`${test_name} test, iteration ${iteration}`)
        for (let page_name in scenario) {

            var stepList = []
            var page = scenario[page_name]
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
            scenarioIter+= 1
            targetUrl = baseUrl
        }
    } catch (error) {
        console.log(error)
        outer_this.junit.errorCase(error)
        driver.close();
    } finally {
        if (iteration == (times)) {
            if (outer_this.rp) {
                await outer_this.rp.finishTestLaunch()
            }
            outer_this.junit.writeXml()
            utils.sleep(5)
            console.info("Congrats, test is done.")
        }
        driver.quit();
    }
}

module.exports = ScenarioBuilder