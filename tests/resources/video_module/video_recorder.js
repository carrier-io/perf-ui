var util = require('util')
var extractFrames = require('ffmpeg-extract-frames')
var bashExecuter = util.promisify(require('child_process').exec)
var recordScreen = require('record-screen')
var utils = require('../utils')
var video


async function startRecord(pageName, logger) {
    this.videoPath = '/tmp/reports/' + pageName + '.mp4';
    this.video = await recordScreen(videoPath, {
        resolution: '1440x900',
        fps: 20,
        display: 20
    })
    logger.debug('Video record for '+ pageName +' is start')
}

async function stopRecord(pageName,logger) {
    await this.video.stop()
    logger.debug('Video record for '+ pageName +' was stoped')
}

async function cutPageLoading(pageName, startMark, endMark, driver, logger) {
    var navtime = await driver.executeScript('return performance.timing').then((result) => {return result })
    var loadEventEnd = navtime.loadEventEnd - navtime.navigationStart
    var cuterStart = (navtime.navigationStart - startMark) / 1000
    if (cuterStart < 10) {
        cuterStart = "0" + cuterStart
    }
    var cutterComand = 'ffmpeg -i ' + this.videoPath + ' -ss 00:00:' + cuterStart + '  /tmp/reports/' + pageName + '_short.mp4 -y'
    var resultTimestampFrame = []
    var duration = endMark - navtime.navigationStart
    var cuterIterator = Math.floor(duration / 7)
    for (let index = cuterIterator; resultTimestampFrame.length < 6; index = index + cuterIterator) {
        resultTimestampFrame.push(index)
    }
    resultTimestampFrame.push(loadEventEnd)
    utils.sleep(4)
    await bashExecuter(cutterComand)
    await extractFrames({
        input: '/tmp/reports/' + pageName + '_short.mp4',
        output: '/tmp/reports/frame/' + pageName + '%d.jpg',
        offsets: resultTimestampFrame
    })
}

module.exports = {
    runRecorder: async function (pageName, logger) {
        await startRecord(pageName, logger)
    },
    stopRecorder: async function (pageName,startMark, endMark, driver, logger) {
        await stopRecord(pageName,logger);
        await cutPageLoading(pageName,startMark, endMark, driver, logger)
    }
}