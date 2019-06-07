// This script extracts all IDs and classes from pre-generated CSS files.

const fs = require('fs')
const path = require('path')
const log = require('./console-colour.js')
const extract = require('string-extract-class-names')

log.info(`Starting CSS extractor-script`)

log.info(`Current working directory is ${process.cwd()}`)

const CSS_PATHS = [
    path.join(__dirname, '../source/common/assets/css/geometry.css'),
    path.join(__dirname, '../source/common/assets/css/theme-berlin.css'),
    path.join(__dirname, '../source/common/assets/css/theme-frankfurt.css')
]

// Make sure our files exist.
for (let p of CSS_PATHS) {
    try {
        log.info(`Testing for existence of precompiled library ${path.basename(p)}...`)
        fs.lstatSync(p)
    } catch (e) {
        log.warn(`File ${path.basename(p)} did not exist! Please run 'yarn less' first!`)
        process.exit(0)
    }
}

// Now extract all CSS class names and IDs
let cssDirectives = []
for (let p of CSS_PATHS) {
    log.info(`Concating file ${path.basename(p)} ...`)
    try {
        let cnt = fs.readFileSync(p, 'utf8')
        cnt = extract(cnt)
        log.info(`Extracted ${cnt.length} classes and IDs!`)
        cssDirectives = cssDirectives.concat(cnt)
    } catch (e) {
        log.error(`Could not extract IDs from file ${path.basename(p)}!`)
    }
}

// Now make unique
log.info(`Removing duplicates from array ...`)
cssDirectives = [...new Set(cssDirectives)]

log.success(`Done! Extracted ${cssDirectives.length} unique CSS classes and IDs!`)

// And save to file!
let newFile = path.join(__dirname, '../resources/css_list.md')
fs.writeFile(newFile, '- ' + cssDirectives.join('\n- ') + '\n', 'utf8', (err) => {
    if (err) log.error(`Could not write output file!`)
    else log.success(`Written result to /resources/css_list.md!`)
})