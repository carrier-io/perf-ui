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

const { Builder, By } = require('selenium-webdriver')

require('chromedriver');

var Waiter = require("./waiters")
var Lighthouse = require('./lighthouse')
var Logger = require('./logger')
const { format } = require('util')
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
    chromeFlags: ['--show-paint-rects', '--window-size=1440,900']
};

const capabilities = {
    "browserName": 'chrome',
    "chromeOptions": {
        "args": ["--window-size=1440,900", "--disable-dev-shm-usage", "--no-sandbox"],
        "extensions": []
    }
}

ScenarioBuilder.prototype.testStep = function (driver, page_name, url, param, check, waiter, iteration) {
    var status = 'ok';
    var outer_this = this;
    var lh_name = `${page_name}_lh_${iteration}`

    console.log("Opening %s page (%d)", page_name, iteration)

    return driver.get(url).then(() => {
        if (check != null || check != undefined) {
            if (check['xpath'] != null) {
                var xpath = By.xpath(check['xpath'])
                return waiter.waitFor(xpath)
                    .then(() => waiter.waitUntilVisible(xpath))

            } else if (check['css'] != null) {
                var css = By.css(check['css'])
                return waiter.waitFor(css)
                    .then(() => waiter.waitUntilVisible(css))
            }
        }
    })
        .catch((error) => {
            console.log(`Open ${page_name} page failed.`)

            if (!outer_this.logger && !outer_this.rp) {
                utils.takeScreenshot(driver, `${page_name}_Failed`)
            }

            outer_this.lighthouse.startLighthouse(lh_name, lighthouse_opts, driver, this.testName);

            if (outer_this.logger) {
                utils.takeScreenshot(driver, `${page_name}_Failed`)
                outer_this.logger.logError(error, url, page_name, param)
            }
            if (outer_this.rp) {
                outer_this.rp.reportIssue(error, url, param, page_name, driver, lh_name)
            }
            outer_this.junit.failCase(page_name, error)
            status = 'ko';
        }).then(() => {
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
                outer_this.rp.reportResult(page_name, url, param, driver, lh_name)
            }
        })
}

ScenarioBuilder.prototype.scn = async function (scenario, iteration, times) {
    var driver;
    var outer_this = this;

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
        } else {
        }
    });

    var test_name = outer_this.testName

    var waiter = new Waiter(driver)

    try {
        console.log(`${test_name} test, iteration ${iteration}`)
        for (let page_name in scenario) {
            var page = scenario[page_name]
            var url = page['url']
            var parameters = page['parameters']
            var check = page['check']

            if (parameters != null || parameters != undefined) {
                if (parameters.length > 1) {
                    for (let param of parameters) {
                        let page_url = url + param
                        let name = format("%s_%d", page_name, parameters.indexOf(param))
                        await outer_this.testStep(driver, name, page_url, param, check, waiter, iteration)
                    }
                } else {
                    let page_url = url + parameters
                    await outer_this.testStep(driver, page_name, page_url, parameters, check, waiter, iteration)
                }
            } else {
                await outer_this.testStep(driver, page_name, url, parameters, check, waiter, iteration)
            }

            await utils.sleep(3)
        }
    } catch (e) {
        outer_this.junit.errorCase(e)
    } finally {
        if (iteration == (times - 1)) {
            if (outer_this.rp) {
                await outer_this.rp.finishTestLaunch()
            }
            outer_this.junit.writeXml()
            utils.sleep(5)
            console.info("Congrats, test is done.")
        }
        await driver.quit();
    }

}

module.exports = ScenarioBuilder