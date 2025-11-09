#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PO_PATH = path.join(__dirname, '../static/lang/ar-AR.po')

console.log('Loading ar-AR.po...')
let content = fs.readFileSync(PO_PATH, 'utf8')

let fixCount = 0

// Fix 1: Replace Arabic percent signs (٪) with regular percent signs (%)
const arabicPercentPattern = /msgstr "([^"]*?)٪/g
const arabicPercentMatches = content.match(arabicPercentPattern)
if (arabicPercentMatches) {
  content = content.replace(/٪/g, '%')
  fixCount += arabicPercentMatches.length
  console.log(`✓ Fixed ${arabicPercentMatches.length} Arabic percent signs (٪ → %)`)
}

// Fix 2: Remove spaces before 's' and 'd' in placeholders (% s → %s, % d → %d)
const spacedPlaceholderPattern = /msgstr "([^"]*?)%\s+([sd])/g
const spacedMatches = content.match(spacedPlaceholderPattern)
if (spacedMatches) {
  content = content.replace(spacedPlaceholderPattern, 'msgstr "$1%$2')
  fixCount += spacedMatches.length
  console.log(`✓ Fixed ${spacedMatches.length} spaced placeholders (% s → %s, % d → %d)`)
}

// Fix 3: Remove any non-breaking spaces or other Unicode spaces around placeholders
content = content.replace(/msgstr "([^"]*?)%[\u00A0\u200B\u202F\s]+([sd])/g, 'msgstr "$1%$2')
console.log('✓ Removed Unicode spacing variants around placeholders')

// Write the fixed content
fs.writeFileSync(PO_PATH, content, 'utf8')

console.log(`\n✅ Fixed ${fixCount} placeholder issues`)
console.log(`📝 Updated: ${PO_PATH}`)
