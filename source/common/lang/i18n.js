/**
 * BEGIN HEADER
 *
 * Contains:        Internationalization functions
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains several functions, not classes, that help
 *                  with the internationalization of the app.
 *
 * END HEADER
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * This error is thrown when the internationalization functions encounter an error
 * @param       {String} msg The error message
 * @constructor
 */
function TranslationError(msg)
{
    this.title = 'Translation Error';
    this.message = msg;
}

/**
 * This function loads a language JSON file specified by lang into the global i18n-object
 * @param  {String} [lang='en_US'] The language to be loaded
 * @return {void}                Function does not return anything.
 */
function i18n(lang = 'en_US')
{
    let file = path.join(__dirname, lang + '.json');

    try {
        fs.lstatSync(file);
    } catch(e) {
        try {
            // If the language file is not found in the app's directory, search
            // for it in the application data directory under APP_DATA/lang
            file = path.join(app.getPath('userData'), '/lang/', lang + '.json');
            fs.lstatSync(file);
        } catch(e) {
            file = path.join(__dirname, 'en_US.json'); // Fallback
        }
    }

    // Cannot do this asynchronously, because it HAS to be loaded directly
    // after the config and written into the global object
    global.i18n = JSON.parse(fs.readFileSync(file, 'utf8'));
};

/**
 * This translates a given identifier string into the loaded language
 * @param  {String} string A dot-delimited string containing the translatable
 * @param  {String} args   Zero or more strings that will replace %s-placeholders in the string
 * @return {String}        The translation with all potential replacements applied.
 */
function trans(string, ...args)
{
    if(string.indexOf('.') === -1) {
        throw new TranslationError('No translation string recognized!');
    }

    // Split the string by dots
    let str = string.split('.');
    let transString = global.i18n;

    for(let obj of str) {
        if(transString.hasOwnProperty(obj)) {
            transString = transString[obj];
        } else {
            // Something went wrong and the requested translation string was
            // not found -> fall back and just return the original string
            return string;
        }
    }

    if(typeof transString !== 'string') {
        // There was an additional attribute missing (there is a whole object
        // in the variable) -> just return the string
        return string;
    }

    for(let a of args) {
        transString = transString.replace('%s', a); // Always replace one %s with an arg
    }

    return transString;
}

module.exports = { i18n, trans };
