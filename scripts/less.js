// This script generates both main.css and zettlr-theme.css.
// Run with `npm run less`

const less  = require('less');
const fs    = require('fs');
const path  = require('path');

console.log(`Starting LESS compiler ...`);

console.info(`Current working directory: ${__dirname}`);

// If you wanted to render a file, you would first read it into a string
// (to pass to less.render) and then set the filename field on options to be
// the filename of the main file. less will handle all the processing of the
// imports.
let mainFile    = path.join(__dirname, '../resources/less/main.less');
let mainTarget  = path.join(__dirname, '../source/renderer/assets/css/main.css');
let themeFile   = path.join(__dirname, '../resources/less/theme-zettlr.less');
let themeTarget = path.join(__dirname, '../source/renderer/assets/css/theme-zettlr.css');
let mainLess    = '';
let themeLess   = '';

console.log(`Reading input files ...`);
try {
    mainLess = fs.readFileSync(mainFile, { encoding: 'utf8' });
    console.log(`Successfully read ${mainFile}!`);
}catch(e) {
    console.error(`ERROR: Could not read ${mainFile}: ${e.name}`);
    console.error(e.message);
    return;
}

try {
    themeLess = fs.readFileSync(themeFile, { encoding: 'utf8' });
    console.log(`Successfully read ${themeFile}`);
}catch(e) {
    console.error(`ERROR: Could not read ${themeFile}: ${e.name}`);
    console.error(e.message);
    return;
}

/*
 * PART ONE
 */

console.log(`Compiling ${mainFile} ...`);
less.render(mainLess, {
    'filename': mainFile
})
.then(function(output) {
    console.log(`Done compiling ${mainFile}! Writing to target file ...`);
    try {
        fs.writeFileSync(mainTarget, output.css, { encoding: 'utf8' });
        console.log(`Done writing CSS to file ${mainTarget}!`);
        console.info(`Sourcemap:`, output.map);
        console.info(`Imported files:`, output.imports);
    } catch(e) {
        console.error(`ERROR: Error on writing ${mainFile}: ${e.name}`);
        console.error(e.message);
    }
},
function(error) {
    if(error) {
        console.error(`ERROR: Could not compile ${mainLess}: ${error.name}`);
        console.error(error.message);
    }
});

/*
 * PART TWO
 */

console.log(`Compiling ${themeFile} ...`);
less.render(themeLess, {
    'filename': themeFile
})
.then(function(output) {
    console.log(`Done compiling ${themeFile}! Writing to target file ...`);
    try {
        fs.writeFileSync(themeTarget, output.css, { encoding: 'utf8' });
        console.log(`Done writing CSS to file ${themeTarget}!`);
        console.info(`Sourcemap:`, output.map);
        console.info(`Imported files:`, output.imports);
    } catch(e) {
        console.error(`ERROR: Error on writing ${themeFile}: ${e.name}`);
        console.error(e.message);
    }
},
function(error) {
    if(error) {
        console.error(`ERROR: Could not compile ${themeLess}: ${error.name}`);
        console.error(error.message);
    }
});
