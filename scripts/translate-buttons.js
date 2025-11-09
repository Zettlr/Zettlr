#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PO_PATH = path.join(__dirname, '../static/lang/ar-AR.po')

const TRANSLATIONS = {
  // Display buttons
  'Display "Open settings" button': 'عرض زر "فتح الإعدادات"',
  'Display "New file" button': 'عرض زر "ملف جديد"',
  'Display "Previous file" button': 'عرض زر "الملف السابق"',
  'Display "Next file" button': 'عرض زر "الملف التالي"',
  'Display "Readability mode" button': 'عرض زر "وضع سهولة القراءة"',
  'Display "Insert comment" button': 'عرض زر "إدراج تعليق"',
  'Display "Insert link" button': 'عرض زر "إدراج رابط"',
  'Display "Insert image" button': 'عرض زر "إدراج صورة"',
  'Display "Insert task list" button': 'عرض زر "إدراج قائمة مهام"',
  'Display "Insert table" button': 'عرض زر "إدراج جدول"',
  'Display "Insert footnote" button': 'عرض زر "إدراج حاشية"',
  'Display Pomodoro timer': 'عرض مؤقت بومودورو',
  'Display word/character counter': 'عرض عداد الكلمات/الأحرف',
  'Display mode': 'وضع العرض',
  'Display name': 'اسم العرض',
  'Display document info': 'عرض معلومات المستند',

  // Other display strings
  'Filename': 'اسم الملف',
  'Title': 'العنوان',
  'Heading': 'العنوان الرئيسي',
  'Title + Heading': 'العنوان + العنوان الرئيسي',
  'Natural': 'طبيعي',
  'Modification time': 'وقت التعديل',
  'Creation time': 'وقت الإنشاء',

  // Common UI
  'No results for "%s"': 'لا توجد نتائج لـ "%s"',
  'Font size': 'حجم الخط',
  'Indentation size (number of spaces)': 'حجم المسافة البادئة (عدد المسافات)',
  'Show formatting toolbar when text is selected': 'عرض شريط أدوات التنسيق عند تحديد النص',
  'Highlight whitespace': 'تمييز المسافات البيضاء',

  // Multiline messages
  'The input mode determines how you interact with the editor. We recommend keeping this setting at "Normal". Only choose "Vim" or "Emacs" if you know what this implies.': 'يحدد وضع الإدخال كيفية تفاعلك مع المحرر. نوصي بالاحتفاظ بهذا الإعداد على "عادي". اختر فقط "Vim" أو "Emacs" إذا كنت تعرف ما يعنيه ذلك.',
  'We are currently planning on re-introducing bidirectional writing support, which will then be configurable here.': 'نخطط حاليًا لإعادة تقديم دعم الكتابة ثنائية الاتجاه، والتي ستكون قابلة للتكوين هنا.'
}

console.log('Loading ar-AR.po...')
let content = fs.readFileSync(PO_PATH, 'utf8')

let count = 0

for (const [en, ar] of Object.entries(TRANSLATIONS)) {
  const pattern = new RegExp(
    `(msgid "${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\n)(msgstr "")`,
    'gm'
  )

  if (content.match(pattern)) {
    content = content.replace(pattern, `$1msgstr "${ar}"`)
    count++
    console.log(`✓ "${en.substring(0, 50)}${en.length > 50 ? '...' : ''}"`)
  }
}

fs.writeFileSync(PO_PATH, content, 'utf8')
console.log(`\n✅ Translated ${count} button/display strings`)
