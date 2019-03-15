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

function Logger(influx_conf, scenario, triger, suite) {

    this.triger = triger;
    if (triger){
        var influx_host = influx_conf['url'] + influx_conf['db_name']
        if (influx_conf['user'] && influx_conf['password']) {
            influx_host = influx_host.replace(/:\/\//g, `://${influx_conf['user']}:${influx_conf['password']}@`)
        }
        this.client = new InfluxDB(influx_host);
    }
    this.perf_client = new UIPerformanceClient();
    this.scenario = scenario;
    this.build_id = scenario + "_" + Date.now();
    this.start_time = Date.now();
    this.suite = suite;
}

Logger.prototype.logInfo = async function (driver, pageName, status, isAlert = false) {
    var outer_this = this;
    return await outer_this.measure(driver, pageName, status, isAlert)
        .then((actionHandler) => { return actionHandler });
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
        if (outer_this.client != undefined || outer_this.client != null) {
            outer_this.client.write('errors').tag(tags).field(fields).queue();
            outer_this.client.syncWrite()
                .then(() => {
                    resolve(status);
                })
                .catch(error => {
                    console.log(error);
                    resolve(status);
                })
        }
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

Logger.prototype.measure = function (driver, pageName, status, isAlert) {
    sleep(2);
    var outer_this = this;
    return new Promise(function (resolve, reject) {
        var script = "return {" +
            "'navigation' : performance.getEntriesByType('navigation')," +
            "'paint' : performance.getEntriesByType('paint')," +
            "'resource' : performance.getEntriesByType('resource')," +
            "'timing' : performance.timing" +
            "}";

        driver.executeScript(script).then(perfData => {

            var diff = outer_this.perf_client.parsePerfData(perfData, isAlert);
            var actionHandler = false

            if (!diff.is_page) {
                pageName = pageName + 'Action';
                actionHandler = true
            }

            var data = ['uiperf', {
                page: pageName,
                scenario: outer_this.scenario,
                domain: diff.domain,
                status: status,
                build_id: outer_this.build_id,
                start_time: outer_this.start_time,
                suite: outer_this.suite
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
            if (outer_this.client != undefined || outer_this.client != null){
                outer_this.client.write(data[0]).tag(data[1]).field(data[2]).queue();
                outer_this.client.syncWrite().catch((error) => { console.log(error) });
            }
            resolve(actionHandler);
        })
    });
};

function sleep(time) {
    var stop = new Date().getTime();
    while (new Date().getTime() < stop + time * 1000) {
        ;
    }
}

module.exports = Logger;