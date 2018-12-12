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

var utils = require('./utils')

function UIPerformanceClient() {
    this.lastResourceIndex = -1;
    this.perfNavTiming = undefined;
    this.lastFrameIndex = -1;
    this.perfFrameTiming = undefined;
}

function formatPerformanceTimingObject(perfTimingObj) {
    return {
        'latency': perfTimingObj.responseStart - perfTimingObj.navigationStart,
        'transfer': perfTimingObj.responseEnd - perfTimingObj.responseStart,
        'tti': perfTimingObj.domInteractive - perfTimingObj.domLoading,
        'ttl': perfTimingObj.domComplete - perfTimingObj.domInteractive,
        'onload': perfTimingObj.loadEventEnd - perfTimingObj.loadEventStart,
        'total_time': perfTimingObj.loadEventEnd - perfTimingObj.navigationStart
    };
}

function formatResourceTimingObject(resourceTimingObj) {
    resourceTimingObj.forEach(resource => {
        resource.name = resource.name.replace("?", "-").replace(/=/g, "-").replace(/,/g, "-");
        delete resource.toJSON;
        for (fieldKey in resource) {
            if (typeof resource[fieldKey] == "number") {
                resource[fieldKey] = Math.round(resource[fieldKey]);
            }
        }
    });

    return resourceTimingObj;
}

UIPerformanceClient.prototype.parsePerfData = function (data) {
    let lastPerfNavTiming = data.navigation[0];
    let lastPerfPaintTiming = data.paint;
    let lastPerfResourceTiming = formatResourceTimingObject(data.resource);
    let perfTiming = data.timing;
    delete perfTiming.toJSON;
    let formattedPerfTiming = formatPerformanceTimingObject(perfTiming);

    let currentLastResourceIndex = lastPerfResourceTiming.length - 1;
    let parsedURL = utils.parseURL(lastPerfNavTiming.name);

    let transferSize = lastPerfNavTiming.transferSize;
    let encodedBodySize = lastPerfNavTiming.encodedBodySize;
    let decodedBodySize = lastPerfNavTiming.decodedBodySize;

    this.perfNavTiming = lastPerfNavTiming;
    this.lastResourceIndex = currentLastResourceIndex;
    var firstPaint = 0;
    var firstContentfulPaint = 0;

    try {
        firstPaint = Math.round(lastPerfPaintTiming[0].startTime);
        firstContentfulPaint = Math.round(lastPerfPaintTiming[1].startTime);
    } catch (TypeError) {
        console.log("Cannot read 'startTime' property");
    }

    return {
        'navigation': lastPerfNavTiming,
        'resource': lastPerfResourceTiming,
        'timing': perfTiming,
        'formattedTiming': formattedPerfTiming,
        'domain': parsedURL.domain,
        'url': parsedURL.path,
        'firstPaint': firstPaint,
        'firstContentfulPaint': firstContentfulPaint,
        'transferSize': transferSize,
        'encodedBodySize': encodedBodySize,
        'decodedBodySize': decodedBodySize,
        'is_page': true
    };
};

module.exports = UIPerformanceClient;