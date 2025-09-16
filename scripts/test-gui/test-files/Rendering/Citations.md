# Citation Test File

The citations in this file should render properly, as well as the references should show up in the sidebar.

Basic in-text citation:

Lorem ipsum [@Marx1964] dolor sit amet.

Basic in-text citation with suppress-author-flag:

Lorem ipsum [-@Marx1964] dolor sit amet.

Basic in-text citation with prefix:

Lorem ipsum [This is a prefix @Marx1964] dolor sit amet.

Basic in-text citation with suffix:

Lorem ipsum [@Marx1964 this is a suffix] dolor sit amet.

As you can see, a locator will be detected due to the roman literal being preceded by a space. We can avoid this using standard Pandoc rules to explicitly define a (in this case empty) locator using bracket-notation:

Lorem ipsum [@Marx1964{} this is a suffix] dolor sit amet.

This will also work for bracketed citekeys (which may contain weird characters, such as URLs, which are supported by citeproc (no, not by Zettlr, don't get your hopes up, rewriting the citation parser is already a massive pita)):

Lorem ipsum [@{https://dx.doi.org/some/doi.12345}{} this is a suffix] dolor sit amet.

Multiple citekeys:

Lorem ipsum [@Marx1964; @Marx2009] dolor sit amet.

Multiple citekeys with prefix and suffix and one locator:

Lorem ipsum [This is a prefix @Marx1964 and a suffix; a second prefix -@Marx2009, 23-24 and a suffix] dolor sit amet.

With all bells and whistles:

Lorem ipsum [This is a prefix -@Marx1964, §§ 23-24, and this is a suffix] dolor sit amet.

Without suppress-author-flag:

Lorem ipsum [This is a prefix @Marx1964, §§ 23-24, and this is a suffix] dolor sit amet.

No explicit, but implicit locator:

Lorem ipsum [This is a prefix -@Marx1964, 23-24, and this is a suffix] dolor sit amet.

Implicit roman-numeral locator:

Lorem ipsum [This is a prefix -@Marx1964, iv-xx, and this is a suffix] dolor sit amet.

Explicit roman-numeral locator:

Lorem ipsum [This is a prefix -@Marx1964, pp. iiim-mci, and this is a suffix] dolor sit amet.

Basic inline citation:

Lorem ipsum @Marx1964 dolor sit amet.

Inline citation with locator/suffix bracket:

Lorem ipsum @Marx1964 [§§ 23-24, and this is a suffix] dolor sit amet.

Inline citation with only locator:

Lorem ipsum @Marx1964 [23-24] dolor sit amet.

Inline citation with only suffix:

Lorem ipsum @Marx1964 [this is a suffix] dolor sit amet.
