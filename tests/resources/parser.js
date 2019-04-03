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

yaml = require('js-yaml');
fs = require('fs');
cookie = require('cookie-parse');
$RefParser = require('json-schema-ref-parser');


function parseCookie(filepath) {
    try {
        var cookies_string = fs.readFileSync(filepath, 'utf8');
        return cookie.parse(cookies_string.toString())
    } catch (e) {
        console.log(e);
    }
}

async function resolveRef(filepath) {
    try{
        var result = await $RefParser.dereference(filepath).catch((err)=>{console.log(err)})
        console.log(JSON.stringify(result))
        return result
    }
    catch(error){
        console.log(error)
    }
}

module.exports = { parseCookie, resolveRef };