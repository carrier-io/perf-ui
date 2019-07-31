function getInputValue(step) {
    return step.value
}
function inputValueIsFeeders(value, FEEDERS) {
    var regexp1 = /\${(.+.)}/
    var regexp2 = /\${(.+.)\.(.+.)}/
    var regexp3 = /\${(.+.)\.(.+.)\.(.+.)}/
    var value = value.value
    if (value == null || value == undefined) {
        throw "Input value is NULL, please check your yaml file"
    }
    if (value.match(regexp3)) {
        var result = regexp3.exec(value)
        var resolveData = FEEDERS[result[1]][result[2]][result[3]]
        var defaultString = value.replace(result[0],"__placeholder__")
        return {defaultString,resolveData}
    }
    if (value.match(regexp2)) {
        var result = regexp2.exec(value)
        var resolveData = FEEDERS[result[1]][result[2]]
        var defaultString = value.replace(result[0],"__placeholder__")
        return {defaultString,resolveData}
    }
    if (value.match(regexp1)) {
        var result = regexp1.exec(value)
        var resolveData = FEEDERS[result[1]]
        var defaultString = value.replace(result[0],"__placeholder__")
        return {defaultString,resolveData}
    }
    return value
}

function getLocator(step) {
    var locator
    if (step.xpath) {
        locator = step.xpath
    }
    if (step.css) {
        locator = step.css
    }
    if (step.id) {
        locator = step.id
    }
    if (step.name) {
        locator = step.name
    }
    if (step.class) {
        locator = step.class
    }
    return locator
}

function getTypeOfLocator(step) {
    var locatorType
    if (step.xpath) {
        locatorType = 'xpath'
    }
    else if (step.css) {
        locatorType = 'css'
    }
    else if (step.id) {
        locatorType = 'id'
    }
    else if (step.name) {
        locatorType = 'name'
    }
    else if (step.class) {
        locatorType = 'class'
    }
    else {
        locatorType = step
    }
    return locatorType
}

function getStepType(step) {
    var stepType
    if (step.input) {
        stepType = 'input'
    }
    if (step.click) {
        stepType = 'click'
    }
    if (step.check) {
        stepType = 'check'
    }
    if (step.checkIsNot) {
        stepType = 'checkIsNot'
    }
    if (step.switchToFrame) {
        stepType = 'switchToFrame'
    }
    if (step.switchToDefault) {
        stepType = 'switchToDefault'
    }
    if (step.url) {
        stepType = 'url'
    }
    if (step.executeJS) {
        stepType = 'executeJS'
    }
    return stepType
}

function AddStepToList(step, feeders) {
    var resultArray = {}
    stepType = getStepType(step)
    resultArray[0] = stepType
    if (stepType != 'switchToDefault') {
        resultArray[1] = getTypeOfLocator(step[stepType])
    }
    else {
        resultArray[1] = true
    }

    resultArray[2] = getLocator(step[stepType])
    if (stepType == 'input' || stepType == 'executeJS') {
        if (feeders) {
            resultArray[3] = inputValueIsFeeders(step[stepType], feeders)
        }
        else {
            resultArray[3] = getInputValue(step[stepType])
        }
    }
    return resultArray
}

module.exports = {
    StepListForExecution: function (pageSteps, feeders) {
        var stepList = {}
        for (let step in pageSteps) {
            var stepToAdd = pageSteps[step]
            if (stepToAdd == null || stepToAdd == undefined) {
                continue;
            }
            stepList[step] = AddStepToList(stepToAdd, feeders)
        }
        return stepList
    }
}
