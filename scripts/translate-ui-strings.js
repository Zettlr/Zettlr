#!/usr/bin/env node

/**
 * Script to translate common UI strings from English to Arabic in ar-AR.po
 */

const fs = require('fs')
const path = require('path')

const PO_PATH = path.join(__dirname, '../static/lang/ar-AR.po')

// Comprehensive translation map for common UI strings
const TRANSLATIONS = {
  // Preferences categories
  'Appearance': 'المظهر',
  'File manager': 'مدير الملفات',
  'Markdown rendering': 'عرض Markdown',
  'Table Editor': 'محرر الجداول',
  'Distraction-free mode': 'وضع خالٍ من التشتيت',
  'Word counter': 'عداد الكلمات',
  'Readability mode': 'وضع سهولة القراءة',
  'Image size': 'حجم الصورة',
  'Other settings': 'إعدادات أخرى',

  // Rendering options
  'Render citations': 'عرض الاستشهادات',
  'Render iframes': 'عرض الإطارات المضمنة',
  'Render images': 'عرض الصور',
  'Render links': 'عرض الروابط',
  'Render formulae': 'عرض الصيغ الرياضية',
  'Render tasks': 'عرض المهام',
  'Render emphasis': 'عرض التشديد',

  // Preferences tabs
  'General': 'عام',
  'Editor': 'المحرر',
  'Zettelkasten': 'صندوق الملاحظات',
  'Export': 'التصدير',
  'Citations': 'الاستشهادات',
  'AutoCorrect': 'التصحيح التلقائي',
  'Advanced': 'متقدم',

  // Common actions
  'Changing this option requires a restart to take effect.': 'يتطلب تغيير هذا الخيار إعادة تشغيل التطبيق لتفعيله.',
  'Restart now': 'أعد التشغيل الآن',
  'Restart later': 'أعد التشغيل لاحقًا',
  'Confirm': 'تأكيد',
  'Yes': 'نعم',
  'No': 'لا',
  'Clear': 'مسح',
  'offline': 'غير متصل',

  // Update messages
  'Cannot check for update': 'تعذر التحقق من التحديثات',
  'There was an error while checking for updates. %s: %s': 'حدث خطأ أثناء التحقق من التحديثات. %s:%s',
  'Update available': 'يتوفر تحديث',
  'Open updater': 'فتح أداة التحديث',
  'Not now': 'ليس الآن',
  'The SHA256 checksums file seems to be missing for this release.': 'يبدو أن ملف مجاميع SHA256 مفقود لهذا الإصدار.',
  'Cannot retrieve SHA256 checksums: %s': 'تعذر استرجاع مجاميع SHA256:%s',
  'Could not accept data for application update: Write stream is gone.': 'تعذر قبول بيانات تحديث التطبيق: فُقد تدفق الكتابة.',
  'Could not start update. Please retry or update manually. Error was: %s': 'تعذر بدء التحديث. يرجى إعادة المحاولة أو التحديث يدويًا. الخطأ كان:%s',

  // File operations
  'Document too long': 'المستند طويل جدًا',
  'Update %s internal links to file %s?': 'تحديث%s روابط داخلية للملف%s؟',
  'Replace tag \"%s\" with \"%s\" across %s files?': 'استبدال الوسم "%s" بـ "%s" في%s ملفات؟',
  'Import directory': 'استيراد دليل',
  'Select folder': 'اختر مجلدًا',
  'Select import destination': 'اختر وجهة الاستيراد',
  'Project File Mismatch': 'عدم تطابق ملف المشروع',
  'Project \"%s\" successfully exported. Click to show.': 'تم تصدير المشروع "%s" بنجاح. انقر للعرض.',
  'Markdown Files': 'ملفات Markdown',
  'Code Files': 'ملفات التعليمات البرمجية',
  'Open workspace': 'فتح مساحة العمل',
  'Cannot open workpace': 'تعذر فتح مساحة العمل',
  'Cannot open workspace \"%s\".': 'تعذر فتح مساحة العمل "%s".',
  'Copy of %s': 'نسخة من%s',
  'Choose export destination': 'اختر وجهة التصدير',
  'Select import profile': 'اختر ملف تعريف الاستيراد',
  'There are multiple profiles that can import %s. Please choose one.': 'يوجد أكثر من ملف تعريف يمكنه استيراد%s. يرجى اختيار واحد.',

  // Menu items
  'Recent files': 'الملفات الأخيرة',
  'New file…': 'ملف جديد…',
  'Open file…': 'فتح ملف…',
  'Open workspace…': 'فتح مساحة عمل…',
  'Tags Manager': 'مدير الوسوم',
  'Find in current file': 'البحث في الملف الحالي',
  'Search all files': 'البحث في كل الملفات',
  'Additional information': 'معلومات إضافية',
  'Typewriter mode': 'وضع الآلة الكاتبة',
  'Toggle File Manager': 'تبديل مدير الملفات',
  'View logs': 'عرض السجلات',
  'Support Zettlr ↗︎': 'دعم زيتلر ↗︎',
  'Visit website ↗︎': 'زيارة الموقع ↗︎',
  'Open user manual ↗︎': 'فتح دليل المستخدم ↗︎',
  'Open tutorial': 'فتح البرنامج التعليمي',

  // Editor preferences
  'Check to enable live rendering of various Markdown elements to formatted appearance. This hides formatting characters (such as **text**) or renders images instead of their link.': 'حدد لتفعيل العرض المباشر لعناصر Markdown المختلفة بمظهر منسق. يخفي هذا أحرف التنسيق (مثل **نص**) أو يعرض الصور بدلاً من روابطها.',
  'Formatting characters for bold and italics': 'أحرف التنسيق للخط العريض والمائل',
  'Check Markdown for style issues': 'التحقق من مشاكل الأسلوب في Markdown',

  // Table Editor
  'The Table Editor is an interactive interface that simplifies creation and editing of tables. It provides buttons for common functionality, and takes care of Markdown formatting.': 'محرر الجداول هو واجهة تفاعلية تبسط إنشاء الجداول وتحريرها. يوفر أزرارًا للوظائف الشائعة، ويعتني بتنسيق Markdown.',

  // Distraction-free
  'Mute non-focused lines in distraction-free mode': 'كتم الأسطر غير المركزة في الوضع الخالي من التشتيت',
  'Hide toolbar in distraction-free mode': 'إخفاء شريط الأدوات في الوضع الخالي من التشتيت',

  // Word counter
  'Count characters instead of words (e.g., for Chinese)': 'عد الأحرف بدلاً من الكلمات (مثل اللغة الصينية)',

  // Readability
  'Algorithm': 'الخوارزمية',

  // Image size
  'Maximum width of images (%s %%)': 'أقصى عرض للصور (%s%%)',
  'Maximum height of images (%s %%)': 'أقصى ارتفاع للصور (%s%%)',

  // Other settings
  'Font size': 'حجم الخط',
  'Indentation size (number of spaces)': 'حجم المسافة البادئة (عدد المسافات)',
  'Indent using tabs instead of spaces': 'استخدام علامات التبويب بدلاً من المسافات للمسافة البادئة',
  'Show formatting toolbar when text is selected': 'عرض شريط أدوات التنسيق عند تحديد النص',
  'Highlight whitespace': 'تمييز المسافات البيضاء',
  'Suggest emojis during autocompletion': 'اقتراح الرموز التعبيرية أثناء الإكمال التلقائي',
  'Show link previews': 'عرض معاينات الروابط',
  'Automatically close matching character pairs': 'إغلاق أزواج الأحرف المتطابقة تلقائيًا',

  // Citations
  'Citation database (CSL JSON or BibTex)': 'قاعدة بيانات الاستشهادات (CSL JSON أو BibTex)',
  'CSL style (optional)': 'نمط CSL (اختياري)',
  'Path to file': 'مسار الملف',
  'How would you like autocomplete to insert your citations?': 'كيف تريد للإكمال التلقائي إدراج استشهاداتك؟'
}

console.log('Loading ar-AR.po file...')
let content = fs.readFileSync(PO_PATH, 'utf8')
const lines = content.split('\n')

let translatedCount = 0

// Process translations
for (const [english, arabic] of Object.entries(TRANSLATIONS)) {
  // Escape special characters for regex
  const escapedEnglish = english
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%s/g, '%s')

  // Match msgid followed by empty msgstr
  const pattern = new RegExp(
    `(msgid "${escapedEnglish}"\\n)(msgstr "")`,
    'gm'
  )

  // Also handle multi-line msgid
  const multilinePattern = new RegExp(
    `(msgid ""\\n"${escapedEnglish.split(' ').join('" "\\n"')}"\\n)(msgstr "")`,
    'gm'
  )

  if (content.match(pattern)) {
    content = content.replace(pattern, `$1msgstr "${arabic}"`)
    translatedCount++
    console.log(`✓ Translated: "${english}"`)
  } else if (content.match(multilinePattern)) {
    const arabicMultiline = arabic
    content = content.replace(multilinePattern, `$1msgstr "${arabicMultiline}"`)
    translatedCount++
    console.log(`✓ Translated (multiline): "${english.substring(0, 40)}..."`)
  }
}

// Write updated content
fs.writeFileSync(PO_PATH, content, 'utf8')

console.log(`\n✅ Translated ${translatedCount} strings`)
console.log(`📝 Updated file: ${PO_PATH}`)
