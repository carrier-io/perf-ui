function getInputValue(step){
    return step.value
}

function getLocator(step){
    var locator
    if (step.xpath){
        locator = step.xpath
    }
    if (step.css){
        locator = step.css
    }
    if (step.id){
        locator = step.id
    }
    if (step.name){
        locator = step.name
    }
    if (step.class){
        locator = step.class
    }
    return locator
}

function getTypeOfLocator(step){
    var locatorType
    if (step.xpath){
        locatorType = 'xpath'
    }
    else if (step.css){
        locatorType = 'css'
    }
    else if (step.id){
        locatorType = 'id'
    }
    else if (step.name){
        locatorType = 'name'
    }
    else if (step.class){
        locatorType = 'class'
    }
    else {
        locatorType = step
    }
    return locatorType
}

function getStepType(step){
    var stepType
    if (step.input){
        stepType = 'input'
    }
    if (step.click){
        stepType = 'click'
    }
    if (step.check){
        stepType = 'check'
    }
    if (step.checkIsNot){
        stepType = 'checkIsNot'
    }
    if (step.switchToFrame){
        stepType = 'switchToFrame'
    }
    if (step.switchToDefault){
        stepType = 'switchToDefault'
    }
    if (step.url){
        stepType = 'url'
    }
    return stepType
}

function AddStepToList(step){
    var resultArray = {}
    stepType = getStepType(step)
    resultArray[0] = stepType
    if (stepType != 'switchToDefault'){
        resultArray[1] = getTypeOfLocator(step[stepType])
    }
    else{
        resultArray[1] = true
    }
    
    resultArray[2] = getLocator(step[stepType])
    if (stepType == 'input'){
        resultArray[3] = getInputValue(step[stepType])
    }
    return resultArray
}

module.exports = {
    StepListForExecution: function (pageSteps) {
        var stepList = {}
        for (let step in pageSteps){
            var stepToAdd = pageSteps[step]
            if (stepToAdd == null || stepToAdd == undefined){
                continue;
            }
            stepList[step]= AddStepToList(stepToAdd)
        }
        console.log(stepList)
        return stepList
    }
}
