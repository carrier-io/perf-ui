const { By } = require('selenium-webdriver')


module.exports = {
    GetWebElementLocator: async function (step) {
        if (step[1] == 'xpath') {
            return By.xpath(step[2])
        }
        if (step[1] == 'css') {
            return By.css(step[2])
        }
        if (step[1] == 'id') {
            if (step[2] instanceof Number){
                return step[2]
            }
            else{
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
        if (step['id']){
            return By.id(step['id'])
        }
        if (step[1] == 'name') {
            return By.name(step['name'])
        }
        if (step[1] == 'class') {
            return By.className(step['class'])
        }
    },
    ExecuteClick: async function (driver, locator) {
        await driver.findElement(locator).click()
    },
    ExecuteInput: async function (driver, locator, value) {
        await driver.findElement(locator).clear()
        await driver.findElement(locator).sendKeys(value)
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
    GetSessionCookie: async function (driver) {
        return await driver.manage().getCookies();
    }
}