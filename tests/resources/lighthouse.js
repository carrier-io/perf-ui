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

const lighthouse = require('lighthouse');
const { write } = require('lighthouse/lighthouse-cli/printer');
var logger

function Lighthouse(logger) {
    this.viewedPages = {}
    this.logger = logger
}

Lighthouse.prototype.runLighthouse = async function (url, lighthouse_opts, config = null) {
    return await lighthouse(url, lighthouse_opts, config).then(results => {
        delete results.artifacts;
        return results
    }).catch((error)=>{this.logger.debug(error)});
}


Lighthouse.prototype.saveLighthouse = async function (data, pageName, simulation) {
    try {
        await write(data, 'html', `/tmp/reports/lighthouse_pages/${pageName}.html`)
        this.logger.info('Lighthouse Page data saved to: '+pageName+'.html');
    } catch (e) {
        this.logger.info("Lighthouse page didn't saved.")
        this.logger.debug(e)
    }
}

Lighthouse.prototype.startLighthouse = async function (pageName, lighthouse_opts, driver, simulation) {
    var outer_this = this;
    return await driver.getCurrentUrl()
        .then(url => outer_this.runLighthouse(url, lighthouse_opts).catch((err) => { this.logger.error(err) })
        .then(results => outer_this.saveLighthouse(results.report, pageName, simulation)))
}

Lighthouse.prototype.startAnalyse = async function (pageName, lighthouse_opts, desktop, mobile, driver, simulation) {
    var outer_this = this
    if (lighthouse_opts.desktop) {
        var fileName = pageName + '_desktop'
        await outer_this.startLighthouse(fileName, desktop, driver, simulation)
    }
    if (lighthouse_opts.mobile) {
        var fileName = pageName + '_mobile'
        await outer_this.startLighthouse(fileName, mobile, driver, simulation)
    }
}
module.exports = Lighthouse;