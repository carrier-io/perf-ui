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

var env = argv['e']
if (!env) {
    console.log("Please specify environment with -e option")
    process.exit()
}
var test_name = argv['t']
if (!test_name) {
    console.log("Please specify Test Name with -t option")
    process.exit()
}
var times = argv['n'];
if (!times) {
    times = 1;
    console.log('Test going to be run: ' + times + ' times')

}

async function run() {
    var path = '/tmp/tests/' + test_name
    var resolved_scenario = await parser.resolveRef(path)
    var influx_conf = resolved_scenario.influxdb || null
    var rp_conf = resolved_scenario.reportportal || null
    var scenario = resolved_scenario[env]
    
    var rp;
    var lighthouseDeviceType = resolved_scenario.lighthouseDeviceEmulate || null

    if (rp_conf && rp_conf['rp_host'] && rp_conf['rp_token'] && rp_conf['rp_project_name'] && (scenario != null || scenario != undefined )) {
        rp = new ReportPortal(rp_conf)
        rp.startTestLaunch(test_name, `Results for ${test_name}`)
    } else if (rp_conf && (!rp_conf['rp_host'] || !rp_conf['rp_token'] || !rp_conf['rp_project_name'])) {
        console.log("Some Report Portal config values don't set\n")
        console.log(`Your config:\n ${JSON.stringify(rp_conf)}`)
    }
    var ScenarioBuilder = new Scenario(test_name, influx_conf, rp, lighthouseDeviceType, env)
    for (var j = 1; j <= times; j++) {
        if (scenario != null || scenario != undefined){
            await ScenarioBuilder.scn(scenario, j, times)
        }
        else {
            console.log(`\nTest '${env}' is not exist`)
            break
        }
    }
}

run()