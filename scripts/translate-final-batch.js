#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PO_PATH = path.join(__dirname, '../static/lang/ar-AR.po')

// Final batch of translations
const TRANSLATIONS = {
  // General settings
  'Application language': 'لغة التطبيق',
  'Default image folder': 'مجلد الصور الافتراضي',
  'The default folder to which images will be saved. Can be absolute, or relative to the current file.': 'المجلد الافتراضي الذي سيتم حفظ الصور فيه. يمكن أن يكون مطلقًا أو نسبيًا بالنسبة للملف الحالي.',

  // Display mode description
  'Controls how file names are displayed in the file list.': 'يتحكم في كيفية عرض أسماء الملفات في قائمة الملفات.',

  // Editor input mode description
  'The input mode determines how you interact with the editor. We recommend keeping this setting at "Normal". Only choose "Vim" or "Emacs" if you know what this implies.': 'يحدد وضع الإدخال كيفية تفاعلك مع المحرر. نوصي بالاحتفاظ بهذا الإعداد على "عادي". اختر فقط "Vim" أو "Emacs" إذا كنت تعرف ما يعنيه ذلك.',

  // Table editor description
  'The Table Editor is an interactive interface that simplifies creation and editing of tables. It provides buttons for common functionality, and takes care of Markdown formatting.': 'محرر الجداول هو واجهة تفاعلية تبسط إنشاء الجداول وتحريرها. يوفر أزرارًا للوظائف الشائعة ويعتني بتنسيق Markdown.',

  // Language Tool
  'Language tool': 'أداة اللغة',
  'Check your spelling and grammar using LanguageTool.': 'تحقق من الإملاء والقواعد باستخدام LanguageTool.',
  'Mother tongue': 'اللغة الأم',
  'Providing a mother tongue helps improve LanguageTool\'s suggestions.': 'يساعد تحديد اللغة الأم في تحسين اقتراحات LanguageTool.',
  'Preferred variants': 'المتغيرات المفضلة',
  'Use this to select your preferred variant for certain languages.': 'استخدم هذا لاختيار المتغير المفضل لديك لبعض اللغات.',
  'Language tool provider': 'مزود أداة اللغة',
  'Language tool premium': 'LanguageTool المتقدم',
  'Official': 'رسمي',
  'Custom': 'مخصص',

  // Snippets
  'Open snippets editor': 'فتح محرر المقتطفات',

  // Import/Export
  'Import and export profiles': 'ملفات تعريف الاستيراد والتصدير',
  'Open import profiles editor': 'فتح محرر ملفات تعريف الاستيراد',
  'Open export profiles editor': 'فتح محرر ملفات تعريف التصدير',
  'Custom export commands': 'أوامر التصدير المخصصة',
  'Define custom commands to run arbitrary exports.': 'حدد أوامر مخصصة لتشغيل عمليات تصدير تعسفية.',

  // Advanced settings
  'Attachments sidebar': 'الشريط الجانبي للمرفقات',
  'Configure which files should be displayed in the attachments sidebar.': 'حدد الملفات التي يجب عرضها في الشريط الجانبي للمرفقات.',
  'Iframe rendering whitelist': 'قائمة الإطارات المضمنة المسموحة',
  'Add domains that should be whitelisted for iframe rendering (one per line).': 'أضف النطاقات التي يجب إدراجها في قائمة الإطارات المضمنة المسموحة (واحد لكل سطر).',
  'Activate watchdog polling': 'تفعيل استطلاع المراقب',
  'If the filesystem does not emit events, activate polling to watch for external changes.': 'إذا لم يصدر نظام الملفات أحداثًا، فعّل الاستطلاع لمراقبة التغييرات الخارجية.',
  'Delete items irreversibly if moving them to trash fails': 'حذف العناصر نهائيًا إذا فشل نقلها إلى سلة المهملات',
  'If checked, items will be deleted permanently if they cannot be moved to trash.': 'إذا تم التحديد، سيتم حذف العناصر نهائيًا إذا تعذر نقلها إلى سلة المهملات.',
  'Beta releases': 'الإصدارات التجريبية',
  'Receive notifications about beta releases.': 'تلقي إشعارات حول الإصدارات التجريبية.',

  // Zettelkasten - use German term
  'Zettelkasten': 'Zettelkasten',

  // Display settings
  'Markdown document name display': 'عرض اسم مستند Markdown'
}

console.log('Loading ar-AR.po...')
let content = fs.readFileSync(PO_PATH, 'utf8')

let count = 0

// Process single-line translations
for (const [en, ar] of Object.entries(TRANSLATIONS)) {
  const pattern = new RegExp(
    `(msgid "${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\\\?'")}"\\n)(msgstr "")`,
    'gm'
  )

  if (content.match(pattern)) {
    content = content.replace(pattern, `$1msgstr "${ar}"`)
    count++
    console.log(`✓ "${en.substring(0, 50)}${en.length > 50 ? '...' : ''}"`)
  }
}

console.log('\n🔧 Fixing translation issues...')

// Fix 1: Remove "صندوق الملفات" prefix from Zettelkasten translations
// Change "صندوق الملفات Zettelkasten" to just "Zettelkasten"
const zettlrPattern = /msgstr "صندوق الملفات[  ]?(?:زيتلكاستن|Zettelkasten)"/g
const zettlrMatches = content.match(zettlrPattern)
if (zettlrMatches) {
  content = content.replace(zettlrPattern, 'msgstr "Zettelkasten"')
  console.log(`✓ Fixed ${zettlrMatches.length} Zettelkasten translations (removed صندوق الملفات prefix)`)
}

// Also fix standalone صندوق الملفات that should be Zettelkasten
content = content.replace(/msgid "Zettelkasten"\nmsgstr "صندوق الملفات"/g, 'msgid "Zettelkasten"\nmsgstr "Zettelkasten"')
console.log('✓ Replaced "صندوق الملفات" with "Zettelkasten"')

// Fix 2: Remove extra % in image size translations (50%% → 50%)
const doublePercentPattern = /msgstr "(.*?)%%"/g
const doublePercentMatches = content.match(doublePercentPattern)
if (doublePercentMatches) {
  content = content.replace(doublePercentPattern, 'msgstr "$1%"')
  console.log(`✓ Fixed ${doublePercentMatches.length} double-percent issues (%%→%)`)
}

// Fix 3: Remove spaces in %s placeholders (% s → %s, % d → %d)
const spacedPlaceholderPattern = /msgstr "([^"]*?)%\s+([sd])/g
const spacedMatches = content.match(spacedPlaceholderPattern)
if (spacedMatches) {
  content = content.replace(spacedPlaceholderPattern, 'msgstr "$1%$2"')
  console.log(`✓ Fixed ${spacedMatches.length} spaced placeholder issues (% s→%s)`)
}

// Also check for Arabic spaces (non-breaking space, etc.)
content = content.replace(/msgstr "([^"]*?)%[\u00A0\u200B\u202F\s]+([sd])/g, 'msgstr "$1%$2')
console.log('✓ Removed all spacing variants around placeholders')

fs.writeFileSync(PO_PATH, content, 'utf8')

console.log(`\n✅ Translated ${count} additional strings`)
console.log('✅ Fixed Zettelkasten terminology')
console.log('✅ Fixed double-percent issues')
console.log('✅ Fixed spaced placeholders')
console.log(`\n📝 Updated: ${PO_PATH}`)
