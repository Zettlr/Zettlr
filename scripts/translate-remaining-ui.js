#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PO_PATH = path.join(__dirname, '../static/lang/ar-AR.po')

// Extended translation map
const TRANSLATIONS = {
  // Search and results
  '%s matches across %s files': '%s تطابقات في%s ملفات',
  'Table size: %s &times; %s': 'حجم الجدول:%s×%s',
  'No results for "%s"': 'لا توجد نتائج لـ "%s"',
  'Searching: %s': 'البحث:%s',

  // Export and conversion
  'Conversion': 'التحويل',
  'Files to be included in the export': 'الملفات التي سيتم تضمينها في التصدير',
  'Please select at least one profile to build this project.': 'يرجى تحديد ملف تعريف واحد على الأقل لبناء هذا المشروع.',
  'CSL Stylesheet': 'ورقة أنماط CSL',
  'LaTeX Template': 'قالب LaTeX',
  'HTML Template': 'قالب HTML',
  'Remove file from export': 'إزالة الملف من التصدير',
  'Add file to export': 'إضافة ملف للتصدير',
  'Move file up': 'نقل الملف لأعلى',
  'Move file down': 'نقل الملف لأسفل',
  'You have not selected any files for export.': 'لم تحدد أي ملفات للتصدير.',

  // Preference sections
  'File Manager': 'مدير الملفات',
  'Import and Export': 'الاستيراد والتصدير',
  'Zettelkasten IDs': 'معرفات صندوق الملاحظات',
  'Available Variables: %s': 'المتغيرات المتاحة:%s',
  'Link with filename only': 'الربط باسم الملف فقط',
  'Link format': 'تنسيق الرابط',
  '[[Link|Title]]: Link first (recommended)': '[[رابط|عنوان]]: الرابط أولاً (مستحسن)',
  '[[Title|Link]]: Title first': '[[عنوان|رابط]]: العنوان أولاً',
  'The search string will match the content between the brackets: [[ ]].': 'سيطابق نص البحث المحتوى بين الأقواس: [[ ]].',
  'For this to work, the folder must be open as a Workspace in Zettlr.': 'لكي يعمل هذا، يجب أن يكون المجلد مفتوحًا كمساحة عمل في زيتلر.',
  'Path to folder': 'مسار المجلد',

  // AutoCorrect
  'Smart quotes': 'علامات اقتباس ذكية',
  'Text-replacement patterns': 'أنماط استبدال النص',
  'Match whole words': 'مطابقة الكلمات الكاملة',
  'When checked, AutoCorrect will never replace parts of words': 'عند التحديد، لن يستبدل التصحيح التلقائي أجزاء من الكلمات أبدًا',
  'With': 'بـ',

  // Image sizing
  'Maximum width of images (%s %)': 'أقصى عرض للصور (%s%%)',
  'Maximum height of images (%s %)': 'أقصى ارتفاع للصور (%s%%)',

  // Toolbar
  'On': 'تشغيل',
  'End': 'النهاية',
  'Toolbar options': 'خيارات شريط الأدوات',
  'Left section': 'القسم الأيسر',
  'Display "Open settings" button': 'عرض زر "فتح الإعدادات"',
  'Display "New file" button': 'عرض زر "ملف جديد"',
  'Display "Previous file" button': 'عرض زر "الملف السابق"',
  'Display "Next file" button': 'عرض زر "الملف التالي"',
  'Display "Toggle readability mode" button': 'عرض زر "تبديل وضع سهولة القراءة"',
  'Display "Insert comment" button': 'عرض زر "إدراج تعليق"',
  'Display "Insert link" button': 'عرض زر "إدراج رابط"',
  'Display "Insert image" button': 'عرض زر "إدراج صورة"',
  'Display "Convert selection to task list" button': 'عرض زر "تحويل التحديد إلى قائمة مهام"',
  'Display "Insert table" button': 'عرض زر "إدراج جدول"',
  'Display "Insert footnote" button': 'عرض زر "إدراج حاشية"',
  'Display "Pomodoro timer" button': 'عرض زر "مؤقت بومودورو"',
  'Center section': 'القسم الأوسط',
  'Display document info': 'عرض معلومات المستند',

  // File manager modes
  'Thin': 'رفيع',
  'Expanded': 'موسع',
  'Combined': 'مدمج',

  // Display modes
  'Filename': 'اسم الملف',
  'Title': 'العنوان',
  'Heading': 'العنوان الرئيسي',
  'Title + Heading': 'العنوان + العنوان الرئيسي',

  // Sorting
  'Natural': 'طبيعي',
  'ASCII': 'ASCII',

  // Metadata
  'Modification time': 'وقت التعديل',
  'Creation time': 'وقت الإنشاء',

  // Distraction-free mode
  'Mute non-focused lines in distraction-free mode': 'كتم الأسطر غير المركزة في الوضع الخالي من التشتيت',

  // Indentation
  'Indent using tabs instead of spaces': 'استخدام التبويب بدلاً من المسافات للمسافة البادئة',
  'Indentation size (number of spaces)': 'حجم المسافة البادئة (عدد المسافات)',

  // Autocomplete
  'Suggest emojis during autocompletion': 'اقتراح الرموز التعبيرية أثناء الإكمال التلقائي',
  'Automatically close matching character pairs': 'إغلاق أزواج الأحرف المتطابقة تلقائيًا',

  // Count mode
  'Count characters instead of words (e.g., for Chinese)': 'عد الأحرف بدلاً من الكلمات (مثل اللغة الصينية)',

  // Citations
  'How would you like autocomplete to insert your citations?': 'كيف تريد للإكمال التلقائي إدراج استشهاداتك؟',
  'Path to file': 'مسار الملف',

  // Common messages
  'Replace tag "%s" with "%s" across %s files?': 'استبدال الوسم "%s" بـ "%s" في%s ملفات؟',
  'Cannot open workspace "%s".': 'تعذر فتح مساحة العمل "%s".',
  'Project "%s" successfully exported. Click to show.': 'تم تصدير المشروع "%s" بنجاح. انقر للعرض.',

  // Multiline strings
  'Check to enable live rendering of various Markdown elements to formatted appearance. This hides formatting characters (such as **text**) or renders images instead of their link.': 'حدد لتفعيل العرض المباشر لعناصر Markdown المختلفة بمظهر منسق. يخفي هذا أحرف التنسيق (مثل **نص**) أو يعرض الصور بدلاً من روابطها.',
  'The Table Editor is an interactive interface that simplifies creation and editing of tables. It provides buttons for common functionality, and takes care of Markdown formatting.': 'محرر الجداول هو واجهة تفاعلية تبسط إنشاء الجداول وتحريرها. يوفر أزرارًا للوظائف الشائعة، ويعتني بتنسيق Markdown.',
  'The input mode determines how you interact with the editor. We recommend keeping this setting at "Normal". Only choose "Vim" or "Emacs" if you know what this implies.': 'يحدد وضع الإدخال كيفية تفاعلك مع المحرر. نوصي بالاحتفاظ بهذا الإعداد على "عادي". اختر فقط "Vim" أو "Emacs" إذا كنت تعرف ما يعنيه ذلك.',
  'Table Editor': 'محرر الجداول',
  'Distraction-free mode': 'وضع خالٍ من التشتيت',
  'General': 'عام',
  'Editor': 'المحرر',
  'Export': 'التصدير',
  'Citations': 'الاستشهادات',
  'Zettelkasten': 'صندوق الملاحظات',
  'AutoCorrect': 'التصحيح التلقائي',
  'Advanced': 'متقدم'
}

console.log('Loading ar-AR.po file...')
let content = fs.readFileSync(PO_PATH, 'utf8')

let translatedCount = 0

// Process translations
for (const [english, arabic] of Object.entries(TRANSLATIONS)) {
  // Create regex pattern for single-line msgid
  const singleLinePattern = new RegExp(
    `(msgid "${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\n)(msgstr "")`,
    'gm'
  )

  if (content.match(singleLinePattern)) {
    content = content.replace(singleLinePattern, `$1msgstr "${arabic}"`)
    translatedCount++
    console.log(`✓ "${english.substring(0, 60)}${english.length > 60 ? '...' : ''}"`)
  }
}

// Write updated content
fs.writeFileSync(PO_PATH, content, 'utf8')

console.log(`\n✅ Translated ${translatedCount} additional strings`)
console.log(`📝 Total in ar-AR.po`)
