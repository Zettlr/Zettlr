#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PO_PATH = path.join(__dirname, '../static/lang/ar-AR.po')

console.log('Loading ar-AR.po...')
let content = fs.readFileSync(PO_PATH, 'utf8')

let count = 0

// Image 1 - Editor settings descriptions
const inputModePattern = /"The input mode determines how you interact with the editor\. We recommend "\n"keeping this setting at \\"Normal\\"\. Only choose \\"Vim\\" or \\"Emacs\\" if you "\n"know what this implies\."\nmsgstr ""/
if (content.match(inputModePattern)) {
  content = content.replace(
    inputModePattern,
    '"The input mode determines how you interact with the editor. We recommend "\n"keeping this setting at \\"Normal\\". Only choose \\"Vim\\" or \\"Emacs\\" if you "\n"know what this implies."\nmsgstr "يحدد وضع الإدخال كيفية تفاعلك مع المحرر. نوصي بالاحتفاظ بهذا الإعداد على \\"عادي\\". اختر فقط \\"Vim\\" أو \\"Emacs\\" إذا كنت تعرف ما يعنيه ذلك."'
  )
  count++
  console.log('✓ The input mode determines...')
}

const bidirectionalPattern = /"We are currently planning on re-introducing bidirectional writing support, "\n"which will then be configurable here\."\nmsgstr ""/
if (content.match(bidirectionalPattern)) {
  content = content.replace(
    bidirectionalPattern,
    '"We are currently planning on re-introducing bidirectional writing support, "\n"which will then be configurable here."\nmsgstr "نخطط حاليًا لإعادة تقديم دعم الكتابة ثنائية الاتجاه، والتي ستكون قابلة للتكوين هنا."'
  )
  count++
  console.log('✓ We are currently planning...')
}

// Image 2 - LanguageTool description
const languageToolVariantsPattern = /"LanguageTool cannot distinguish certain language's variants\. These settings "\n"will nudge LanguageTool to auto-detect your preferred variant of these "\n"languages\."\nmsgstr ""/
if (content.match(languageToolVariantsPattern)) {
  content = content.replace(
    languageToolVariantsPattern,
    '"LanguageTool cannot distinguish certain language\'s variants. These settings "\n"will nudge LanguageTool to auto-detect your preferred variant of these "\n"languages."\nmsgstr "لا يمكن لـ LanguageTool التمييز بين متغيرات لغات معينة. ستساعد هذه الإعدادات LanguageTool على اكتشاف المتغير المفضل لديك تلقائيًا لهذه اللغات."'
  )
  count++
  console.log('✓ LanguageTool cannot distinguish...')
}

const zettlrIgnorePattern = /"Zettlr will ignore the \\"LanguageTool provider\\" settings if you enter any "\n"credentials here\."\nmsgstr ""/
if (content.match(zettlrIgnorePattern)) {
  content = content.replace(
    zettlrIgnorePattern,
    '"Zettlr will ignore the \\"LanguageTool provider\\" settings if you enter any "\n"credentials here."\nmsgstr "سيتجاهل زيتلر إعدادات \\"مزود LanguageTool\\" إذا أدخلت أي بيانات اعتماد هنا."'
  )
  count++
  console.log('✓ Zettlr will ignore...')
}

// Image 3 - Zettelkasten internal links description
const internalLinksPattern = /"Internal links allow you to add an optional title, separated by a vertical "\n"bar character from the actual link target\. Here you can define the ordering of "\n"the two\."\nmsgstr ""/
if (content.match(internalLinksPattern)) {
  content = content.replace(
    internalLinksPattern,
    '"Internal links allow you to add an optional title, separated by a vertical "\n"bar character from the actual link target. Here you can define the ordering of "\n"the two."\nmsgstr "تسمح الروابط الداخلية بإضافة عنوان اختياري، مفصول بحرف شريط عمودي عن هدف الرابط الفعلي. هنا يمكنك تحديد ترتيب الاثنين."'
  )
  count++
  console.log('✓ Internal links allow you...')
}

// Image 4 - Advanced settings
const availableVariablesPattern = /msgid "Available variables:"\nmsgstr ""/g
if (content.match(availableVariablesPattern)) {
  content = content.replace(availableVariablesPattern, 'msgid "Available variables:"\nmsgstr "المتغيرات المتاحة:"')
  count++
  console.log('✓ Available variables:')
}

// Platform-specific descriptions
const linuxOnlyPattern = /"Only available on Linux; this is the default for macOS and Windows\."\nmsgstr ""/
if (content.match(linuxOnlyPattern)) {
  content = content.replace(
    linuxOnlyPattern,
    '"Only available on Linux; this is the default for macOS and Windows."\nmsgstr "متاح فقط على Linux؛ هذا هو الإعداد الافتراضي لـ macOS وWindows."'
  )
  count++
  console.log('✓ Only available on Linux...')
}

const macosOnlyPattern = /"Only available on macOS; makes the window background opaque\."\nmsgstr ""/
if (content.match(macosOnlyPattern)) {
  content = content.replace(
    macosOnlyPattern,
    '"Only available on macOS; makes the window background opaque."\nmsgstr "متاح فقط على macOS؛ يجعل خلفية النافذة معتمة."'
  )
  count++
  console.log('✓ Only available on macOS...')
}

fs.writeFileSync(PO_PATH, content, 'utf8')

console.log(`\n✅ Translated ${count} remaining strings`)
console.log(`📝 Updated: ${PO_PATH}`)
