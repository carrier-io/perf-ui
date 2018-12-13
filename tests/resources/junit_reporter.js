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

var junit = require('junit-report-builder');

function JUnitBuilder(test_name) {
    this.builder = junit.newBuilder()
    this.test = this.builder.testSuite().name(test_name)
    this.test_name = test_name
}

JUnitBuilder.prototype.successCase = function (page_name) {
    var outer_this = this;

    var className = `ui.performance.${outer_this.test_name}.` + page_name.replace(/ /g, "_").replace(/\\/g, "\\").replace(/\//g, "\/")
    return outer_this.test.testCase().className(className).name(page_name)
}

JUnitBuilder.prototype.failCase = function (page_name, error) {
    var outer_this = this;

    var className = `ui.performance.${outer_this.test_name}.` + page_name.replace(/ /g, "_").replace(/\\/g, "\\").replace(/\//g, "\/")
    return outer_this.test.testCase().className(className).name(page_name).failure(error)
}

JUnitBuilder.prototype.errorCase = function (error) {
    var outer_this = this;

    var className = `ui.performance.${outer_this.test_name}`
    return outer_this.test.testCase().className(className).name('Error').error(error)
}

JUnitBuilder.prototype.writeXml = function() {
    var outer_this = this;

    return outer_this.builder.writeTo('/tmp/reports/test-report.xml')
}

module.exports = JUnitBuilder;