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

function formatPerformanceTimingObjectAction(actionDuration) {
    return {
        'latency': 0,
        'transfer': 0,
        'tti': 0,
        'ttl': 0,
        'onload': 0,
        'total_time': actionDuration
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

function measureActionTime(resourceTimingObj) {
    if (resourceTimingObj.length < 1) {
        return 0;
    } else if (resourceTimingObj.length == 1) {
        return resourceTimingObj[0].duration;
    }
    let start = resourceTimingObj[0].startTime;
    let end = resourceTimingObj[resourceTimingObj.length - 1].responseEnd;

    return end - start;
}

function compare(a, b) {
    return JSON.stringify(a) == JSON.stringify(b);
}

UIPerformanceClient.prototype.parsePerfData = function (data, isFrame) {
    let lastPerfNavTiming = data.navigation[0];
    let lastPerfPaintTiming = data.paint;
    let lastPerfResourceTiming = formatResourceTimingObject(data.resource);
    let perfTiming = data.timing;
    let navTiming = this.perfNavTiming;
    delete perfTiming.toJSON;
    
    let actionDuration = measureActionTime(lastPerfResourceTiming)
    let formattedPerfTiming = formatPerformanceTimingObject(perfTiming);
    let formattedPerfTimingAction = formatPerformanceTimingObjectAction(actionDuration);

    let currentLastResourceIndex = lastPerfResourceTiming.length - 1;
    let parsedURL = utils.parseURL(lastPerfNavTiming.name);

    let transferSize = lastPerfNavTiming.transferSize;
    let encodedBodySize = lastPerfNavTiming.encodedBodySize;
    let decodedBodySize = lastPerfNavTiming.decodedBodySize;

    if (isFrame) {
        navTiming = this.perfFrameTiming;
    }

    if (compare(navTiming, lastPerfNavTiming) || compare(this.perfFrameTiming, lastPerfNavTiming)) {      

        
        if (isFrame) {
            this.lastFrameIndex = currentLastResourceIndex;
        } else {
            this.lastResourceIndex = currentLastResourceIndex;
        }

        return {
            'navigation': lastPerfNavTiming,
            'timing': perfTiming,
            'resource':  lastPerfResourceTiming, //shiftResourceTimings(resourceDiff),
            'formattedTiming': formattedPerfTimingAction,
            'domain': parsedURL.domain,
            'url': parsedURL.path,
            'duration': actionDuration, //measureActionTime(resourceDiff),
            'is_page': false
        };
    } else {
        if (isFrame) {
            this.perfFrameTiming = lastPerfNavTiming;
            this.lastFrameIndex = currentLastResourceIndex;
        } else {
            this.perfNavTiming = lastPerfNavTiming;
            this.lastResourceIndex = currentLastResourceIndex;
        }

        var firstPaint = 0;
        var firstContentfulPaint = 0;

        try {
            firstPaint = Math.round(lastPerfPaintTiming[0].startTime);
            firstContentfulPaint = Math.round(lastPerfPaintTiming[1].startTime);
        } catch (TypeError) {
            console.log("Cannot read 'startTime' property");
            console.log("Timing Object: " + lastPerfPaintTiming);
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
    }
};

module.exports = UIPerformanceClient;