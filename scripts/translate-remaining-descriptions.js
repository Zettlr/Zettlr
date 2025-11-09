#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PO_PATH = path.join(__dirname, '../static/lang/ar-AR.po')

console.log('Loading ar-AR.po...')
let content = fs.readFileSync(PO_PATH, 'utf8')

let count = 0

// Fix 1: The Thin mode description
const thinModePattern = /"The Thin mode shows your directories and files separately\. Select a "\n"directory to have its contents displayed in the file list\. Switch between "\n"file list and directory tree by clicking on directories or the arrow button "\n"which appears at the top left corner of the file list\."\nmsgstr ""/
if (content.match(thinModePattern)) {
  content = content.replace(
    thinModePattern,
    '"The Thin mode shows your directories and files separately. Select a "\n"directory to have its contents displayed in the file list. Switch between "\n"file list and directory tree by clicking on directories or the arrow button "\n"which appears at the top left corner of the file list."\nmsgstr "يعرض الوضع الرفيع الدلائل والملفات بشكل منفصل. اختر دليلاً لعرض محتوياته في قائمة الملفات. تبديل بين قائمة الملفات وشجرة الدلائل بالنقر على الدلائل أو زر السهم الذي يظهر في الركن الأيسر العلوي من قائمة الملفات."'
  )
  count++
  console.log('✓ The Thin mode description')
}

// Fix 2: Time display
const timeDisplayPattern = /msgid "Time display"\nmsgstr ""/g
if (content.match(timeDisplayPattern)) {
  content = content.replace(timeDisplayPattern, 'msgid "Time display"\nmsgstr "عرض الوقت"')
  count++
  console.log('✓ Time display')
}

// Fix 3: Show status bar
const showStatusBarPattern = /msgid "Show status bar"\nmsgstr ""/g
if (content.match(showStatusBarPattern)) {
  content = content.replace(showStatusBarPattern, 'msgid "Show status bar"\nmsgstr "عرض شريط الحالة"')
  count++
  console.log('✓ Show status bar')
}

// Fix 4: Click "Select folder..." description
const selectFolderPattern = /msgid "Click \\"Select folder\.\.\.\\" or type an absolute or relative path directly into the input field\."\nmsgstr ""/g
if (content.match(selectFolderPattern)) {
  content = content.replace(
    selectFolderPattern,
    'msgid "Click \\"Select folder...\\" or type an absolute or relative path directly into the input field."\nmsgstr "انقر على \\"اختر مجلد...\\" أو اكتب مسارًا مطلقًا أو نسبيًا مباشرة في حقل الإدخال."'
  )
  count++
  console.log('✓ Click "Select folder..." description')
}

// Fix 5: Check to enable live rendering description (multiline)
const liveRenderingPattern = /"Check to enable live rendering of various Markdown elements to formatted "\n"appearance\. This hides formatting characters \(such as \*\*text\*\*\) or renders "\n"images instead of their link\."\nmsgstr ""/
if (content.match(liveRenderingPattern)) {
  content = content.replace(
    liveRenderingPattern,
    '"Check to enable live rendering of various Markdown elements to formatted "\n"appearance. This hides formatting characters (such as **text**) or renders "\n"images instead of their link."\nmsgstr "حدد لتفعيل العرض المباشر لعناصر Markdown المختلفة بمظهر منسق. يخفي هذا أحرف التنسيق (مثل **نص**) أو يعرض الصور بدلاً من روابطها."'
  )
  count++
  console.log('✓ Check to enable live rendering description')
}

// Fix 6: Warning about temporary folder (multiline)
const warningPattern = /"Warning! Files in the temporary folder are regularly deleted\. Choosing the "\n"same location as the file overwrites files with identical filenames if they "\n"already exist\."\nmsgstr ""/
if (content.match(warningPattern)) {
  content = content.replace(
    warningPattern,
    '"Warning! Files in the temporary folder are regularly deleted. Choosing the "\n"same location as the file overwrites files with identical filenames if they "\n"already exist."\nmsgstr "تحذير! يتم حذف الملفات في المجلد المؤقت بانتظام. اختيار نفس موقع الملف يستبدل الملفات بأسماء ملفات متطابقة إذا كانت موجودة بالفعل."'
  )
  count++
  console.log('✓ Warning about temporary folder')
}

// Fix 7: Enter custom commands description (multiline)
const customCommandsPattern = /"Enter custom commands to run the exporter with\. Each command receives as "\n"its first argument the file or project folder to be exported\."\nmsgstr ""/
if (content.match(customCommandsPattern)) {
  content = content.replace(
    customCommandsPattern,
    '"Enter custom commands to run the exporter with. Each command receives as "\n"its first argument the file or project folder to be exported."\nmsgstr "أدخل أوامر مخصصة لتشغيل المصدر بها. يتلقى كل أمر كوسيطة أولى الملف أو مجلد المشروع المراد تصديره."'
  )
  count++
  console.log('✓ Enter custom commands description')
}

fs.writeFileSync(PO_PATH, content, 'utf8')

console.log(`\n✅ Translated ${count} description strings`)
console.log(`📝 Updated: ${PO_PATH}`)
