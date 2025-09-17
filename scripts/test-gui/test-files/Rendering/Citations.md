---
# This file is self-contained in terms of reference items. It includes the
# citation items in the frontmatter so that this file is self-contained. This
# allows quickly running citeproc over this file to check how Pandoc parses
# these citations. These are the same items that are also contained in the
# test-database.
references:
- id: Marx1962
  author:
  - family: Marx
    given: Karl
  collection-title: Marx Engels Werke
  edition: '4'
  event-place: Berlin
  issued:
    date-parts:
    - - 1962
  language: de
  number-of-pages: '956'
  number-of-volumes: '43'
  publisher: Dietz
  publisher-place: Berlin
  source: Zotero
  title: 'Das Kapital. Kritik der politischen Ökonomie. Erster Band: Der Produktionsprozeß
    des Kapitals'
  title-short: Das Kapital. Erster Band
  type: book
  volume: '23'
- id: Marx2009
  author:
  - family: Marx
    given: Karl
  - family: Korsch
    given: Karl
  edition: Ungekürzte Ausg. nach der 2. Aufl. von 1872
  event-place: Köln
  ISBN: 978-3-86647-325-6
  issued:
    date-parts:
    - - 2009
  language: ger
  note: 'OCLC: 317290659'
  number-of-pages: '768'
  publisher: Anaconda
  publisher-place: Köln
  source: Gemeinsamer Bibliotheksverbund ISBN
  title: 'Das Kapital: Kritik der politischen Ökonomie'
  title-short: Das Kapital
  type: book
---

# Citation Test File

The citations in this file should render properly, as well as the references should show up in the sidebar.

Basic in-text citation:

Lorem ipsum [@Marx1962] dolor sit amet.

Basic in-text citation with suppress-author-flag:

Lorem ipsum [-@Marx1962] dolor sit amet.

Basic in-text citation with prefix:

Lorem ipsum [This is a prefix @Marx1962] dolor sit amet.

An erroneous in-text citation which has one part without a valid citekey:

Lorem ipsum [invalid citepart; some prefix @Marx1962, suffix] dolor sit amet.

Basic in-text citation with suffix:

Lorem ipsum [@Marx1962 very much a suffix] dolor sit amet.

As you can see, a locator will be detected due to the roman literal being preceded by a space. We can avoid this using standard Pandoc rules to explicitly define a (in this case empty) locator using bracket-notation:

Lorem ipsum [@Marx1962{} very much a suffix] dolor sit amet.

This will also work for bracketed citekeys (which may contain weird characters, such as URLs, which are supported by citeproc (no, not by Zettlr, don't get your hopes up, rewriting the citation parser is already a massive pita)):

Lorem ipsum [@{https://dx.doi.org/some/doi.12345}{} this is a suffix] dolor sit amet.

Multiple citekeys:

Lorem ipsum [@Marx1962; @Marx2009] dolor sit amet.

Multiple citekeys with prefix and suffix and one locator:

Lorem ipsum [This is a prefix @Marx1962 and a suffix; a second prefix -@Marx2009, 23-24 and a suffix] dolor sit amet.

With all bells and whistles:

Lorem ipsum [This is a prefix -@Marx1962, §§ 23-24, and this is a suffix] dolor sit amet.

Without suppress-author-flag:

Lorem ipsum [This is a prefix @Marx1962, §§ 23-24, and this is a suffix] dolor sit amet.

No explicit, but implicit locator:

Lorem ipsum [This is a prefix -@Marx1962, 23-24, and this is a suffix] dolor sit amet.

Implicit roman-numeral locator:

Lorem ipsum [This is a prefix -@Marx1962, iv-xx, and this is a suffix] dolor sit amet.

Explicit roman-numeral locator:

Lorem ipsum [This is a prefix -@Marx1962, pp. iiim-mci, and this is a suffix] dolor sit amet.

In-text citation which has no locator at the start, but one buried in the suffix which should not be detected as a locator (to avoid gobbling up meaningful information preceding it):

Lorem ipsum [@Marx1962, especially figure 3, and more] dolor sit amet.

Basic inline citation:

Lorem ipsum @Marx1962 dolor sit amet.

Inline citation with locator/suffix bracket:

Lorem ipsum @Marx1962 [§§ 23-24, and this is a suffix] dolor sit amet.

Inline citation with only locator:

Lorem ipsum @Marx1962 [23-24] dolor sit amet.

Inline citation with only suffix:

Lorem ipsum @Marx1962 [this is a suffix p. 234 and more] dolor sit amet.
