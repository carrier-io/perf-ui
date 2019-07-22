const { By } = require('selenium-webdriver')
var hash = require('object-hash')
var iterationCollection = new Map()

function GetFeederInsideString(value){
    if (!iterationCollection.has(hash(value))){
        if (typeof value.resolveData == 'string'){
            iterationCollection.set(hash(value),[value.resolveData])
        }
        else{
            iterationCollection.set(hash(value),Array.from(value.resolveData))
        }
    }
    if (iterationCollection.has(hash(value))){
        var checkCollection = iterationCollection.get(hash(value))
        if (checkCollection.length <= 0){
            if (typeof value.resolveData == 'string'){
                iterationCollection.set(hash(value),[value.resolveData])
            }
            else{
                iterationCollection.set(hash(value),Array.from(value.resolveData))
            }
        }
    }
    var temp = iterationCollection.get(hash(value)).shift()
    return value.defaultString.replace("__placeholder__",temp)
}

module.exports = {
    GetWebElementLocator: async function (step) {
        if (step[1] == 'xpath') {
            return By.xpath(step[2])
        }
        if (step[1] == 'css') {
            return By.css(step[2])
        }
        if (step[1] == 'id') {
            if (step[2] instanceof Number) {
                return step[2]
            }
            else {
                return By.id(step[2])
            }
        }
        if (step[1] == 'name') {
            return By.name(step[2])
        }
        if (step[1] == 'class') {
            return By.className(step[2])
        }
        if (step['xpath']) {
            return By.xpath(step['xpath'])
        }
        if (step['css']) {
            return By.css(step['css'])
        }
        if (step['id']) {
            return By.id(step['id'])
        }
        if (step['name'] == 'name') {
            return By.name(step['name'])
        }
        if (step['class'] == 'class') {
            return By.className(step['class'])
        }
    },
    ExecuteClick: async function (driver, locator) {
        await driver.findElement(locator).click()
    },
    ExecuteInput: async function (driver, locator, value) {
        if (typeof value == 'undefined'){
            throw "Current variable not found, please check your YAML file"
        }
        if (typeof value == "object") {
            if (value == undefined || value == null || value.length <= 0){
                throw "Variable value not defined, please check your feeder file"
            }
            var result = GetFeederInsideString(value)       
            if (result == undefined || result == null){
                throw "Variable value is empty, please set than in feeder file"
            }
        }
        else {
            var result = value
        }
        await driver.findElement(locator).clear()
        await driver.findElement(locator).sendKeys(result)
    },
    ExecuteCheckIsPresent: async function (waiter, locator) {
        await waiter.waitFor(locator).then((element) => waiter.waitUntilVisible(element))
    },

    ExecuteCheckIsNotPresent: async function (waiter, locator) {
        await waiter.waitFor(locator).then((element) => waiter.waitUntilNotVisible(element))
    },
    ExecuteSwitchToFrame: async function (driver, locator) {
        await driver.switchTo().frame(locator)
    },
    ExecuteSwitchToDefaultContent: async function (driver) {
        await driver.switchTo().defaultContent()
    },
    ExecuteNavigateToUrl: async function (driver, url) {
        await driver.get(url)
    },
    ExecuteJS: async function (driver, value) {
        if (typeof value == "object") {
            if (value == undefined || value == null || value.length <= 0){
                throw "Variable value not defined, please check your feeder file"
            }
            var result = GetFeederInsideString(value)       
            if (result == undefined || result == null){
                throw "Variable value is empty, please set than in feeder file"
            }
        }
        else {
            var result = value
        }
        await driver.executeScript(result)
    },
    GetSessionCookie: async function (driver) {
        return await driver.manage().getCookies();
    }
}