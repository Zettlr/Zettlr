// Loads the translation table based on a given language

const fs = require('fs');
const path = require('path');

function TranslationError(msg)
{
    this.title = 'Translation Error';
    this.message = msg;
}

function i18n(lang = 'en_US')
{
    let file = path.join(__dirname, lang + '.json');

    try {
        fs.lstatSync(file);
    } catch(e) {
        throw { 'name': 'Localization', 'message': `Could not load language ${lang}!` };
    }

    // Cannot do this asynchronously, because it HAS to be loaded directly
    // after the config and written into the global object
    global.i18n = JSON.parse(fs.readFileSync(file, 'utf8'));
};

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
