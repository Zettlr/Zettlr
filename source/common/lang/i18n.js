// Loads the translation table based on a given language

const fs = require('fs');
const path = require('path');

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
    for(let a of args) {
        string = string.replace('%s', a); // Always replace one %s with an arg
    }

    return string;
}

module.exports = { i18n, trans };
