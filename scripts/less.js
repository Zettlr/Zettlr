// This script generates both main.css and zettlr-theme.css.
// Run with `npm run less`

const less  = require('less');
const fs    = require('fs');
const path  = require('path');
const chalk = require('chalk');

let err     = chalk.bold.red;
let warn    = chalk.yellow;
let info    = chalk.keyword('cornflowerblue');
let success = chalk.bold.green;

console.log(info(`Starting LESS compiler ...`));

console.info(info(`Current working directory: ${__dirname}`));

// If you wanted to render a file, you would first read it into a string
// (to pass to less.render) and then set the filename field on options to be
// the filename of the main file. less will handle all the processing of the
// imports.
let geometryFile = path.join(__dirname, '../resources/less/geometry/geometry-main.less');
let geometryTarget = path.join(__dirname, '../source/renderer/assets/css/geometry.css');
let themeFile = path.join(__dirname, '../resources/less/theme-default/theme-main.less');
let themeTarget = path.join(__dirname, '../source/renderer/assets/css/theme.css');
let geometryLess = '';
let themeLess   = '';

console.log(info(`Reading input files ...`));

try {
    themeLess = fs.readFileSync(themeFile, { encoding: 'utf8' });
    console.log(success(`Successfully read ${themeFile}`));
} catch(e) {
    console.error(err(`ERROR: Could not read ${themeFile}: ${e.name}`));
    console.error(err(e.message));
    return;
}

try {
    geometryLess = fs.readFileSync(geometryFile, { encoding: 'utf8' });
    console.log(success(`Successfully read ${geometryFile}`));
} catch(e) {
    console.error(err(`ERROR: Could not read ${geometryFile}: ${e.name}`));
    console.error(err(e.message));
    return;
}

/*
 * THEME
 */

console.log(info(`Compiling ${themeFile} ...`));
less.render(themeLess, {
    'filename': themeFile
})
.then(function(output) {
    console.log(success(`Done compiling ${themeFile}! Writing to target file ...`));
    try {
        fs.writeFileSync(themeTarget, output.css, { encoding: 'utf8' });
        console.log(success(`Done writing CSS to file ${themeTarget}!`));
        console.info(info(`Sourcemap:`, output.map));
        console.info(info(`Imported files: [\n   `, output.imports.join(',\n    '), '\n]'));
    } catch(e) {
        console.error(err(`ERROR: Error on writing ${themeFile}: ${e.name}`));
        console.error(err(e.message));
    }
},
function(error) {
    if(error) {
        console.error(err(`ERROR: Could not compile ${themeFile}: ${error.name}`));
        console.error(err(error.message));
    }
});

/*
 * GEOMETRY
 */

console.log(info(`Compiling ${geometryFile} ...`));
less.render(geometryLess, {
    'filename': geometryFile
})
.then(function(output) {
    console.log(success(`Done compiling ${geometryFile}! Writing to target file ...`));
    try {
        fs.writeFileSync(geometryTarget, output.css, { encoding: 'utf8' });
        console.log(success(`Done writing CSS to file ${geometryTarget}!`));
        console.info(info(`Sourcemap:`, output.map));
        console.info(info(`Imported files: [\n   `, output.imports.join(',\n    '), '\n]'));
    } catch(e) {
        console.error(err(`ERROR: Error on writing ${geometryTarget}: ${e.name}`));
        console.error(err(e.message));
    }
},
function(error) {
    if(error) {
        console.error(err(`ERROR: Could not compile ${geometryFile}: ${error.name}`));
        console.error(err(error.message));
    }
});
