# Special Syntax Highlighting

In this file certain edge cases are being tested so that they render as expected.

## Tag rendering

The following tags **should render as tags**

#this-tag **|** #another-tag **|** #hello **|** #test_test **|** ##tag-with-double-hashes **|** #tag-with-ending-hash# **|** #a-tag-with-ümläuts **|** ##笔记

The following tags **should not render as such, as they are not intended as tags!**

\#escaped-tag example.com/test#anchor-name someword#withahashinside !#negatedtag #tag–with-special-char #tag\@hey

## Link Rendering Edge Cases

The following represent edge cases when it comes to link rendering.

* https://en.wikipedia.org/wiki/Sexual_Desire_(book)#Perversion
* [Sexual Desire](https://en.wikipedia.org/wiki/Sexual_Desire_(book)#Perversion)
* https://www.google.com/search?q=organic+geometry&source=lnms&tbm=isch&sa=X&ved=0ahUKEwixsb253e7aAhWNzaQKHY0vCI0Q_AUICigB#imgrc=QUZUjzGBNUwQBM
* https://plato.stanford.edu/entries/schlegel/#LatLifHisRel
* http://www.foreignlanguageexpertise.com/polyliteracy.html#w

## Inline Link Rendering

The following Markdown-Links should be rendered with the respective internal inline elements rendered to HTML.

- [This is a **caption**](https://example.com)
- [This is a *caption*](https://example.com)
- [This is a __caption__](https://example.com)
- [This is a _caption_](https://example.com)
- [This is a ~~caption~~](https://example.com)
- [_Th**is** is_ a **caption**](https://example.com)
- [Th_is_ is a caption](https://example.com)

## Links in Braces Rendering

Here are some more links with brackets.

- ([Hello World](https://www.target.com/))
- ([Wikipedia-Style-Link within braces](https://en.wikipedia.org/wiki/Sexual_Desire_(book)))
- [Hello](https://de.wikipedia.org/Buch_(Print))

## Escaping of formattings

This should be a gender\*star. *This is italic*. The same for \_underlines: _test_. And now check \[ brackets and \@2011 citekeys.

\- Lists can also be escaped
- List item

Escaping of tags: \#tags #tag

\## Heading

Setext heading
\---

## Highlighting rendering

Lorem ipsum dolor sit amet, ::consectetuer:: adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium ==quis, sem. Nulla consequat== massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. ==Nullam:: dictum ::felis== eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a,
