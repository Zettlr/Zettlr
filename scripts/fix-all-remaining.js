#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PO_PATH = path.join(__dirname, '../static/lang/ar-AR.po')

const TRANSLATIONS = {
  // Export - fix the spacing issue in "تصدير إلى % s"
  'Export to %s': 'تصدير إلى%s',

  // General settings - Behavior
  'Behavior': 'السلوك',
  'Behaviour': 'السلوك',

  // General settings - Updates
  'Updates': 'التحديثات',
  'Automatically check for updates': 'التحقق من التحديثات تلقائيًا',

  // Appearance - Toolbar sections
  'Right section': 'القسم الأيمن',

  // Status bar
  'Status bar': 'شريط الحالة',
  'Display status bar': 'عرض شريط الحالة',

  // Writing direction description
  'We are currently planning on re-introducing bidirectional writing support, which will then be configurable here.': 'نخطط حاليًا لإعادة تقديم دعم الكتابة ثنائية الاتجاه، والتي ستكون قابلة للتكوين هنا.',

  // LanguageTool (الملف الإملائي) - all the untranslated parts
  'Strictness': 'الصرامة',
  'Standard': 'عادي',
  'Picky': 'دقيق',
  'Mother language': 'اللغة الأم',
  'Preferred Variants': 'المتغيرات المفضلة',
  'LanguageTool cannot distinguish certain language\'s variants. These settings will nudge LanguageTool to auto-detect your preferred variant of these languages.': 'لا يمكن لـ LanguageTool التمييز بين متغيرات لغات معينة. ستساعد هذه الإعدادات LanguageTool على اكتشاف المتغير المفضل لديك تلقائيًا لهذه اللغات.',
  'Interpret English as': 'تفسير الإنجليزية على أنها',
  'Interpret German as': 'تفسير الألمانية على أنها',
  'Interpret Portuguese as': 'تفسير البرتغالية على أنها',
  'Interpret Catalan as': 'تفسير الكتالانية على أنها',
  'LanguageTool Provider': 'مزود LanguageTool',
  'Official': 'رسمي',
  'Custom': 'مخصص',
  'LanguageTool Premium': 'LanguageTool المتقدم',
  'Zettlr will ignore the "LanguageTool provider" settings if you enter any credentials here.': 'سيتجاهل زيتلر إعدادات "مزود LanguageTool" إذا أدخلت أي بيانات اعتماد هنا.',
  'LanguageTool Username': 'اسم مستخدم LanguageTool',
  'Username': 'اسم المستخدم',
  'LanguageTool API key': 'مفتاح API لـ LanguageTool',
  'API key': 'مفتاح API',

  // Import/Export
  'Destination folder for exported files': 'مجلد الوجهة للملفات المصدرة',
  'Temporary folder': 'مجلد مؤقت',
  'Ask for folder when exporting': 'السؤال عن المجلد عند التصدير',
  'Warning! Files in the temporary folder are regularly deleted. Choosing the same location as the file overwrites files with identical filenames if they already exist.': 'تحذير! يتم حذف الملفات في المجلد المؤقت بانتظام. اختيار نفس موقع الملف يستبدل الملفات بأسماء ملفات متطابقة إذا كانت موجودة بالفعل.',
  'Enter custom commands to run the exporter with. Each command receives as its first argument the file or project folder to be exported.': 'أدخل أوامر مخصصة لتشغيل المصدر بها. يتلقى كل أمر كوسيطة أولى الملف أو مجلد المشروع المراد تصديره.',

  // Advanced settings
  'Available variables:': 'المتغيرات المتاحة:',
  'Only available on Linux; this is the default for macOS and Windows.': 'متاح فقط على Linux؛ هذا هو الإعداد الافتراضي لـ macOS وWindows.',
  'Only available on macOS; makes the window background opaque.': 'متاح فقط على macOS؛ يجعل خلفية النافذة شفافة.',
  'Resizes the whole GUI': 'تغيير حجم الواجهة بالكامل',
  'File extensions to be visible in the Attachments sidebar': 'امتدادات الملفات المرئية في الشريط الجانبي للمرفقات',

  // Pandoc
  'Use Zettlr\'s internal Pandoc for exports': 'استخدام Pandoc الداخلي لزيتلر للتصدير'
}

console.log('Loading ar-AR.po...')
let content = fs.readFileSync(PO_PATH, 'utf8')

let count = 0

// Process translations
for (const [en, ar] of Object.entries(TRANSLATIONS)) {
  const escapedEn = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\\\?'")
  const pattern = new RegExp(
    `(msgid "${escapedEn}"\\n)(msgstr "")`,
    'gm'
  )

  if (content.match(pattern)) {
    content = content.replace(pattern, `$1msgstr "${ar}"`)
    count++
    console.log(`✓ "${en.substring(0, 60)}${en.length > 60 ? '...' : ''}"`)
  }
}

console.log('\n🔧 Fixing existing incorrect translations...')

// Fix "تصدير إلى % s" → "تصدير إلى%s"
const exportPattern = /msgstr "تصدير إلى\s*%\s*s"/g
if (content.match(exportPattern)) {
  content = content.replace(exportPattern, 'msgstr "تصدير إلى%s"')
  console.log('✓ Fixed "تصدير إلى % s" → "تصدير إلى%s"')
}

fs.writeFileSync(PO_PATH, content, 'utf8')

console.log(`\n✅ Translated ${count} strings`)
console.log('✅ Fixed spacing issues')
console.log(`📝 Updated: ${PO_PATH}`)
