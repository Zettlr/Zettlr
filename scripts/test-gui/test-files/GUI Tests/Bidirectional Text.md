# Bidirectional Text

This file exercises the bidi/Arabic typing support (spec §1 acceptance criteria).

## Pure paragraphs

This is a plain English paragraph. It must render exactly as before, left-to-right, with no visible change.

هذه فقرة عربية خالصة. يجب أن تُعرض من اليمين إلى اليسار، وأن تكون علامات الترقيم في نهاية الجملة على الجانب الأيسر.

## Mixed paragraphs

في هذه الفقرة نستخدم مصطلح Markdown وكذلك اسم CodeMirror داخل جملة عربية، ويجب أن يبقى المؤشر متوقعاً عند التحرك بالأسهم.

This English paragraph mentions the Arabic word السلام in the middle of a Latin sentence.

## Inline syntax inside Arabic

- نص **غامق بالعربية** ونص **bold in English** في سطر واحد.
- شيفرة مضمّنة: `let x = 1` داخل جملة عربية.
- رابط بعنوان عربي: [مقدمة في التحرير](https://example.com/intro) — يجب أن تظهر الأقواس في مواضعها الصحيحة.
- رابط ويكي: [[ملاحظات عربية]] داخل الجملة.
- وسم: #تجربة في نهاية السطر.

## Headings

### عنوان عربي من المستوى الثالث

### English level-three heading

## Frontmatter override

Create a copy of this file and add `direction: rtl` to a YAML frontmatter, or
use the statusbar toggle (bottom right) — empty lines and neutral lines should
then also align right.
