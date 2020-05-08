// This simple script downloads the default languages from Zettlr Translate
const got = require('got')
const fs = require('fs')
const path = require('path')
const log = require('./console-colour.js')

const targetDir = path.join(__dirname, '../source/common/lang')

const bcp47 = [
  'de-DE',
  'en-GB',
  'en-US',
  'fr-FR'
]

log.info(`Refreshing language files for ${bcp47.join(', ')} ...`)

for (let lang of bcp47) {
  got(`https://translate.zettlr.com/download/${lang}.json`).then((data) => {
    log.success(`${lang} successfully downloaded!`)
    // Write to file
    fs.writeFile(path.join(targetDir, lang + '.json'), data.body, 'utf8', (err) => {
      if (err) return log.error(err)
      log.success(`${lang} successfully written to file!`)
    })
  }).catch((err) => {
    if (err) log.error(err)
    // We have to exit the process with an
    // error signal for correct behaviour on CI
    process.exit(1)
  })
}
