#!/usr/bin/env node
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

var parser = require('./resources/parser')
var Scenario = require('./resources/scenario')
var ReportPortal = require('./resources/report_portal')
var argv = require('minimist')(process.argv.slice(2));
var pino = require('pino')
var logger = pino({
    prettyPrint: true,
})

var debugMode = argv['d'] || false
if (debugMode) {
    logger.level = 'debug'
    logger.debug("RUN IN DEBUG MODE\n")
}

var env = argv['e']
if (!env) {
    logger.info("Please specify environment with -e option")
    process.exit()
}
if (typeof (env) == 'string') {
    env = { env }
}

var test_name = argv['t']
if (!test_name) {
    logger.info("Please specify Test Name with -t option")
    process.exit()
}
var times = argv['n'];
if (!times) {
    times = 1;
    logger.info('Test going to be run: ' + times + ' times')

}

async function run() {
    var path = '/tmp/tests/' + test_name
    var resolved_scenario = await parser.resolveRef(path, logger)
    var influx_conf = resolved_scenario.influxdb || null
    var rp_conf = resolved_scenario.reportportal || null
    var scenario

    var rp;
    var lighthouseDeviceType = resolved_scenario.lighthouseDeviceEmulate || null

    if (rp_conf && rp_conf['rp_host'] && rp_conf['rp_token'] && rp_conf['rp_project_name'] && (env != null || env != undefined)) {
        rp = new ReportPortal(rp_conf,logger)
        rp.startTestLaunch(test_name, `Results for ${test_name}`)
        logger.debug("RP launch was started")
    } else if (rp_conf && (!rp_conf['rp_host'] || !rp_conf['rp_token'] || !rp_conf['rp_project_name'])) {
        logger.info("Some Report Portal config values don't set")
        logger.info(`Your config: ${JSON.stringify(rp_conf)}`)
    }

    for (let test in env) {
        var testSteps = env[test]
        scenario = resolved_scenario[testSteps]
        var ScenarioBuilder = new Scenario(testSteps, influx_conf, rp, lighthouseDeviceType, test_name, logger)
        for (var j = 1; j <= times; j++) {
            if (scenario != null || scenario != undefined) {
                logger.info(`Starting '${testSteps}' suite`)
                await ScenarioBuilder.scn(scenario, j, times)
            }
            else {
                logger.info(`Suite '${testSteps}' is not exist`)
                break
            }
        }
    }
    if (rp) {
        await rp.finishTestLaunch()
        logger.debug("RP launch was finished")
    }
}

run()