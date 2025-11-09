#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PO_PATH = path.join(__dirname, '../static/lang/ar-AR.po')

const TRANSLATIONS = {
  // Screenshot 1 - General settings
  'Click "Select folder..." or type an absolute or relative path directly into the input field.': 'انقر على "اختر مجلد..." أو اكتب مسارًا مطلقًا أو نسبيًا مباشرة في حقل الإدخال.',

  // Screenshot 2 - Appearance/Toolbar
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
  'Show status bar': 'عرض شريط الحالة',

  // Screenshot 3 - File Manager
  'The Thin mode shows your directories and files separately. Select a directory to have its contents displayed in the file list. Switch between file list and directory tree by clicking on directories or the arrow button which appears at the top left corner of the file list.': 'يعرض الوضع الرفيع الدلائل والملفات بشكل منفصل. اختر دليلاً لعرض محتوياته في قائمة الملفات. تبديل بين قائمة الملفات وشجرة الدلائل بالنقر على الدلائل أو زر السهم الذي يظهر في الركن الأيسر العلوي من قائمة الملفات.',
  'Time display': 'عرض الوقت',

  // Screenshot 4 - Editor settings
  'The input mode determines how you interact with the editor. We recommend keeping this setting at "Normal". Only choose "Vim" or "Emacs" if you know what this implies.': 'يحدد وضع الإدخال كيفية تفاعلك مع المحرر. نوصي بالاحتفاظ بهذا الإعداد على "عادي". اختر فقط "Vim" أو "Emacs" إذا كنت تعرف ما يعنيه ذلك.',
  'We are currently planning on re-introducing bidirectional writing support, which will then be configurable here.': 'نخطط حاليًا لإعادة تقديم دعم الكتابة ثنائية الاتجاه، والتي ستكون قابلة للتكوين هنا.',
  'Check to enable live rendering of various Markdown elements to formatted appearance. This hides formatting characters (such as **text**) or renders images instead of their link.': 'حدد لتفعيل العرض المباشر لعناصر Markdown المختلفة بمظهر منسق. يخفي هذا أحرف التنسيق (مثل **نص**) أو يعرض الصور بدلاً من روابطها.',

  // Screenshot 5 - Import/Export settings
  'Warning! Files in the temporary folder are regularly deleted. Choosing the same location as the file overwrites files with identical filenames if they already exist.': 'تحذير! يتم حذف الملفات في المجلد المؤقت بانتظام. اختيار نفس موقع الملف يستبدل الملفات بأسماء ملفات متطابقة إذا كانت موجودة بالفعل.',
  'Enter custom commands to run the exporter with. Each command receives as its first argument the file or project folder to be exported.': 'أدخل أوامر مخصصة لتشغيل المصدر بها. يتلقى كل أمر كوسيطة أولى الملف أو مجلد المشروع المراد تصديره.'
}

console.log('Loading ar-AR.po...')
let content = fs.readFileSync(PO_PATH, 'utf8')

let count = 0

// Process translations
for (const [en, ar] of Object.entries(TRANSLATIONS)) {
  const escapedEn = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\\\'?")

  // Try single-line pattern first
  const pattern = new RegExp(
    `(msgid "${escapedEn}"\\n)(msgstr "")`,
    'gm'
  )

  if (content.match(pattern)) {
    content = content.replace(pattern, `$1msgstr "${ar}"`)
    count++
    console.log(`✓ "${en.substring(0, 60)}${en.length > 60 ? '...' : ''}"`)
  } else {
    // Try multiline pattern
    // Split the English text into words and look for multiline msgid
    const words = en.split(' ')
    if (words.length > 5) {
      // For long strings, try to find them in multiline format
      const firstWords = words.slice(0, 3).join(' ')
      const multilinePattern = new RegExp(
        `msgid ""\\n"${firstWords.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?"\\nmsgstr ""`,
        'gm'
      )

      const match = content.match(multilinePattern)
      if (match) {
        // Found a multiline entry, replace it
        content = content.replace(multilinePattern, (matched) => {
          return matched.replace(/msgstr ""$/, `msgstr "${ar}"`)
        })
        count++
        console.log(`✓ (multiline) "${en.substring(0, 60)}..."`)
      }
    }
  }
}

fs.writeFileSync(PO_PATH, content, 'utf8')

console.log(`\n✅ Translated ${count} strings`)
console.log(`📝 Updated: ${PO_PATH}`)
