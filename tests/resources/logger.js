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

var InfluxDB = require('influxdb-nodejs');
var UIPerformanceClient = require('./ui_perf_client');
var Lighthouse = require('./lighthouse');
var utils = require('./utils')


function Logger(influx_conf, scenario) {
    var influx_host = influx_conf['url'] + influx_conf['db_name']
    if(influx_conf['user'] && influx_conf['password']) {
        influx_host = influx_host.replace(/:\/\//g, `://${influx_conf['user']}:${influx_conf['password']}@`)
    }
    this.client = new InfluxDB(influx_host);
    this.perf_client = new UIPerformanceClient();
    this.scenario = scenario;
}

Logger.prototype.logInfo = function (driver, pageName, status) {
    var outer_this = this;
    outer_this.measure(driver, pageName, status)
        .then(() => {
            return driver.executeScript('performance.clearResourceTimings()');
        });
};

Logger.prototype.logError = function (error, domain, pageName, url) {
    var outer_this = this;
    var status = 'ko';
    var message = "Open " + pageName + " failed."

    return new Promise(function (resolve, reject) {
        var tags = {
            'test_type': 'ui'
        };
        var fields = {
            'request_name': pageName,
            'domain': domain,
            'path': utils.formatString(url),
            'scenario': outer_this.scenario,
            'error_type': defineErrorType(pageName, error.toString()),
            'error_details': utils.formatString(error),
            'error_message': message
        };
        outer_this.client.write('errors').tag(tags).field(fields).queue();
        outer_this.client.syncWrite()
            .then(() => {
                resolve(status);
            })
            .catch(error => {
                console.log(error);
                resolve(status);
            })
    })
}

function defineErrorType(pageName, errorMessage) {
    if (errorMessage) {
        if (errorMessage.search(/time(d)*?(\s)*?out/i) >= 0) {
            return pageName + '_timeout';
        } else {
            return pageName + '_undefined';
        }
    } else {
        return 'undefined';
    }
}

Logger.prototype.measure = function (driver, pageName, status) {
    var outer_this = this;
    return new Promise(function (resolve, reject) {
        var script = "return {" +
            "'navigation' : performance.getEntriesByType('navigation')," +
            "'paint' : performance.getEntriesByType('paint')," +
            "'resource' : performance.getEntriesByType('resource')," +
            "'timing' : performance.timing" +
            "}";

        driver.executeScript(script).then(perfData => {

            console.log(JSON.stringify(perfData.navigation[0].name));

            var diff = outer_this.perf_client.parsePerfData(perfData);

            var data = ['uiperf', {
                page: pageName,
                scenario: outer_this.scenario,
                domain: diff.domain,
                status: status
            }];

            datacell = {
                raw_data_timing: JSON.stringify(diff.timing),
                raw_objects_timing: JSON.stringify(diff.resource),
                url: diff.url,
                count: 1
            };

            for (var key in diff.formattedTiming) {
                if (diff.formattedTiming.hasOwnProperty(key)) {
                    datacell[key] = diff.formattedTiming[key];
                }
            }

            if (diff.duration) {
                datacell['duration'] = diff.duration;
            }

            if (diff.firstPaint) {
                datacell['firstPaint'] = diff.firstPaint;
                datacell['firstContentfulPaint'] = diff.firstContentfulPaint;
                datacell['transferSize'] = diff.transferSize;
                datacell['encodedBodySize'] = diff.encodedBodySize;
                datacell['decodedBodySize'] = diff.decodedBodySize;
            }

            data = data.concat(datacell);
            outer_this.client.write(data[0]).tag(data[1]).field(data[2]).queue();
            outer_this.client.syncWrite();
            resolve();
        })

    });
};

module.exports = Logger;