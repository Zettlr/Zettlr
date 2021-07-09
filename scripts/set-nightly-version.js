/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Utility Script
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This script bumps the version contained in the package.json
 *                  to a nightly one. DO NOT RUN THIS SCRIPT MANUALLY. This
 *                  script should only be run in the build workflow to generate
 *                  nightlies. It modifies the package.json but these changes
 *                  MUST NOT BE COMMITTED!
 *
 * END HEADER
 */

const fs = require('fs')
const path = require('path')
const pkg = require('../package.json')

// Just don't run this script, would ya? :)
console.error('WARNING: BUMPING VERSION TO NIGHTLY! IF YOU RAN THIS SCRIPT, REVERT THE CHANGES TO PACKAGE.JSON IMMEDIATELY!')

const now = new Date()

const year = now.getFullYear()
let month = now.getMonth() + 1
let day = now.getDate()

if (month < 10) {
  month = '0' + String(month)
}

if (day < 10) {
  day = '0' + String(day)
}

// This yields something in the format of 2.0.0+nightly-20211006
// Note the "+" that will make the nightly to be higher-ranked than 2.0.0
// according to semver (which Zettlr uses internally to compare update versions)
pkg.version = pkg.version + '+nightly-' + year + month + day

// Write the package.json back.
fs.writeFileSync(path.join(__dirname, '../package.json'), JSON.stringify(pkg), { encoding: 'utf8' })
