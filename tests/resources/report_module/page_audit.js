var fs = require('fs')
var pug = require('pug')

async function getScriptSource() {
    return await fs.readFileSync('/tests/resources/report_module/source_audit_script.js', 'utf8')
}

async function getPageScore(driver, pageName) {
    var scriptSource = await getScriptSource()
    var pageScoreResult = await driver.executeScript('return ' + scriptSource).then((state) => {
        return state
    })
    await fs.writeFileSync('/tmp/reports/'+pageName+'.json', JSON.stringify(pageScoreResult))
    return pageScoreResult
}

async function generateHTMLreport(pageScoreResult, pageName) {
    var html = pug.renderFile('/tests/template/index.pug', pageScoreResult)
    await fs.writeFileSync('/tmp/reports/' + pageName + '.html', html)
}

module.exports = {
    runPageAudit: async function (driver, pageName,isPageFailure) {
            var pageFailure = isPageFailure ? "Failure" : "Passed" 
            var score = await getPageScore(driver,pageName)
            var pageTime = await driver.executeScript('return performance.timing').then((result)=>{return result})
            var resourcesTime = await driver.executeScript("return performance.getEntriesByType('resource');").then((result)=>{return result})
            var frame = await fs.readdirSync('/tmp/reports/frame/')
            var imageBase64Aray = []
            for (let path of frame) {
                var image64 = await fs.readFileSync('/tmp/reports/frame/' + path, 'base64')
                imageBase64Aray.push(image64)
                await fs.unlinkSync('/tmp/reports/frame/' + path)
            }
            score.frameBase64Array = imageBase64Aray
            score.ReportTiming = JSON.stringify(pageTime)
            score.ReportResource = JSON.stringify(resourcesTime)
            score.TestStatus = pageFailure
            await generateHTMLreport(score, pageName)
            return "Report for " + pageName+ " was generated"
    }
}