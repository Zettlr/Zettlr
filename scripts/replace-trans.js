// This script can take files created by Zettlr translate and transform them
// to a po-file. NOTE: This script is for debug purposes and can be removed once
// the gettext branch will be merged to develop.

const fs = require('fs')
const path = require('path')
const { po } = require('gettext-parser')

// The main lang JSON file
const ROOTDIR = path.resolve(__dirname, '..')
const REFERENCE_FILE = `${ROOTDIR}/static/debug_i18n_strings.json`
// Read in that file
const reference = JSON.parse(fs.readFileSync(REFERENCE_FILE, 'utf-8'))
// Now we can do reference[identifier] to retrieve whichever string is present in a
// do-file.

function parseLangFile (language) {
  // This file takes the given language (e.g. de-DE), reads it in and transforms
  // it so that it returns a dictionary that maps msgids to msgstrs.
  const filePath = `${ROOTDIR}/static/lang/${language}.json`
  const contents = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const dict = explodeStrings(contents)
  // Now we have old-ids --> translations. We need to get it to
  // new-ids --> translations. Therefore we need the json object
  const output = Object.create(null)
  for (const key in dict) {
    output[reference[key]] = dict[key]
  }

  // Return the object that maps new ids to translations
  return output
}

function explodeStrings (json, namespace = '', i18n = Object.create(null)) {
  for (const prop in json) {
    if (prop === 'metadata') {
      continue // We can ignore the metadata here
    }

    let actualProp = prop
    if (namespace !== '') {
      actualProp = namespace + '.' + prop
    }

    if (typeof json[prop] === 'string') {
      i18n[actualProp] = json[prop]
    } else {
      explodeStrings(json[prop], actualProp, i18n)
    }
  }

  return i18n
}

function transformFile (language) {
  // This function takes a language (e.g. fr-FR) and transforms the JSON file
  // into a corresponding PO file

  // First, get the correct msgid --> msgstr mapping
  const lang = parseLangFile(language)

  // Then, import the reference language file so that all headers are there and
  // we can just override the msgstr properties
  const referenceFile = po.parse(fs.readFileSync(`${ROOTDIR}/static/lang/en-US.po`))
  // Adapt the Language property
  referenceFile.headers.Language = language
  // And now, basically do this for the translations
  const i18narray = referenceFile.translations['']
  for (const tr of Object.values(i18narray)) {
    if (tr.msgid in lang) {
      tr.msgstr = [lang[tr.msgid]]
    } else {
      tr.msgstr = []
    }
  }

  fs.writeFileSync(`${ROOTDIR}/static/lang/${language}.po`, po.compile(referenceFile))
}

// Replace all translations we have (except the en-US one)
const langs = [
  'ar-AR', 'ca-CA', 'cs-CZ', 'da-DA', 'de-DE', 'en-GB', 'eo-EO', 'es-ES',
  'et-ET', 'eu-EU', 'fi-FI', 'fr-FR', 'hu-HU', 'id-ID', 'it-IT', 'ja-JP',
  'ko-KO', 'nl-NL', 'pl-PL', 'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sv-SV',
  'tr-TR', 'uk-UK', 'vi-VI', 'zh-CN', 'zh-TW'
]
for (const lang of langs) {
  transformFile(lang)
}
