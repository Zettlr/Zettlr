// This simple script downloads the default languages from Zettlr Translate
import got from 'got'
import { writeFile } from 'fs'
import path from 'path'
import { info, success, error } from './console-colour.mjs'

const __dirname = process.platform === 'win32'
  ? path.dirname(decodeURI(import.meta.url.substring(8))) // file:///C:/...
  : path.dirname(decodeURI(import.meta.url.substring(7))) // file:///root/...
const targetDir = path.join(__dirname, '../static/lang')

got('https://translate.zettlr.com/api/languages')
  .then((response) => {
    const languages = JSON.parse(response.body)

    for (const language of languages) {
      info(`Downloading language ${language.bcp47} (${language.completion}%, updated ${language.updated_at.split('T')[0]})`)

      got(language.download_url)
        .then((data) => {
          success(`${language.bcp47} successfully downloaded!`)
          // Write to file
          writeFile(path.join(targetDir, language.bcp47 + '.json'), data.body, 'utf8', (err) => {
            if (err) {
              error(err)
              // We have to exit the process with an
              // error signal for correct behaviour on CI
              process.exit(1)
            }
            success(`${language.bcp47} successfully written to file!`)
          })
        }).catch((err) => {
          error(err)
          // We have to exit the process with an
          // error signal for correct behaviour on CI
          process.exit(1)
        })
    }
  })
  .catch((err) => {
    error(err)
    process.exit(1)
  })
