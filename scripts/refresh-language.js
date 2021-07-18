// This simple script downloads the default languages from Zettlr Translate
const got = require('got')
const fs = require('fs')
const path = require('path')
const log = require('./console-colour.js')

const targetDir = path.join(__dirname, '../static/lang')

got('https://translate.zettlr.com/api/languages')
  .then((response) => {
    const languages = JSON.parse(response.body)

    for (const language of languages) {
      log.info(`Downloading language ${language.bcp47} (${language.completion}%, updated ${language.updated_at.split('T')[0]})`)

      got(language.download_url)
        .then((data) => {
          log.success(`${language.bcp47} successfully downloaded!`)
          // Write to file
          fs.writeFile(path.join(targetDir, language.bcp47 + '.json'), data.body, 'utf8', (err) => {
            if (err) {
              log.error(err)
              // We have to exit the process with an
              // error signal for correct behaviour on CI
              process.exit(1)
            }
            log.success(`${language.bcp47} successfully written to file!`)
          })
        }).catch((err) => {
          log.error(err)
          // We have to exit the process with an
          // error signal for correct behaviour on CI
          process.exit(1)
        })
    }
  })
  .catch((err) => {
    log.error(err)
    process.exit(1)
  })
