#!/usr/bin/env node

/**
 * Post-process ar-AR.po.new to replace remaining "Zettlr" with "زيتلر"
 */

const fs = require('fs')

const PO_PATH = '/Users/orwa/repos/Zettlr-official/static/lang/ar-AR.po.new'

console.log('Reading PO file...')
const content = fs.readFileSync(PO_PATH, 'utf8')
const lines = content.split('\n')

let replacedCount = 0
const output = []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  // Only process msgstr lines that contain Arabic text and "Zettlr"
  if (line.startsWith('msgstr "') && line.includes('Zettlr')) {
    // Check if line contains Arabic characters
    if (/[\u0600-\u06FF]/.test(line)) {
      const newLine = line.replace(/Zettlr/g, 'زيتلر')
      if (newLine !== line) {
        replacedCount++
        output.push(newLine)
        continue
      }
    }
  }

  output.push(line)
}

console.log('Writing updated file...')
fs.writeFileSync(PO_PATH, output.join('\n'), 'utf8')

console.log(`\nDone! Replaced "Zettlr" with "زيتلر" in ${replacedCount} entries.`)
