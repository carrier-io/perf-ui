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

var fs = require('fs')

module.exports = {

    takeScreenshot: async function (driver, name, logger) {
        return await driver.takeScreenshot().then(function (data) {
            name = `${name}.png` || 'ss.png';
            var path = '/tmp/reports/screenshots/';
            var output;
            try {
                output = fs.appendFileSync(path + name, data, 'base64');
                logger.info(`New Screenshot created: ${name}`)
            } catch (err) {
                logger.error(err);
            }
            return output;
        })
    },

    sleep: function (time) {
        var stop = new Date().getTime();
        while (new Date().getTime() < stop + time * 1000) {
            ;
        }
    },

    formatString: function (string) {
        if (!string) {
            return ' ';
        } else {
            return string.toString().replace(/"/g, '\\"');
        }
    },

    getEnvironment: function () {
        var defaultValue = "stag";
        var environment = process.env.environment;
        if (!environment) {
            environment = defaultValue;
        }
        return environment;
    },

    parseURL: function (url) {

        let match = url.split('?')[0].match(/^(?:https?:\/\/)(?:www\.)?(.*?)(\/.*)?$/);
        let domain = match[1];
        let path = match[2] ? match[2] : '';

        return {
            'domain': domain,
            'path': path
        };
    }
}