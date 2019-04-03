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
            return step[2]
        }
        if (step['xpath']) {
            return By.xpath(step['xpath'])
        }
        if (step['css']) {
            return By.css(step['css'])
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