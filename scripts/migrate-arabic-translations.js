#!/usr/bin/env node

/**
 * Script to migrate improved Arabic translations from 2.3.0 (JSON) to 3.6.0 (PO)
 *
 * This script:
 * 1. Reads the improved ar-AR.json from 2.3.0
 * 2. Reads the en-US.json to create a mapping of keys to English text
 * 3. Reads the 3.6.0 ar-AR.po file
 * 4. Matches English msgid entries to JSON translations
 * 5. Fixes placeholder spacing (no space before %s)
 * 6. Replaces "Zettlr" with "زيتلر"
 * 7. Writes updated ar-AR.po
 */

const fs = require('fs')
const path = require('path')

// Paths
const AR_JSON_PATH = '/Users/orwa/repos/zettlr/static/lang/ar-AR.json'
const EN_JSON_PATH = '/Users/orwa/repos/zettlr/static/lang/en-US.json'
const PO_INPUT_PATH = '/Users/orwa/repos/Zettlr-official/static/lang/ar-AR.po'
const PO_OUTPUT_PATH = '/Users/orwa/repos/Zettlr-official/static/lang/ar-AR.po.new'

console.log('Loading files...')

// Load JSON files
const arJson = JSON.parse(fs.readFileSync(AR_JSON_PATH, 'utf8'))
const enJson = JSON.parse(fs.readFileSync(EN_JSON_PATH, 'utf8'))

// Build a map of English text → Arabic translation
const translationMap = new Map()

function buildMap(enObj, arObj, prefix = '') {
  for (const key in enObj) {
    if (key === 'metadata') continue

    const enValue = enObj[key]
    const arValue = arObj?.[key]

    if (typeof enValue === 'object' && !Array.isArray(enValue)) {
      buildMap(enValue, arValue, prefix + key + '.')
    } else if (typeof enValue === 'string') {
      // Map English text to Arabic translation
      if (arValue && typeof arValue === 'string') {
        translationMap.set(enValue, arValue)
      }
    }
  }
}

console.log('Building translation map...')
buildMap(enJson, arJson)
console.log(`Built map with ${translationMap.size} translations`)

// Read PO file
const poContent = fs.readFileSync(PO_INPUT_PATH, 'utf8')
const lines = poContent.split('\n')

console.log('Processing PO file...')

const output = []
let i = 0
let translatedCount = 0
let fixedPlaceholderCount = 0
let replacedZettlrCount = 0

while (i < lines.length) {
  const line = lines[i]

  // Check if this is a msgid line
  if (line.startsWith('msgid "') && !line.startsWith('msgid ""')) {
    // Extract the msgid value
    let msgid = line.substring(7, line.length - 1) // Remove 'msgid "' and trailing '"'

    // Handle multi-line msgids
    let j = i + 1
    while (j < lines.length && lines[j].startsWith('"')) {
      msgid += lines[j].substring(1, lines[j].length - 1)
      j++
    }

    // Unescape the msgid
    msgid = msgid.replace(/\\"/g, '"').replace(/\\n/g, '\n')

    // Output the msgid line(s)
    output.push(line)
    for (let k = i + 1; k < j; k++) {
      output.push(lines[k])
    }

    // Now check for msgstr
    i = j
    if (i < lines.length && lines[i].startsWith('msgstr "')) {
      const currentMsgstr = lines[i].substring(8, lines[i].length - 1)

      // Check if we have a translation for this msgid
      let translation = translationMap.get(msgid)

      // If not found, check with normalized whitespace
      if (!translation) {
        const normalizedMsgid = msgid.replace(/\s+/g, ' ').trim()
        for (const [key, value] of translationMap.entries()) {
          if (key.replace(/\s+/g, ' ').trim() === normalizedMsgid) {
            translation = value
            break
          }
        }
      }

      if (translation) {
        // Fix placeholder spacing: remove space before %s, %d, etc.
        const originalTranslation = translation
        translation = translation.replace(/\s+%([sd])/g, '%$1')
        if (translation !== originalTranslation) {
          fixedPlaceholderCount++
        }

        // Replace "Zettlr" with "زيتلر"
        if (translation.includes('Zettlr')) {
          translation = translation.replace(/Zettlr/g, 'زيتلر')
          replacedZettlrCount++
        }

        // Escape the translation for PO format
        translation = translation.replace(/"/g, '\\"').replace(/\n/g, '\\n')

        output.push(`msgstr "${translation}"`)
        translatedCount++
      } else if (currentMsgstr === '') {
        // Keep empty msgstr
        output.push(lines[i])
      } else {
        // Keep existing translation but fix it
        let existingTranslation = currentMsgstr.replace(/\\"/g, '"').replace(/\\n/g, '\n')

        // Fix placeholder spacing
        const originalExisting = existingTranslation
        existingTranslation = existingTranslation.replace(/\s+%([sd])/g, '%$1')
        if (existingTranslation !== originalExisting) {
          fixedPlaceholderCount++
        }

        // Replace "Zettlr" with "زيتلر"
        if (existingTranslation.includes('Zettlr')) {
          existingTranslation = existingTranslation.replace(/Zettlr/g, 'زيتلر')
          replacedZettlrCount++
        }

        // Re-escape
        existingTranslation = existingTranslation.replace(/"/g, '\\"').replace(/\\n/g, '\\n')
        output.push(`msgstr "${existingTranslation}"`)
      }

      i++
      continue
    }
  }

  output.push(line)
  i++
}

// Write output
console.log('Writing updated PO file...')
fs.writeFileSync(PO_OUTPUT_PATH, output.join('\n'), 'utf8')

console.log('\nDone!')
console.log(`- Translated: ${translatedCount} entries`)
console.log(`- Fixed placeholders: ${fixedPlaceholderCount} entries`)
console.log(`- Replaced Zettlr→زيتلر: ${replacedZettlrCount} entries`)
console.log(`\nOutput written to: ${PO_OUTPUT_PATH}`)
console.log('\nPlease review the file, then run:')
console.log(`  mv "${PO_OUTPUT_PATH}" "${PO_INPUT_PATH}"`)
