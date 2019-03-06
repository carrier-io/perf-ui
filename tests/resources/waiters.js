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

var webdriver = require('selenium-webdriver'),
    until = webdriver.until;

const globalTimeout = require("./globalTimeout.json")

function Waiter(driver) {
    this.driver = driver;
}

Waiter.prototype.waitFor = async function (locator, timeout) {
    var waitTimeout = timeout || globalTimeout;
    await this.driver.wait(until.elementLocated(locator), waitTimeout)
};

Waiter.prototype.waitUntilVisible =async function (locator, timeout) {
    var waitTimeout = timeout || globalTimeout;
    return await this.driver.wait(until.elementIsVisible(this.driver.findElement(locator)), waitTimeout)
};

Waiter.prototype.waitUntilNotVisible = function (locator, timeout) {
    var waitTimeout = timeout || globalTimeout;
    return this.driver.wait(until.elementIsNotVisible(this.driver.findElement(locator)), waitTimeout)
};

Waiter.prototype.waitUntilElemNotVisible = function (elem, timeout) {
    var waitTimeout = timeout || globalTimeout;
    return this.driver.wait(until.elementIsNotVisible(elem), waitTimeout)
};

Waiter.prototype.findElement =async function (locator) {
    await this.driver.findElement(locator);
};

module.exports = Waiter