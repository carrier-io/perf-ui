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


function parseYmlFile(filepath) {
    try {
        return yaml.safeLoad(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
        console.log(e);
    }
}

function parseCookie(filepath) {
    try {
        var cookies_string = fs.readFileSync(filepath, 'utf8');

        return cookie.parse(cookies_string.toString())
    } catch (e) {
        console.log(e);
    }
}

module.exports = {parseYmlFile, parseCookie};