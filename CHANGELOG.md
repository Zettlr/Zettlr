# Upcoming

## Full TableEditor Rewrite

This release contains a full rewrite of the TableEditor. The old implementation
of the TableEditor had many bugs and inconveniences that made working with
Markdown tables barely less cumbersome than having to deal with raw Markdown
tables. Users criticized volatile data handling and experienced frequent data
loss. This is why we redesigned the TableEditor from the ground up. With this
release, we are finally able to give the new experience to you.

The most important improvement is that now data loss should be a thing of the
past. The new TableEditor makes full use of the available features of the editor
to keep the data as safe as possible. But we didn't want to stop there. Because
the TableEditor hadn't received a face lift in years, we asked ourselves what
else the TableEditor was missing.

From a user perspective, we have kept the design of the TableEditor as close to
the former UX as possible, while also fixing a few oddities. Specifically, the
buttons of the TableEditor have been fully redesigned to be more minimalist.
Also gone is the infamous "Save" button that was not able to help prevent data
loss. The new TableEditor now features proper syntax highlighting so that you
can more easily verify that you are authoring proper Markdown. In addition, the
new TableEditor is now faster, more memory efficient, and it should be simpler
to fill entire tables with data.

Lastly, one big improvement of the new TableEditor is that you don't have to use
it to be more efficient in authoring tables. Specifically, we decided to
implement all functionality fully keyboard-oriented. This means that for any
modification you may want to make there is now a shortcut. Adding and removing
rows and columns; clearing data from rows, columns, or the entire table;
aligning column text left, right, or center; swapping rows or columns; etc.
Anything is now possible either with the new built-in context menu, or a quick
keyboard shortcut.

There is only one thing we stopped to support: grid tables. Given that their
structure can be much more difficult to parse we wanted to err on the side of
caution. However, some keyboard shortcuts such as navigating between cells will
still work with grid tables. Since users will most of the time only edit simple
tables, we believe this to be an acceptable compromise — while not completely
ruling out supporting grid tables, especially since Pandoc has started heavily
investing in an improvement of their grid table support.

In any case, we hope that the new TableEditor will finally fix the issues you
experienced over the past years — and we would like to apologize that it took us
so long to fix all of these issues at once!

## Changes to the snippet `$FILENAME` variable

In this update, we have implemented a change in which the `$FILENAME` variable
no longer includes the filename extension. This means that, while `$FILENAME`
has in the past resolved to `my-file.md`, it will now only include `my-file`.

If you rely on the `$FILENAME`-variable in any of your snippets, please make
sure to update it by adding the variable `$EXTENSION` behind it. In other
words, everywhere you need only the filename without its extension, you can
keep `$FILENAME`, but wherever you need both the file name and its file
extension, please use `$FILENAME$EXTENSION`. (The latter variable includes
the leading period of the extension, so do not write `$FILENAME.$EXTENSION`.)

## Image Viewer and PDF Viewer

This update brings with it a great new feature for Zettlr: A built-in image
viewer and PDF viewer. Once you have selected in the settings that you wish to
open images or PDF files in Zettlr instead of the default behavior to open it
externally, Zettlr will open them in editor panes just like the editors. You can
rearrange them just like you can other files, and you have some options
available to inspect the files.

For images, the viewer offers various options to zoom and fit the images so that
you can view every detail of them while having other files open side-by-side.
In addition, the image viewer offers four background modes to accommodate
transparency and difficult-to-view colors in the images better: transparent
(the default), a black background, white background, and a translucent
checkerboard background.

The PDF viewer likewise allows you to preview PDF files using Chromium's built-
in PDF viewer that you may already know if you have opened PDF files in Google
Chrome or Edge. Due to restrictions in how this works, however, you will have to
manually "enable" such a viewer before being able to scroll it by clicking into
it. Whether an iframe is interactive is indicated by a small border around the
iframe.

Note that both image and PDF viewers are just that: viewers. As Zettlr is a text
app, we do not plan on implementing any ways of editing images or PDF files. To
annotate your PDF files, please continue using your existing workflow.

## New Citation Parser

This release of Zettlr ships with a fully rewritten citation parser. We have
decided to do so because the existing citation parser was very coarse. It would
only detect and indicate entire citation nodes, but it could not distinguish
between the various parts of citations (such as prefix, citekey, and suffix). In
addition, there were quite many inefficiencies in how Zettlr would parse
citations.

The new citation parser aims at fixing these issues. It now mounts individual
nodes into the document for all individual parts of a citation node.
Specifically, it now detects formatting characters, the `@`-sign, the suppress-
author-flag (a hyphen preceding the `@`-sign), prefix, suffix, and the locator
individually. This not just makes styling individual citation parts possible,
but also makes all processing within Zettlr more efficient and faster.
Especially in documents with a lot of citations, you should be able to observe a
performance improvement.

Lastly, we took this opportunity to align the parser more with how Pandoc
Citeproc processes citations. Most notably, this includes relaxing some
requirements such as having to place commas after the citekey, and support for
curly brackets, which allows you more flexibility in defining citekeys (e.g.,
`@{AuthorYear}`) and locators (e.g., `{pp. 23-24, 66-69}`),

If you prefer to style Zettlr using Custom CSS, you can now style the individual
parts of your citations, using the following CSS classes:

* `cm-citation`: The entire citation node
* `cm-citation-mark`: Formatting characters (`{}[];`) except the `@`-sign and
  the suppress-author-flag
* `cm-citation-prefix`: The citation prefix
* `cm-citation-suppress-author-flag`: The suppress-author-flag
* `cm-citation-at-sign`: The `@`-sign in front of your citekey
* `cm-citation-citekey`: The actual cite key (sans surrounding curly brackets)
* `cm-citation-locator`: The locator after your citekey
* `cm-citation-suffix`: The citation suffix

## GUI and Functionality

- **Feature**: Full TableEditor Rewrite. The new TableEditor keeps most
  functionality of the previous version, with the exception of more safeguards
  against data loss, and more ergonomic usage.
- **Feature**: Image and PDF previews. Zettlr has now two dedicated viewers that
  allow users to open common image types and PDF files right from within the app
  for preview purposes (#5501).
- **Feature**: Fully rewritten citation parser (#5902).
- **Feature**: Full-text (aka. global) search runs can now be cancelled via a
  dedicated button. You can now also trigger a new search while another search
  is already running.
- **Feature**: Individual global search results can now be copied to the
  clipboard (#2070).
- **Feature**: The file manager can now show and display other file types as
  opposed to having those only in the sidebar. Images and PDF files can be
  opened directly in Zettlr, while other files will be opened using the system
  default application. You can use the appropriate section in the advanced
  settings to customize this. By default, none of the new file types will be
  displayed in the file manager (#5501).
- **Feature**: Zettlr now provides a Liquid Glass icon for macOS 26.
- **Feature**: A new option has been added to allow a simple switching between a
  raw Markdown syntax mode and a preview mode ("WYSIWYG"), both in the settings
  and in the statusbar. Clicking it will toggle Markdown files between a pure
  syntax view, and a mode in which those items which you have selected will be
  pre-rendered/previewed (#4514).
- **Feature**: Zettlr now ships with a brand-new onboarding wizard that helps
  new users tweak some central settings immediately without having to scour the
  preferences.
- **Feature**: macOS users with an Apple Silicon chip can now access Writing
  Tools from context menus.
- **Feature**: Allow turning off the behavior of Zettlr to automatically open
  files upon successful export (#5609).
- **Feature**: Added a simple setting that forcefully enables Pandoc's `mark`-
  extension when exporting from Markdown if that is not already enabled. This
  ensures that `==highlighted==` spans are properly considered in any output
  format.
- **Feature**: Improved the calendar view in the statistics window to better
  convey the numbers. It now features a gradient heatmap, only considers the
  numbers from the visible year, and logs the numbers to spread out the
  distribution across the new, ten activity levels.
- **Feature**: Improved the statistics chart to better help you contextualize
  your writing flow. It now shows you your current word count for this week, and
  compares it to this and last years's averages.
- **Feature**: The LanguageTool integration is now more performant and allows
  ignoring of certain rules (#5910). Whenever you ignore a rule, it shows up in
  the spellchecking preferences section alongside some additional info. From
  this section you can re-enable it by removing it from the list of ignored
  rules.
- **Feature**: "Hide heading characters" now properly hides the characters
  instead of replacing them with another element, bringing Zettlr's renderer
  closer to a true WYSIWYG experience. The heading level is now indicated to the
  left side in its own gutter element.
- **Feature**: You can now show line numbers in Markdown files via a new setting
  (#5917).
- **Feature**: Zettlr has now improved support for reference-style links. This
  support extends to the link context-menu (which now supports handling links
  from both link and link reference), the tooltips (which accurately show link
  previews), rendering (which accounts for link labels), to any action (such as
  copying or removing a link) (#5142).
- **Feature**: Zettlr now supports loading BibLaTeX libraries as well (#460).
- **Feature**: Zettlr now correctly displays crossref-style citations (#248).
- **Feature**: You can now collapse and un-collapse the files and workspace
  sections in the file manager. This can be helpful if you are working with both
  a lot of individual files and workspaces. Your choice is remembered (#5916).
- **Change**: Snippets: The `$FILENAME` variable now does not contain the file
  extension anymore. Users who also want the extension should update their
  snippets to `$FILENAME$EXTENSION` (#4191).
- **Change**: The word and character counters in the statusbar now always show
  both counts.
- **A11y**: Zettlr now respects if you choose to reduce transparency in system
  settings and no longer add window vibrancy on macOS.
- You can now show an item in Finder/Explorer/file browser when right-clicking a
  document tab (#5914).
- Fixed inline math not rendering when transforming Markdown to HTML (e.g., in
  footnotes).
- The diagnostics info field in the statusbar now toggles the lint panel,
  instead of only opening the panel (#5847).
- Fixed WebP images not rendering from relative paths (#5181).
- Fixed the behavior when clicking widgets (citations, etc.) to accurately
  select only the widget's source text (#5682).
- Update `it-IT` translation (#5831).
- Update `da-DA` translations (#5868).
- Fixed incorrect cursor position after inserting IDs (#5846).
- The toolbar word counter no longer wraps (#5774; #5881).
- Fix context menu entry "Insert table" not working (#5835).
- The keyboard shortcuts for snippets no longer require the field, thus
  preventing errors in `EditorView`s that map the corresponding shortcuts but
  don't have snippets installed.
- The three-way-toggle for the file manager and global search does not wrap on
  Windows anymore (#5876).
- The toolbar can now scroll left and right if the main window is too narrow
  (#5873; #5022).
- Popovers (especially in the toolbar) will now properly close when clicking the
  associated toolbar button a second time (#5870).
- Style improvements: linter panel dark mode (#5882);  drop cursor (#5883);
  export, pomodoro, and tags popover (#5895); spacing in file manager tree view
  (#5891); global search (#5894).
- Switched the icons for code and comments in the formatting toolbar (#5901).
- The word counter now uses a proper segmenter that will make the word count
  more accurate for languages that do not use spaces to separate words (#5898).
- Fixed the tutorial pages not correctly opening on first start.
- Improved the macOS tray icon display.
- Single clicks on the tray icon now activate the app (#4267).
- Fixed footnote placing edge cases.
- Due to updates in Apple's Human Interface Guidelines, the main process now no
  longer removes accelerators/keyboard shortcuts from the menus.
- The recent documents provider now uses the OS API to return a list of recent
  documents. The provider is only retained for Linux at this point.
- Improved performance for documents with many and/or large tables (#5903).
- Fixes print functionality by completely abandoning the `iframe` approach and
  switching to the built-in Markdown-to-HTML parser.
- Fixed the user dictionary not persisting to disk under certain conditions
  (#5922).
- The toolbar update button now includes a clearly visible label indicating that
  an update is available, making it less likely to miss it.

## Under the Hood

- Update Electron to version `38.2.0`.
- Update Pandoc to version `3.8`.
- Added new `curly` rule to ESLint, enforcing curly brackets for block-statement
  declarations (`if`, `for`, `while`, etc.).
- The `enabled` property of context menu items is now optional, and defaults to
  `true`.
- `EditorPane`s will no longer load all documents at the same time, and instead
  reuse the existing `MarkdownEditor` component for a single document. This
  greatly reduces memory consumption, especially for very full tab bars, since
  only a single document will be actively rendered at any one time.
- Moved the previously shared common types for the context menu in the renderer
  into the correct module to colocate the code. The shared types have been a
  remnant from a time before TypeScript supported the `type` keyword, and will
  subsequently be removed.
- Moved the `DirectedGraph` class from the link provider to the stats window.
- Switched back from `electron-devtools-assembler` to
  `electron-devtools-installer`; now the Vue.js devtools extension works again.
- Style groups in form builder fields now support a label that will be rendered
  atop of these groups.
- Zettlr now records and remembers the binary's build date. This information is
  shown in the debug info to help pinpoint from when a version is. In addition,
  this information is now used to disambiguate nightly versions so that both the
  FSAL cache will be cleared more regularly, and you get a visual indicator that
  you did update your nightly release.
- The AST parser now properly detects task lists, and the Markdown-to-HTML
  converter appropriately handles them.
- Improved list form controls. They now allow customizing the delete label and
  provide a custom "No records" message.
- The `rangeInSelection` utility function now accepts an optional parameter that
  allows inclusion of adjacent selection ranges in calculating the result. This
  allows, e.g., renderers to detect whether a selection touches a node-to-be-
  rendered.

# 3.6.0

## Text Transformations

Zettlr now features a set of several text transformation commands in the editor.
Using these commands, you can transform various pieces of text in the editor
using several strategies aimed at working with both regular text (which you can,
e.g., transform between sentence or title case) and corrupted text (from which
you can remove control characters, unnecessary line breaks, and clean up
quotation marks). In total, Zettlr now ships with 13 such transform commands,
but many more are possible.

To utilize these transformations, simply select the text you wish to transform,
open the context menu on it, and select the corresponding transformation from
the context menu.

The available transforms as of now are:

* `Zap gremlins`: Removes unwanted control characters (such as form feeds,
  vertical tabs, and others), which sometimes end up in recognized PDF text.
* `Strip duplicate spaces`: Removes any superfluous spaces.
* `Italics to quotes`: Turns italic markers (e.g., `*text*`) into quotes
  (`"text"`).
* `Quotes to italics`: Turns quotation marks (e.g., `"text"`) into italic
  markers (`*text*`).
* `Remove line breaks`: Removes superfluous linebreaks while retaining any
  paragraphs (separated by two consecutive linebreaks).
* `Straighten quotes`: Turns smart, or "magic quotes" into regular quotes.
* `Ensure double quotes`: Turns any type of quotation (which includes backticks,
  since those sometimes appear in text copied from PDF files!) into regular
  double quotes.
* `Double quotes to single`: Turns any straight double quotes to single quotes.
* `Single quotes to double`: Turns single quotes into double quotes.
* `Emdash — Add spaces around`: Ensures that all em-dashes (`—`) in the text are
  surrounded by spaces.
* `Emdash — Remove spaces around`: Ensures that no em-dashes (`—`) in the text
  are surrounded by spaces.
* `To sentence case`: Turns the selected text to sentence case.
* `To title case`: Turns The Selected Text To Title Case.

## GUI and Functionality

- **Feature**: Zettlr now has text transformations. With these, you can change
  selected pieces of text using a quick access command menu (#5701). Special
  thanks to @richdouglasevans for implementing this.
- **Change**: Zettlr will no longer parse Markdown-like files that exceed ca.
  10 MB in size. After some testing, we have determined that 10 MB seems to be
  a balanced trade-off between parsing as many files as possible and preventing
  the app to crash (especially on slower computers). Note that this only affects
  the caching of certain pieces of metadata, such as title, heading level 1, and
  ID. You will still be able to open and edit the file. For more context, see
  issue #5801.
- Fixed a bug that would prevent the creation of new directories via the
  shortcut (#5769).
- Fixed a bug that prevented retention of user-determined dark-mode setting on
  platforms other than macOS during application restarts (#570).
- Fixed the list of related files disappearing when switching sidebar tabs
  (#5795).
- Windows will now receive black as their background color on Windows and Linux
  if dark mode is active, preventing white flicker during window opening before
  the UI is ready (#5809).

## Under the Hood

- Bump Pandoc to version `3.7.0.2`.
- Bump Electron to version `37.2.0`.
- The primary app service container can now be retrieved using the factory
  method `getAppServiceContainer`. This makes it possible to reduce a few
  recursive dependencies on passing the service container down and will help
  disentangle the main process services in the future.

# 3.5.1

## GUI and Functionality

- Fixed a bug that would make using certain keys such as `Enter`, `Backspace`,
  or quotes in code editors in the Assets Manager unusable (#5797).
- Added Kazakh language (#5771).
- Improve fenced code block language detection when using fenced code
  attributes. Now, using the recommended Pandoc-style syntax for attribute
  strings will correctly match the language in the info string to one of the
  available identifiers.

## Under the Hood

(nothing here)

# 3.5.0

## GUI and Functionality

- **New Feature**: Zettlr can now display a set of file types not only in the
  sidebar's "Other files" tab, but also in the file manager, which in turn makes
  it simpler to find and open relevant plots or PDF files for reference.
- **New Feature**: Zettlr can now open images and PDF files right next to your
  regular files, enabling you to preview pictures of, e.g., plots, or studies to
  reference in your text; and double-check PDF files which you need to
  reference.
- **Feature**: The code editors (in the assets manager and elsewhere) now share
  the same keymap as the main editor.
- **Feature**: The image renderer now acknowledges and respects the presence of
  a Pandoc link attributes string behind an image to scale images using custom
  sizes (#1328).
- **Change**: Removed some optional properties from the default profiles. If you
  want to switch to the new defaults, delete those files from the assets manager
  or rename your existing ones. Specifically, removed `top-level-division`,
  whose meaning has changed which started to produce empty first pages during
  Word exports (#5645).
- Fixed a long-standing bug that would not clear the modification marker on both
  file tabs (#5747) and the macOS window indicator (#4724) when a modified file
  was closed without saving changes. Acknowledges PR #5747 which is superseded
  by this change.
- Added a keyboard shortcut for highlighting text: `Ctrl-Shift-H` (#4668).
- The Mermaid diagram renderer is now more flexible. It now renders any Mermaid
  diagram in any type of valid fenced code block with both allowed variations of
  providing the info string: the plain `mermaid` and the Pandoc-attribute style
  `{.mermaid}` class (#5734).
- Fixed a keymap conflict that would cause `Enter` to not accept autocomplete
  suggestions in some contexts such as Markdown syntax elements (#5646).
- Improved the math, mermaid, image, and heading renderers so that they perform
  additional checks before actually updating their respective rendered elements.
  This should reduce the amount of flickering and unintentional scrolling
  especially in longer documents with many of such elements.
- Enable the CodeMirror folding keymap which lets you fold and unfold code, such
  as headings, with keyboard shortcuts instead of using the arrows to the left
  of the editor (#857). The shortcuts are: `Ctrl-Shift-[` (Windows/Linux) or
  `Cmd-Alt-[` (macOS) for folding code, `Ctrl-Shift-]` or `Cmd-Alt-]` for
  unfolding, `Ctrl-Alt-[` for folding all, and `Ctrl-Alt-]` for unfolding all.
- Update `fr-FR` translation (#5738).
- Update `cs-CZ` translation (#5775).

## Under the Hood

- Cache ESLint results to improve subsequent linter run speed (#5706).
- Spawn shell when starting test GUI on Windows (#5685).
- Markdown commands now check whether the provided target `EditorView` is parsed
  using a Markdown parser before running.
- Move all keymaps into a single `defaultKeymap`.
- Assume `**` as default bold and `*` as default italic formatting for Markdown
  commands if the config field is not present.
- Added a `pandocLinkParser` for properly parsing pandoc link attribute strings.

# 3.4.4

## GUI and Functionality

- **Change**: The exporter will now forcefully enable (= if it is not yet
  enabled in the corresponding defaults file in the assets manager) the Pandoc
  extension `wikilinks_title_after_pipe` or `wikilinks_title_before_pipe`
  (depending on your settings) for every export from a supported (Markdown-
  based) reader so that wikilinks/Zettelkasten links are properly parsed.
- Identification of Pandoc readers and writers is now more stable, resulting in
  clearer information across the app.
- Fix the wikilink/Zettelkasten link Lua filter (#5605).
- Zettlr now properly retrieves attachments also for items residing in group
  libraries (#5647).
- Updated translations:
  -  German (`de-DE`)
  -  French (`fr-FR`, #5688)
  -  Taiwanese (`zh-TW`, #5656)

## Under the Hood

- Import Pandoc `reader`/`writer` parser from
  `nathanlesage/pandoc-profile-generator`; retire `getPlainPandocReaderWriter`.
- Move `pandoc-maps.ts` to common `pandoc-util` location.
- Add additional classes to Table of Contents-headings in the sidebar to allow
  targeting them with Custom CSS rules (`toc-heading-X` where `X` is the level).
- Bump Electron to `v35.1.5`.
- Bump Pandoc to `v3.6.4`
- Bump Node.js across the CI to v22 (LTS).
- Bump various other dependencies.
- Upgrade the Ubuntu runners on the CI back to Ubuntu 22.04 LTS (#5172).

# 3.4.3

## An Important Note for Windows Users

If you use Zettlr on Windows, there is a chance that you will be unable to
install this update at first. This is because this update uses a different, new
code signing certificate. There is a possibility that especially those of you
who use a work computer on which you do not have administrative access, Windows
will warn you of this update and prevent you from installing it. Based on
initial communication, there are indications that this won't happen, but we
wanted to let you know just in case.

If you are unable to install this update, please make sure you update to at
least version 3.4.2, which has been released last week. If you did not update to
version 3.4.2, you can find do so
[by clicking this link](https://github.com/Zettlr/Zettlr/releases/tag/v3.4.2).

For more context, please [read our blog post](https://zettlr.com/post/zettlr-switches-code-sign-certificate-important-information-for-windows-users)
that outlines our roadmap for the code signing certificate change, as well as
[our Community Forum post](https://forum.zettlr.com/d/11-windows-code-signing-certificate-expires-what-users-need-to-know).
If you have any questions, please don't hesitate to ask them
[on the Community Forum](https://forum.zettlr.com/),
[on Discord](https://go.zettlr.com/discord), or
as a comment on our [BlueSky](https://bsky.app/profile/zettlr.com) or
[Mastodon](https://fosstodon.org/@zettlr) accounts.

**If you are able to install this update without issues, please let us know on our Discord channel, Community Forum, or on BlueSky or Mastodon.**

## GUI and Functionality

- **Breaking Change**: Switched Windows Code Signing Certificate to the Azure
  one. For some time, you may be unable to install new Zettlr updates on your
  computers. Please watch Zettlr's social media channels to get notified once we
  have established that it works again.
- Updated `zh_TW` translations (#5635).

## Under the Hood

- Bump Electron Builder to `v26.x.x`.
- Switched Windows Code Signing workflow to Azure.

# 3.4.2

## An Important Note for Windows Users

If you use Zettlr on Windows, we **urgently recommend you to install this update**.
We will release a second update approximately one week after this update, which
you may not be able to install on Windows right away due to Zettlr switching
code signing certificates. Therefore, please absolutely make sure you install
*this* update on your Windows computers.

For more context, please [read our blog post](https://zettlr.com/post/zettlr-switches-code-sign-certificate-important-information-for-windows-users)
that outlines our roadmap for the code signing certificate change, as well as
[our Community Forum post](https://forum.zettlr.com/d/11-windows-code-signing-certificate-expires-what-users-need-to-know).
If you have any questions, please don't hesitate to ask them
[on the Community Forum](https://forum.zettlr.com/),
[on Discord](https://go.zettlr.com/discord), or
as a comment on our [BlueSky](https://bsky.app/profile/zettlr.com) or
[Mastodon](https://fosstodon.org/@zettlr) accounts.

## GUI and Functionality

- **Breaking Change**: To better support the now recommended Wikilink syntax
  with titles (`[[filename|Some title]]`), links that use the old and not
  recommended syntax of adding titles from the time when Zettlr did not support
  titles (`[Do not use this syntax]([[filename]])`) can no longer be
  automatically replaced when renaming files (#5606).
- Zettelkasten links with titles will now get properly replaced when renaming
  files (#5606).
- Fixed an issue that prevented the FSAL cache clearing from proceeding
  appropriately.
- Fix an issue that could lead to accidental overwriting of existing files in
  some cases (#4940; also previously #5460 in Zettlr 3.3.0).
- Fixed malformed rendering of plain links into HTML links (#5587).
- Fixed a bad interaction between the default keymap and inserting an `Å`
  character on macOS keyboards.
- Fixed a bad interaction between the default keymap and inserting backticks on
  macOS keyboard layouts without deadkeys (#5517).
- Fixed file exports not working after renaming file (#5574).
- Links won't be pre-rendered if their title is empty, as this would hide the
  entire link syntax.
- UI text has been improved throughout the app.

## Under the Hood

- Bump Pandoc to `v3.6.3`.
- Bump chokidar to `v4.0.3`.
- Bump Electron to `v34.2.0`.
- Fixed the boot order of providers to ensure certain actions are taken before
  providers access each others (primary case: the FSAL needs to be booted asap).
- Promisify the cache clearing procedure.
- Switched Apple Code Signing Certificate from expiring to new one.
- Improve the linting experience by also including a TypeScript lint on top of
  `vue-tsc`; in addition to stylistic and code-issues that are handled by ESLint
  this will capture serious TypeScript issues as what happened during the patch
  from 3.3.1 to 3.4.0 (see for context #5526); the new linting experience will
  run by default, the old linter has been renamed from `lint` to `lint:code`,
  and the new linter can be called individually using `lint:types`.
- Rename `value` to `target` in Markdown AST `ZettelkastenLink` nodes to make it
  more explicit that this field contains the value and never the title.
- Add new property `targetRange` to Markdown AST `ZettelkastenLink` nodes to
  allow for easy manipulation of link targets.

# 3.4.1

## GUI and Functionality

- Fix heading extraction bug from 3.4.0 that made Zettlr crash on boot

## Under the Hood

(nothing here)

# 3.4.0

## GUI and Functionality

- **New Feature**: For files that belong to a Zettlr project, the status bar now
  additionally displays the total word or character count for all files across
  the entire project, making it easy to check for a total limit (e.g., for a
  journal submission); clicking on the item furthermore allows quick switching
  between just those files that are part of the project
- **New Feature**: The references sidebar tab now provides an approximate word
  count, which is useful if some word count limit includes the bibliography; as
  references aren't included in any other word count
- Fix SVG image preview (#5496)
- Fix network share image preview (#5495)
- Fixed a bug where opened documents would not be closed once the last tab was
  closed, retaining outdated file contents and making the file unresponsive to
  external changes. Now files that do not have an open editor instance will be
  closed appropriately
- Fixed an issue where valid citations from within, e.g., comments, or other
  non-valid places would end up in the list of references
- Fixed a bug that would cause spellcheck suggestions to appear offset (#5494)
- Checking task-list checkboxes now returns the focus back to the editor
  immediately (#5246)
- The statusbar's character/word counters now respect the character count
  setting, meaning only the word or character count is shown, not both
- Update translations:
  - `uk-UA` (#5524)
  - `de-DE`

## Under the Hood

- Update Pandoc to version `3.6`
- Bump CodeMirror dependencies
- Updates to the Markdown AST parser:
  - Headings now have regular children
  - Fixed a bug that would prevent text nodes from tables to be extracted
  - Better detection of content "gaps"
- Type system updates:
  - Define a new shared type, `IPCAPI` that can be used to type the various IPC
    APIs the service providers use across the app.
  - Fully type IPC APIs: `AssetsProvider`, `DocumentAuthority`,
    `DocumentManager`, `WindowProvider`, `CiteprocProvider`
- Refactored the file type detection system; it is now simpler and easier to use
  and can detect a variety of additional groups of files (previously only
  Markdown and code files; now also images, PDFs, MS and Open Office files as
  well as data files)
- Select controls can be disabled now
- Configuration updates in the renderer are now throttled to at most once every
  second, preventing some fast updates from inducing lag
- Refactored spellcheck linter

# 3.3.1

## GUI and Functionality

- Fixed a serious bug that would prevent external files from being properly
  handled on Windows; which included images, linked files, attachments, and
  others (#5489)

## Under the Hood

(nothing here)

# 3.3.0

## Please Backup Your Writing Statistics

This update includes a change in the writing statistics. While we extensively
tested it, we would like you to backup your personal writing statistics. You can
do so by going into Zettlr's data directory and simply make a copy of the file
`stats.json` before launching the update. Your data directory is located at
`C:\Users\<your username>\AppData\Roaming\Zettlr` (Windows),
`/Users/<your username>/Library/Application support/Zettlr` (macOS), or
`/home/<your username>/.config/Zettlr` (Linux). Then, check if your writing
statistics still look proper. If not, please report this. Thanks!

## GUI and Functionality

- **New Feature**: Images in the "other files" tab do now contain a small
  preview to help find the correct images
- **New Feature**: Project settings can now override folder sorting, which means
  that any project folder will from now on be sorted like so: (1) the files
  within the folder in the order of the project settings; (2) all other files
  according to the folder's regular sort settings. Note that this requires all
  project files to reside in the top folder; included project files in
  subfolders will not be affected
- **New Feature**: The formatting toolbar can now be toggled on or off in the
  preferences (#5207)
- **New Feature**: Allow three-digit ordinal day of the year in IDs and
  filenames (`%o`; #5424)
- **Vim mode improvements**:
  - Mapped Vim's write and quit commands to saving and closing actions (#4720,
    #5463):
    - `w`: Executes a save command for the current file
    - `q`: Executes a close-file command for the current file
    - `wq`: Attempts to save the current file and then close it
    - Note that the `!` argument for supressing the "Omit unsaved changes"
      dialog will not work, as the editor does not have the authority to tell
      main to simply omit work (this is a security feature)
  - Movement keys (`j`/`k`) now account for line wrapping for a smoother
    navigation experience
  - Default Shortcuts Restored: Unmapped `C-f`, `C-t`, and `C-c` in specific
    modes to re-enable default editor behaviors like search and task item
    shortcuts
- Columns in the preferences window are now properly aligned (#5410)
- Fix color scheme in readability mode (#5478)
- Prevent initial startup update-check if the setting is unchecked (context:
  https://github.com/Zettlr/Zettlr/commit/812899#r148519528)
- Fix errors in, and update, German translation (`de-DE`)
- Update Turkish translation (`tr-TR`) (#5461)
- Fix "dancing list items" (#4602)
- Zettlr finally counts and remembers character counts
- The link preview and force-open workflows now expect internal/wiki-links that
  link to headings within the file (`[[filename#heading-id]]`) and can handle
  such links appropriately; the editors will not yet jump to the corresponding
  headings, but this will improve compatibility with other editors who already
  support this feature (#3727)
- Fixed an edge case in rendering highlight marks
- Fixed non-unique clipboard data paste filenames (#5449)
- Fixed non-proportional images (especially very tall ones) overlaying other
  text below them (#5465)
- The background color of the active line in typewriter mode no longer blocks
  the selection background (#5430)
- Dropping or copy-pasting images from the file browser now inserts relative
  links to them again instead of offering to save a copy (#5475)
- Code files can now also be indented and unindented as expected using `Tab`
- Changing capitalization of filenames on Windows, macOS, or other case-
  insensitive file systems (e.g., testfile -> Testfile) no longer fails (#5460)
- Fixed drag & drop behavior of open-able files onto the editor from the file
  browser; dropping any supported file onto the app will now attempt to open it
  (#5344)
- Fixed export menu not remembering last selected custom commands (#5163)
- Provide default reset-to-sizes for various split views

## Under the Hood

- Update Codemirror dependencies
- Update Electron to `v33.2.0`
- Update Electron forge to `v7.5.0`
- Update various other dependencies
- The `PersistentDataContainer` now uses proper data types, making usage more
  type-safe
- Completely refactor the Statistics provider as well as the statistics display
- Replace the deprecated `registerFileProtocol` call with the new recommended
  `handle` call for handling `safe-file://` calls
- Re-introduce linter rules; all of these are part of the common style we
  already use, but they got lost in one of the past ESLint upgrades:
  - enforce single quotes across the codebase
  - enforce proper object property spacing
  - enforce type imports
- Moved all keymaps to a centralized space, enabling us to customize them
  further in the future and streamlining the available keybindings
- The document provider is now more strict when loading persisted window
  arrangements from disk on startup
- Made many additional strings in the GUI translatable

# 3.2.3

## GUI and Functionality

- Fix highlight markers not appearing while the emphasis renderer is on when the
  user edits a highlighted span
- Add pascal syntax highlighting to the code block autocomplete
- Improved highlight detection around punctuation marks and other non-word
  characters
- Image previews now treat escaped quotes in image titles properly
  (`![alt](image.png "\"quoted\" title")`)
- Fix an issue with image caption updating that may replace text surrounding the
  image (#5021)
- Too small images won't display the informational layers anymore (#3953)
- Improve image copy and paste operations (#5408)
- Improve dropping operations onto the main editor
- Blockquote markers are now properly hidden with the emphasis renderer on and
  the cursor not within the blockquote (#4667)
- Fix ambiguous German unsaved-changes dialog (#5072)
- Fixed an issue where some websites could make Zettlr freeze on loading a link
  preview via catastrophic backtracking in a regular expression (#4883)
- Make link preview generator more resilient
- Updated German (`de-DE`) translation (#5399)
- Fixed an issue where indented LaTeX math equations could crash the editor
  instance due to the code marks including superfluous newlines (#4726)
- Fixed missing code block background on YAML Frontmatters
- Improved visual feedback during the update process
- Zettlr now checks for new updates once an hour instead only during startup
- New tags are now picked up by the app immediately (#5140)
- Fixed a UI regression where clicking on the tag filter didn't focus the text
  box (#5444)
- Nightly releases are no longer considered older than the current stable
  version (#5429)
- Fixed file duplication (#5360)
- Fixed a bug that would cause a saved window state to be lost due to an issue
  with the active file not existing anymore
- Zettlr now respects your chosen symbols for bold and italic formatting upon
  converting HTML to Markdown (e.g., during paste; #5396)

## Under the Hood

- Moved image preview styles into Codemirror plugin; simplified container
- Bump Pandoc to version 3.5
- Properly type document tree JSONs and make the logic more resilient to a lack
  of an active file upon hydration
- Properly type props for MainEditor Vue component

# 3.2.2

## Changes to Pandoc Profiles

This update fixes a workaround that Zettlr had in place for a shortcoming of
Pandoc regarding the automatic numbering of headings. This workaround is no
longer necessary, since Pandoc has since fixed the issue. 

Zettlr now ships with changed default profiles for various export formats. Since
Zettlr never overwrites any data, the new defaults will not be applied
automatically. You can apply the change manually by removing the following line
from the default profiles: `shift-heading-level-by: 1`.

## GUI and Functionality

- **change**: Remove `shift-heading-level-by: 1` line from default profiles
- Fixed the "Paste as Plain" menu item not working (#5052)
- Dark mode folded header's ellipsis are now properly colored (#5284)
- Add Pascal syntax highlighting (keyword: `pascal`; #5368)
- Fixed images in file previews on hovering internal file links not working
  (#5041)
- Fixed the tag search from the tag cloud popover (#5124)
- Fixed visual artifacts in the backgrounds for code blocks and comments (#5260)
- Fixed a bug that would apply certain shortcuts to all open editor panes,
  rather than the last focused one (#5282)
- The save changes dialog now offers a cancel option that will be chosen when
  pressing Escape (#5338)
- Updated translation for `es-ES` (#5372)
- Fixed the main editor search panel overlaying popovers/flyouts (#5397)
- Fixed the highlighting, which now retains any syntax highlighting (and thus
  functions like interacting with links) between the markers (`==highlight==`)
  as well as enabling spell checking of highlighted ranges
- Fixed an issue preventing pasting of images into the editor (#5386)
- Fixed the maximum height of the image preview in the paste-image dialog to 50%
  in order to prevent it from pushing the controls out of view
- Fixed the code and citation background colors in the Bordeaux dark theme

## Under the Hood

- Images across the application now have a `max-width: 100%` applied to them to
  ensure they never overflow their parent container.
- The `md2html` utility function now allows a fourth parameter containing hooks
  that allow the further customization of the produced HTML output
- Bumped CodeMirror and dependencies
- Bumped ESLint and dependencies
- Fixed HTML DOM structure in a few places where they would violate the spec

# 3.2.1

## GUI and Functionality

- Zettlr now remembers the widths of file manager and sidebar
- You can now reset the file manager and sidebar widths by double-clicking the
  corresponding resizer
- Fixed an issue with the Markdown AST parser that would wrongly parse tables
  with empty cells and forget some of them
- Copying plain links in the form `<http://www.example.com>` will now remove the
  angled brackets (#5285)
- Reverted a change from 3.1.0 which altered the process of creating new files
  in such a way that the "open directory" was no longer considered; now Zettlr
  will again use the open directory if present, allowing users to quickly create
  new files by selecting a folder first in the file manager (#5141)
- Updated translations:
  - `it-IT` (#5233)
  - `zh-TW` (#5327)
  - `nl-NL` (#5319)
  - `ru-RU` (#5314)

## Under the Hood

- Update Electron to `v32.1.0`
- Update Pandoc to `v3.4`
- Switched to ESLint v9.x, thereby replacing the "old" `.eslintrc.json` config
  with what ESLint calls "flat" configs
- Bumped various dependencies

# 3.2.0

## Resolved Data Loss Issues

When Zettlr v3.0.0 was released, we started receiving reports by users
mentioning that some files wouldn't properly save, potentially leading to data
loss. After searching for the underlying root cause, we have now identified it
as improper newline handling in files. Specifically, we have accidentally
introduced a bug that would render Zettlr incapable of properly detecting
Windows-style CRLF newlines. This means that Zettlr was only sometimes able to
properly read and modify such files.

This update fixes this bug. Now, Zettlr is able to properly read and modify any
file, regardless of whether it has been created on Windows, macOS, Linux, or
even some older systems. We would like to apologize for this bug and thank you
for sticking with Zettlr despite it.

## Changes to the file filtering logic

The filter field in the file manager has always applied OR-logic when searching
for files and workspaces. In this latest update, Zettlr changes to AND file
filtering logic, meaning that only items matching all queries will be displayed
when entering phrases separated by spaces.

As an example: Until now, searching for "Niklas Luhmann" would've surfaced files
that contained either "Niklas" or "Luhmann," or both. From now on, searching for
"Niklas Luhmann" will only show files that contain *both* "Niklas" *and*
"Luhmann" and exclude files that miss one of these phrases.

## GUI and Functionality

- **Feature**: The attachment/assets/other file sidebar tab now also shows files
  found in the default image folder where applicable
- **Feature**: The right-click context menu for external markdown links now 
  contains an option to remove a link. When removing `<link>` style links, the
  `link` text remains as plain text. When removing `[title](link)` style links, 
  the `title` text remains as plain text.
- **Change**: When searching for files in the filter field, only files and
  workspaces that match all queries entered will be displayed
- Fixed the French translation of unsaved-changes dialog actions. (#5177)
- Fixed bugs with properly saving files (and retaining linefeeds) on Windows
  systems; now Zettlr should be capable of handling any type of linefeed (#5109)
- Fixed an issue where checkboxes in various list controls would not be properly
  updated to reflect the actual, underlying value
- Fix assets file icons in the sidebar
- Design fixes in the sidebar
- Fix: The file preview tooltip now respects the filename display settings
- Fix: Focus input field when search in folder (global search) is
  triggered

## Under the Hood

- Upgrade Electron to `v30.1.0` (cf. issue #5135 and Electron issue #41839)
- Downgrade Linux builds to use Ubuntu 20.04 instead of 22.04 (#5137)
- Fully abstract away newline handling from the internal logic. Now, newlines
  are always `\n` across the entire app. The actual newlines from the files will
  be stored in their respective file descriptor, and will be exclusively used on
  file reads (to replace them with `\n`) and file writes (to replace `\n` with)

# 3.1.1

## GUI and Functionality

- Fixed a segmentation fault crash on startup across various Linux setups
  (#5135)

## Under the Hood

- Downgrade Electron to version `29.3.2` (cf. Electron issue #41839)

# 3.1.0

## Changes to the link detection

For a long time now, Zettlr would (sometimes aggressively so) detect plain links
and display them in a rendered state. In some cases, this was nice as it would
relieve you from having to surround such links with pointy or angled brackets.

However, especially in the latest evolution of this parser plugin, the link
detection was a bit too aggressive and interfered, e.g., with emphasis
highlighting. In this version, we have entirely removed our custom link
detection and rely upon the more straight-forward way of detecting links.

Regarding your exporting experience, this should not have any impact, since the
auto-link-detection feature wasn't enabled by default by Pandoc anyhow, but
depending on how you have been writing, you may notice less detected links in
your documents.

To add "plain" links (without using the full `[]()`-syntax) from now on, simply
surround them with angled brackets: `<https://www.google.com>` or
`<mail@example.com>`. Note that the protocol (`https://`) is required, so
`<www.google.com>` will not work.

This changes brings Zettlr's link functionality much more into alignment with
other editors as well, since this is the way that many other applications handle
links as well.

## Introducing Wikilink Titles

This update brings a long-awaited change to Zettlr's handling of internal links
(sometimes called Wikilinks). Specifically, with this version, Zettlr finally
supports optional titles in such links. Your old links in the format `[[link]]`
still work fine, but now you can add a title that is different from the link,
separated by a pipe, or vertical bar character (`|`).

If such a title is given, Zettlr will use it in various ways to make your files
more readable. For example, if you have the link renderer activated in the
settings, it will take care of hiding the link target of Wikilinks as well as
those of regular Markdown links.

Since there is no way of knowing which of the two parts is the link, and which
is the title, Zettlr follows Pandoc's solution in allowing you to specify how
internal links are structured for you. The default and recommended setting is to
put links first, and titles second (`[[link|title]]`). This ensures
compatibility with VimWiki, MediaWiki, Obsidian, and others. However, should you
need to target GitHub wiki pages or another application that expects a title to
come first, you can select the alternative option (`[[title|link]]`).

In order to make Pandoc aware of your choice, you can add one of the following
reader extensions to your export profiles: `wikilinks_title_after_pipe` or
`wikilinks_title_before_pipe`.

Lastly, due to this improvement, we have changed the default setting for "link
with filename" from "always" to "never", since it will be more ergonomic to use
a custom link title directly instead of having the filename pop up after the
link. This default setting applies only to new installations automatically; so
if you already installed Zettlr, you can manually switch it.

## Re-enabling old Link-Title-Syntax

After the release of Zettlr v3.0.0, some users have complained that their
internal links have stopped working. It turns out that quite a lot were using
Logseq's syntax for adding titles to internal links (`[Title]([[Link]])`), which
we broke during a refactor of the Markdown parser. This update partially
restores this link functionality, allowing you to `Cmd/Ctrl-Click` them to
follow these links again.

Note that we have not implemented other parts yet, and we recommend the more
common `[[wikilinks]]` or `[regular markdown links](./file.md)`.

## Preferences Window Overhaul

This release marks the debut of our UX/UI artist Artem Barinov who spent the
better half of 2023 redesigning the entire preferences window from scratch.
While this change narrowly didn't make it into 3.0.0, we are more than excited
to introduce this new and sleek overhaul in this version.

The new window now follows a much more consistent design philosophy. While we
have kept the broad tabbed outline, the settings have now been moved into
smaller blocks that contain sets of related settings. Furthermore, instead of
having to remember where a setting is located, you can now directly search for
it using the new search bar.

We also took the opportunity to change, rename, relabel, and remove settings so
that a bit of older remnants are now gone. Overall, the experience of changing
the settings should now be much smoother, and we hope you like the change. In
the coming updates, you can improve many more improvements on the UX side of
things!

## Project Overhaul: Full Control Over Your Files

Projects are at the heart of Zettlr. As a writing toolbox primarily targeted at
academics, journalists, and writers, it must cater not just to simple note-
taking workflows, but also to serious writing. Because of this, Zettlr ships
with a project feature since the very beginning (since version `0.18.0`,
released on Jul 20, 2018, to be precise).

However, for a long time the feature attempted to piggyback on the way your
files were displayed. This meant that (a) the order in which your files were
weaved together into the project file depended on the sorting of the directory,
and (b) there was no clear way to exclude files that naturally amass during the
lifetime of a project, such as notes, backup files, and miscellaneous.

Zettlr 3.1.0 fixes this issue by introducing a rather small, but powerful change
to the way projects work. We have removed the difficult to understand glob-
patterns that were introduced in a less-than-ideal attempt to fix some of the
complexity-issues that were introduced later (such as displaying file titles
instead of filenames, and others). Instead, you can now explicitly select which
files will be included in your bound export files – and in which order.

The new file list, which you can find in the project properties dialog, aims to
be dead-simple to understand, yet give you back the certainty which files will
end up where in your export – without a doubt.

This also means a change to your projects: After this update, the glob patterns
will be removed from your `.ztr-directory` files and replaced with an (initially
empty) array of files to be included in your project. That means that you will
have to select the files you want to include in a project once after the update.

Managing this list in the project properties is simple: The "Files" tab includes
a list of all files available within the project's folder structure. To select a
file for export, click the "+"-button to move it up and include it in the
export. Next, you can use the "Up"- and "Down"-buttons to change the order of
the files within your export. The "-"-button removes a file again and moves it
back down to the list of ignored files. Changes are immediately applied and
persisted to your disk.

When you now export the project, Zettlr will use only the files you have
selected, and put them in the appropriate order.

Should you have deleted a file that you originally included in the list of
files, Zettlr will show you a warning message as soon as you export it so that
you can have a second look to not send off a file that's missing a crucial part
of your work. Such missing files are shown atop of the available files and
feature a "-"-button which allows you to remove them from the list. We opted for
this approach of you manually having to remove missing links, since it makes it
transparent which files are missing so you can take the appropriate action
(especially if it was an accidental deletion).

## LanguageTool Improvements

The first update to Zettlr's LanguageTool integration concerns the language
detection. This update ships with two improvements:

1. Zettlr implements LanguageTool's "Preferred Variants" setting
2. LanguageTool respects the `lang` frontmatter property

Those who prefer writing in British English (instead of, e.g., US English) had
to resort to manually switching the automatically detected language from en-US
to en-GB every time they opened a file. This has to do with fact that
LanguageTool's auto-detector cannot reliably distinguish between variants of
some languages (English, German, Portuguese, and Catalan). That is why LT
implements a "Preferred Variants" setting that allows you to specify which
variant you prefer when writing in any of these languages. Zettlr now implements
this setting so that when LT auto-detects the language, it will choose that
variant if it detects that, e.g., English is the language. You can adapt this in
the settings.

Second, LanguageTool now respects the `lang` property in YAML frontmatters. This
will come in especially handy for people writing bilingual and where
LanguageTool has troubles auto-detecting the primary language. By setting the
property `lang` to the language of the document (e.g., `en-CA`), LanguageTool
will default to that one instead of choosing the auto-detection. As an added
benefit, Pandoc also supports this property to localize some things here and
there (read more at https://pandoc.org/MANUAL.html#language-variables).

Note that both improvements only apply to the initial loading of a document. You
can always override the language on a per-document basis using the status bar.

## GUI and Functionality

- **Feature**: Zettlr now supports titles in internal (wiki) links; the default
  setting instructs the parser to expect first the link, and then the title
  (`[[link|title]]`), which ensures compatibility to, e.g., VimWiki, MediaWiki,
  or Obsidian, whereas the alternative setting (`[[title|link]]`) is compatible
  to GitHub wiki syntax. Remember that you need to enable the corresponding
  option on the Pandoc Markdown reader (`wikilinks_title_after_pipe` or
  `wikilinks_title_before_pipe`, respectively) if you wish to export files with
  this option
- **Feature**: Project Overhaul. Now you can properly manage which files will be
  exported in projects, and in which order
- **Feature**: Zettlr can now suggest you emojis during autocompletion. Emojis
  use the same trigger character as the snippets autocomplete, a colon (`:`);
  and Emojis will always be sorted below your snippets -- you can turn this off
  in the editor settings
- **Feature**: We've completely redesigned the preferences dialog; now it is
  more aligned with the system preferences on macOS and Windows, allows
  searching and follows a more stringent structure (special thanks to our UX/UI
  artist Artem for spending almost an entire year redesigning it from the ground
  up!)
- **Feature**: The assets manager now provides buttons to open the defaults and
  snippets directories directly from within the app
- **Feature**: The table insertion popover now displays how many rows and
  columns will be inserted
- **Feature**: A new setting allows to highlight whitespace across the app
  (#1123)
- **Feature**: Implemented the LanguageTool Preferred Variants setting; now you
  can select variants of certain languages (English, German, Portuguese, and
  Catalan) for cases in which the automatic detection may pick the wrong one
- **Feature**: LanguageTool now respects the `lang` YAML frontmatter property
  (if present and conforming to simple BCP-47 tags, e.g., `de` or `de-DE`),
  instead of defaulting to "auto"; this allows you to specify the languages of
  your documents instead of relying on LanguageTool to figure it out; may not
  work with more exotic tag variants (such as `de-DE-x-simple-language`)
- **Change**: The attachment sidebar no longer considers the "open folder" for
  fetching its "other files" -- instead it will use the last focused file's
  folder
- **Change**: The shortcut for deleting a directory has been removed from the
  menu as it provided an opaque way of deleting a seemingly random folder; now
  deleting a folder requires right-clicking the corresponding directory which
  makes the process more transparent
- **Change**: Removed the option for choosing to sort by either file creation or
  last modification time, since that can also be inferred from whichever time
  you choose to display
- **Change**: Removed the option for activating or disabling automatic file
  creation upon following internal links; now this will happen automatically as
  long as the "custom folder" option points to an existing folder; to disable
  this functionality simply remove the folder path
- Fixed a bug where recent documents would not turn up in the menu
- Fixed the sidebar shortcut: It is now `Cmd/Ctrl+Shift+0` (to align with the
  file manager shortcut, which is `Cmd/Ctrl+Shift+1`)
- Custom protocols should now be opened without problems by Zettlr (#3853)
- Added Tamil (India) translation (#4848)
- Removed the custom plain link parser out of two reasons: (1) It was a tad too
  aggressive, detecting links even where none were wanted; (2) Pandoc doesn't
  support auto-links in such a way as we have implemented it, leading to
  inconsistencies in exports
- The YAML frontmatter is now ignored for the purposes of previewing files,
  showing a more meaningful preview of its contents (#4598)
- Improve pasting behavior: Now text from Microsoft Word or Excel will be pasted
  as text, instead of offering to insert an image of the selection
- Fix pasting behavior: Now Zettlr should properly paste most formatted text
  without too much noise (in the form of comments, styles, and other additions)
- Fix restart-dialog showing multiple times for the same options (#4768)
- Fix the active typewriter line background color in dark mode
- Fixed an issue where gutter markers were not equally offset when typewriter
  mode was active (#4918)
- Fixed non-working file deletion menu item (#3894)
- Fixed a bug that would not ask users to save their changes when closing the
  last main window on Windows or Linux (#4898)
- Fixed a bug that would not properly restore the open directory on application
  boot (#3797)
- Fixed an issue that would break drag & drop behavior of editor panes when the
  path name contained a colon on non-Windows systems (#4822)
- Fixed an issue where the re-ordering of list item numbers would not ensure
  that lists start at 1
- Fixed an issue that has removed the custom background color from the Bielefeld
  and Bordeaux themes (#4913)
- Fixed broken context menu options for images (#4893)
- Implemented superscript and subscript HTML rendering in the internal Markdown-
  to-HTML converter (#4943)
- Improved the TableEditor to more reliably parse tables; also, when a table
  could not be rendered out of any reason, the editor will simply remain dormant
  and not render the table instead of messing up the entire document
- Improvements to how the Markdown AST handles table parsing, which will improve
  Markdown-to-HTML conversion both within the TableEditor as well as when
  copying as HTML
- Fixed an issue that would make a context menu on macOS appear offset from the
  actual mouse position if the window's GUI was scaled absolutely (as per the
  preferences); now the context menu should always appear exactly where it
  should be
- Updated the CodeMirror dependencies to resolve an issue where users of
  keyboards with `Alt-G` being assigned to some character were unable to type
  that (specifically, Swiss-Mac keyboard users could not type an `@`)
- Fixed a bug that would not properly highlight PHP syntax in code blocks
- The link renderer will now also hide internal link/Wikilink links and only
  show the titles, if enabled
- Internal link tooltips will now show regardless of where inside the link your
  mouse cursor is
- Added a visible error message to two places in which saving documents may go
  wrong so that users have visible feedback if their changes are actually
  persisted to disk (#4229)
- Re-enable following internal Links in the format `[Title]([[Link]])` by
  clicking them with `Cmd/Ctrl` pressed
- Fixed a bug that would not properly check for autocorrect values during a
  spell check
- The cursor on the editor scrollbars should now be a regular pointer instead of
  a text cursor (#4441)
- The global search now differentiates between the total amount of matches and
  the number of matched files
- The search button in the global search will now be disabled during a search
- Due to the new ability to add link titles, the default setting for "Link with
  filename" is now set to "never" for new installations; you may consider
  changing this as well
- The updater now contains a message indicating when Zettlr last checked for
  updates (#4963)
- Fixed a bug that would sometimes make the "New file" command hang (#4785)
- Fixed a bug on Windows and Linux that would not make the context menu on the
  status bar's MagicQuotes handler appear
- Fixed a bug in the print window (#4902)
- Fixed a bug in the image pasting modal handler (#5007)
- Fixed a bug caused by a workaround from a few years ago, making dialogs modal
  again (see #4952)
- Fixed an issue that would prevent the status bar in Code editors to switch
  between light and dark
- Fixed an issue that would not show the color picker's color in the tag manager
  on Windows
- Fixed list item indentation in Markdown and Code files
- Fixed a bug that would make Zettlr always save files with regular newlines
  (LF), even if the file originally uses carriage returns (CR) or a mixture
  (CRLF or LFCR), leading, among other things, to save issues (#4959)
- Fixed a bug that would make opening and closing folders in the file manager
  very hard
- The importer will ask for a target directory first now, and no longer use the
  `openDirectory` configuration value as a metric (due to a limitation in the
  dialog engine, this is a bit opaque and will be improved; for more info see
  issue #5084)
- Fixed an issue with the AST parser that has made it impossible to successfully
  parse Markdown tables with empty cells (#5025)
- Fixed an issue with inserting Markdown tables via the popover (#5028)
- Add a somewhat more informative message to the directory selection in the
  file importing workflow
- Improved how focusing the various open editors works (#4889)
- Fixed an issue where some borders in between split views wouldn't be drawn in
  more complex layouts
- Fixed an issue that would not add a newly created file outside the loaded
  workspaces to the list of standalone files, leading to various minor
  annoyances around other parts of the app
- It should now be more difficult to add faulty autocorrect entries (#4961)

## Under the Hood

- Version updates:
  - Pandoc: `3.1.13`
  - Electron: `30.0.2`
- Switched from the `vue-recommended` to the `vue3-recommended` ESLint ruleset
- Removed the config option `sortingTime` since that can be inferred from the
  option `fileMetaTime`
- Removed the config option `zkn.autoCreateLinkedFiles`, since that can be
  inferred from the option `zkn.customDir`
- Simplified tab bar tab retention logic across reloads
- Add the ability to programmatically open the assets window with specified tab
- Failure to fetch a link preview will now simply log a verbose message instead
  of an error
- Reimplement configuration guard options as Maps to allow for volatile state
- Fully remove the renderers's dependency on Node.js's path module to prepare
  for fully sandboxing the window code; instead polyfill the required functions,
  testing them against the module's behavior
- Completely sandbox renderers
- Switched the popover logic away from deprecated plugin syntax to child
  components with `Teleport` (#4663)
- No more JavaScript: With this update, the entire code base (sans build
  scripts) is written in TypeScript.
- Migrated from Electron's deprecated clipboard API to the native Browser API
- Migrated the entire main window store state from Vuex to Pinia
- Fixed an issue with the FSALCache provider where we accidentally stored the
  descriptors as strings, increasing the complexity of loading the cache values
  (see #4269)
- The internal Markdown-to-HTML converter now respects (potentially significant)
  whitespace in the Markdown source to construct the HTML
- The TableEditor now parses any table directly from the underlying parser to
  ensure that the representation is (almost) identical to the parse state and
  reduce complexity when parsing the table; several edge cases remain
- Removed a check for whether certain commands exist; instead we now attempt to
  run them, and if they do not succeed, we catch that error instead; removed
  `commandExists` as it appears to have a few minor issues on Windows installs
- The config provider now allows specifying options that will cause an event to
  be emitted instructing every open MainEditor to reload itself; this can be
  used to change options that affect non-reloadable components such as the
  parser without having to manually close and re-open affected editors, or
  forcing a reload of the entire main window
- MainEditors can now be programmatically instructed by the main process to
  reload themselves with the broadcast event `reload-editors`
- Added the commands `shortcut:install` and `shortcut:uninstall` to add develop
  shortcuts on Linux systems, allowing the simple launching of a binary compiled
  from source (rather than the provided binaries)
- Fixed an issue with showing the appropriate `platformVersion` in the about
  debug info tab
- Move `preventNavigation` utility function into the lifecycle handlers to
  reduce boilerplate code and make the app more secure
- Switched to the new YAML parser (`@codemirror/lang-yaml`)
- Improved linting to include plain JavaScript files, but exclude type checking
- Add build number (= git commit hash) to the debug info of the about dialog
- Simplify exporter types
- Retire the `test-gui` command; instead now the `start` command does the same;
  similarly, `start` won't touch any existing Zettlr configuration anymore
- Simplify CodeMirror theming, retire the `themeManager` and replace it with a
  simpler, more general `darkTheme` extension
- Disallow fuzzy matching during updates of translation files; previously this
  has led to inaccurate results (see, e.g., #5042)
- All renderer processes (= all windows) now have access to Pinia
- Markdown AST parser is now its own module
- Removed `openDirectory` functionality completely from the documents manager;
  instead it is now again managed entirely by using the config provider,
  removing tons of superfluous code
- Properly unmount CodeMirror instances when the `MainEditor` is unmounted
- Reinstated ability to style tags individually again; by targeting classes with
  the format `.cm-zkn-tag-<tagName>` (#4589)
- Fixed a bug that would prevent rendering of citations in certain edge cases
  (#5069)
- The citation parser is now more strict when it comes to `@Author [p. 123]`
  citations: Now only spaces are allowed between the citation key and the suffix
- Improved the i18n runs over the software, improving translatability (#5122)

# 3.0.5

## Dropping Support for macOS 10.13 and 10.14

Due to Zettlr's underlying Electron framework dropping support for macOS 10.13
(High Sierra) and 10.14 (Mojave), Zettlr drops support for these operating
systems as well. To continue to use Zettlr on a Mac, ensure to update to at
least macOS 10.15 (Catalina).

## Linux ARM builds functionally again

Since Zettlr v3.0.0, Linux users on ARM-machines had the issue that they could
not run the app, as a dependency has been compiled for the wrong architecture.
Thanks to efforts by @LaPingvino, this has now been finally fixed and you should
be able to run the app again just fine on ARM computers with Linux.

## GUI and Functionality

- Fix: Segmentation faults in Wayland environments (#4877)
- Fix Linux ARM builds (#4910)

## Under the Hood

- Update Electron from v25 to the latest available release (`v28.2.1`); this
  fixes segmentation fault issues in Wayland environments (#4877) and ensures
  that Zettlr keeps running a supported Electron version, which is especially
  pressing for the Arch Linux repository (see #4887; thanks to @alerque for
  bringing this to our attention), but also means that macOS 10.13 and 10.14 are
  no longer supported
- Switched to Zig compiler to enable successful compilation for Linux ARM
  targets (#4910)

# 3.0.4

## Security patch -- Please Update immediately

Dear users,

a security researcher has brought to our attention an issue that can lead to a
potential remote code execution (RCE) attack utilizing Zettlr's binary. This
issue has been first discovered and exploited in 2023. It is unlikely that you
have been affected, since the effort for this exploit is comparatively high and
it requires you to take some non-trivial actions. However, since we are
committed to making the app as safe as humanely possible to use, and the
corresponding fix was pretty easy to implement, we decided to offer this
security release that includes the same functionality as Zettlr v3.0.3, but with
the added security patch included.

A CVE (Common Vulnerabilities and Exposures) number has been applied for at
MITRE, but not yet issued. Once we know the number, we will publish a postmortem
on our blog and include some background as well as details about what this issue
exactly implied, how it could have been exploited, and how we have mitigated the
issue in this patch.

## GUI and Functionality

Nothing changed.

## Under the hood

- Update Electron to the last version 25 update (`v25.9.8`)
- Add Electron fuses support and disable those that allow certain debug commands
  to be sent to the binary (e.g., `--inspect`). This can be abused by malicious
  actors for remote code execution (RCE) attacks (CVE number applied for at
  MITRE; not yet issued; please see the Zettlr blog for updates)

# 3.0.3

## A Note on Custom CSS

This update includes a full refactor of the theming: The editor themes (Berlin,
Frankfurt, Bielefeld, Karl-Marx-Stadt, and Bordeaux) have now moved to their own
theme files and do not come with standard CSS anymore. This heavily un-clutters
the codebase, but it may impact your Custom CSS, should you use this feature. We
have ensured that no class names change and that the styling is mostly the same,
but the possibility of having to adapt the Custom CSS may arise for some of you.

## GUI and Functionality

- Fixed a visual issue that would handle overly long window titles improperly
- Fixed `Tab` not indenting/unindenting code in the CodeEditors (snippets,
  profiles, etc.)
- Fixed a precedence issue that would make it impossible to use autocomplete
  while filling in a snippet; now, accepting a potential autocomplete has a
  higher precedence than moving to the next tabstop of a snippet, making working
  with snippets more ergonomic
- Images now render more appropriately in inline-contexts
- Updated the German translation
- Fixed the keyboard shortcut for inserting footnotes on Windows and Linux
- Removed the accent color setting: now the accent color will always be the
  system accent color on macOS and Windows, and Zettlr's brand green on Linux;
  themes do not provide an accent color anymore
- Restored syntax highlighting for inline math code
- Fixes an issue that would frequently may make the cursor appear to jump or a
  dialog appearing warning of external changes (#4729; #4732)
- Added some translations
- Generating link previews no longer downloads the entire link target if the
  content is not preview-able
- Improved layout of link previews
- Overly long summaries of link previews are now shortened
- Project properties now adequately resolve the readers and writers of the
  existing profiles, enabling the usage of profiles with extended
  readers/writers (#4699)
- GraphView's labels are now rendered filled instead of stroked, to make it
  easier to read the labels.
- The GraphView does now support multi-window, so clicking a link will open it
  in the last focused window. If the file is already open in a leaf, that file
  will be in that leaf, otherwise it will open the file in the last focused
  leaf.
- `Alt+Click` in GraphView will force the document to be opened in a new tab.
- Zettelkasten links and tags will now be output by our custom Markdown-to-HTML
  parser (i.e., in various places in the app as well as on Copy with Style)


## Under the Hood

- Moved all themes from the `*.less`-files into proper theme plugins for
  CodeMirror v6; this means that they will not provide any global styles
  anymore; any applicable styling has been moved to more appropriate places
  (CodeMirror plugins as well as the WindowChrome and the various remaining
  `*.less` files). We tested the changes out and in our settings, no changes
  were necessary; sometimes you may need to adapt class definitions
- Remove unused color variable definitions
- Move gray color palette to the Window Chrome component
- Fixed an issue where the font definitions were borked and required usage of
  `!important` to make them work (#4719)
- Upgraded all available CodeMirror components to the most recent version
- Replaced `fs.unlink` with `fs.rm` in `safeDelete` to support recursive removal
  of directories
- `fsal-directory::removeChild` now calls `pathExists` instead of `isFile` to
  make sure directories also are removed in removeChild
- `pathExists` wraps `fs.promises.access`.
- (CodeMirror) Move plugin-specific base styles from the main override as well
  as from the themes to the respective plugin files
- Bump Pandoc to version `3.1.9`
- Fixed a weird layouting issue with the code block backgrounds
- DocumentManager's `openFile` does now handle the case when windowId and leafId
  is undefined, by keeping track on the last used editor.

# 3.0.2

## GUI and Functionality

- Fixed a bug that would not parse plain-text links at the end of a line
  completely
- Added two heuristics to plain link parser: (a) if the matched link ends with a
  period, exclude the period; (b) if the matched link ends with a closing
  bracket that does not match an open bracket, exclude the closing bracket
  (remember that you can explicitly define the start and end of plain links by
  wrapping them in `<` and `>`)
- Fixed an issue that could lead to data loss if "Always load remote changes"
  was checked in the settings
- Improved the Czech translation (#4688)
- Fixed an issue that would import Markdown files as LaTeX instead of simply
  copying the file
- If multiple candidate profiles to import files are found, the user can now
  choose the correct one
- Cmd/Ctrl-Clicking on non-rendered Markdown links will now have the same effect
  as directly clicking on the URL part of the link: follow the link
- The link renderer is now native in that it simply hides formatting characters
  instead of rendering a widget in place of the link; making inline formatting
  easier. NOTE: When copying a link as HTML, inline formatting in the
  descriptions is not yet parsed to HTML due to a limitation in the AST parser

## Under the Hood

- Increased the "immediate" save delay from 250 to 500ms to give slower systems
  more time to persist changes to disk
- Replaced direct `access` and `stat` calls for files and directories in the
  FSAL with a wrapper that will later on allow us to keep different file systems
  (e.g., WebDav versus local filesystem) opaque to the user
- Fixed a potentially (?) horrible bug where directory modification times were
  accidentally set to `ctime` instead of `mtime`, leaving any changes to the
  directory that do not also update `ctime` hidden from the FSAL
- Fixed a misalignment of the `InlineCode` element for the Pandoc attribute
  parser
- Upgrade Electron to v25.8.4, mitigating CVE-2023-5217

# 3.0.1

## GUI and Functionality

- Monospaced elements such as inline code elements are now rendered in monospace
  font again
- Fixed a bug preventing assigning colors and descriptions to tags in the tag
  manager
- Magic Quotes detect forward and backward slashes (/ and \\) as non-word
  characters, behind which a starting Magic Quote can begin
- Zettlr now properly uses a proper filename extension on export even when using
  extensions
- The generic text input context menu shows proper labels (#4655)
- Improved the French translation
- Improved the Japanese translation
- Improved the Catalan translation
- Fixed link previews for short notes
- Updated the notification and menubar (Windows/Linux) icons to the new logo
- Fixed a bug that would prevent changing the directory sorting order (#4654)
- Fixed a bug that would sometimes cause the autocomplete pop-up not showing
  when editing an existing Zettelkasten link (#4653)
- Fixed a bug that would sometimes cause the last active tab(s) to not be
  remembered correctly on launch
- Improved calendar view layout
- Fixed a visual bug that would make a distraction-free editor overlay even
  pop-overs
- Fixed a small glitch that would prevent proper visual indented alignment of
  images when inside of list items
- Replace the long "Open image externally" message with an icon on prerendered
  images and move it to the title; also make the message translatable

## Under the Hood

- Fixed the `plainPandocReaderWriter` utility function to properly extract the
  plain reader/writer in all possible configurations
- Improved performance of the math equation parser
- Improved performance of the footnote parser
- Improved performance of the plain link parser
- Renamed the Catalan translation file from `ca-CA` to `ca-ES`
- Moved the notification provider to a utility function
- Refactored Popover logic to use props instead of data for initialization to
  ensure the data is available upon component instantiation, making the logic
  less brittle
- Refactored a hacky solution that would not remember the previous editor state
  when entering distraction free mode and led to various other issues and bugs
- Update Electron to v25.8.1 to mitigate CVE-2023-4863

# 3.0.0

## READ THIS FIRST!

This update brings a host of changes and new features. If you're upgrading from
an older version of Zettlr, you will have to re-do a few things because due to
the extensive changes, we had to adapt how your data is persisted. Here's the
quick list:

1. Your open documents will have to be re-opened once. Regardless of which files
   were open previously, they will all be closed after the update.
2. There are no more unsaved in-memory files.
3. Two default settings have changed in order to maximize benefits from the new
   features: Avoid new tabs is now set to false (since split-panes also allows
   you to spread out your open documents across several panes and windows), and
   Always reload remote changes is now set to true by default.
4. The defaults system has changed. You will see new export options that weren't
   there before, and you will see some weird `export.format.yaml` and
   `import.format.yaml` export options. These are the "old" profiles we have
   kept in case you made modifications. We suggest you copy over all changes to
   the new profiles and then delete them, or rename those old ones to more
   memorable names. Read more below.
5. The TableEditor has received a better save strategy to prevent data loss. As
   it is impossible to fully control the data flow from the visual table element
   into the underlying Markdown document, this data flow is now explicit: Tables
   now feature a save button (with a disk icon) at the top of the table. Its
   background will be green as long as the table has not been modified. Once it
   it modified, the background will turn red. Click the button to apply all
   changes to the document.
6. Quicklook windows are completely gone now.
7. Footnote editing has changed: Instead of editing the footnote in-place by
   `Cmd/Ctrl`-clicking it, there is now an "Edit" button inside the footnote
   preview which, upon clicking, will bring you to the footnote context. This
   has the benefit that you will have full syntax highlighting support as well
   as any shortcuts and commands you may need.
8. We have deprecated the Zettelkasten link start and end configuration
   settings. Both are now fixed to `[[` and `]]` respectively. We have figured
   that nobody needs to configure this, and it makes many parts of our code
   easier.

## Correcting Ordered List Numbers on Move

Moving lines that are part of an ordered list using 'Alt-UpArrow'/'Alt-DownArrow' 
will now also correct the list numbers of any affected lists after the move.

## New Icons on Windows and Linux

For 3.0, we decided that it's time to give our app icons a facelift. For the
past six years, Zettlr sported working, but relatively bland icons to convey its
existence on the taskbar to its users. The new icons still convey the same
message, but you will notice that they now integrate much better into the new
Windows 11 Fluent UI.

We decided to exchange the icons on Linux as well. They may not seamlessly
integrate into your specific UI, but we feel they will definitely look more
modern than the previous iteration of icons.

With this move, the Windows and Linux experience of Zettlr finally moves on par
to the macOS experience, which has received an updated icon with the release of
Zettlr 2.0.

## Split-Panes and Multiple Windows

A long awaited feature has made it into this version: Now you can open multiple
windows and you can split the editor area in every window into multiple parts,
so-called editor _panes_ (sometimes we may call them "leafs" since internally
they are represented as a tree structure. Feel free to remind us in that case
that we're talking to humans, not our code). This means you can now open as many
files as you wish at the same time, and you can spread them out across multiple
windows. This will especially benefit workflows that rely on having open
multiple files side by side to copy information or to read them. However, if you
are happy with the old ways, you can of course opt not to use them. Here's how
it works:

* You can open a new window by choosing the corresponding menu item in the
  Windows submenu, or by pressing `Cmd/Ctrl+Shift+N`.
* You can now drag document tabs not just within the tab bar, but also onto the
  editor area. If you move a document tab to the borders of the editor, a
  shimmer will appear that indicates that you can split the editor to that side.
  If you drop the file on one of the four borders of the editor, this will split
  the corresponding editor in two along the specified direction (left, right,
  top, bottom) and also move the file into that new pane.
* You can also move document tabs between multiple panes by simply dropping them
  in the center of an editor pane. As long as there's no shimmer, the file will
  be moved instead. You can also drop a file onto a tabbar of one of the
  editors, which will have the same effect (but it will be indicated with the
  same blue shimmer as when you are splitting an editor).
* After you have closed the last file inside such a pane, it will automatically
  close itself. If the pane was part of a split, the other pane will then occupy
  the place of the now closed editor pane. To create the pane again, simply drag
  another file to the correct border of an existing editor pane.
* You can resize the panes at will. Unlike the sidebar and file manager, we have
  not implemented any size limits, so with a little bit of care, you can create
  your unique mosaic of files.
* Since we are now not limited to one active file and one set of open files per
  window, these notions have changed their meaning. Now, every editor pane has
  one set of open files and one active file. Each window also remembers which
  pane was last active so that global features (such as the sidebar) can show
  you information based on the most recently focused editor pane's active file.
* Most contextual information (table of contents, list of references, etc.) will
  now update based on the most recently focused editor. In order to make those
  places show information relating to one of the open editors, simply click with
  your mouse inside to focus them.

## New Defaults/Profile File System

This update introduces a new way to work with defaults files. At a glance,
here's what has changed:

* Zettlr now understands the `reader` and `writer` properties of defaults files
* It uses those properties to determine if a file can be used for importing or
  exporting, and displays the appropriate files in the relevant places for you
  to choose
* You can now create new defaults files, rename existing ones, or remove them
* When changing the `writer` or `reader` for such a file, this change will be
  recognized by Zettlr and be treated accordingly
* This also means that Zettlr will from now on only ship with a minimum set of
  profiles; but any additional import/export formats can be created by you with
  just one click
* Additionally, because of this, you are now able to export LaTeX files directly
  without running them through a Markdown interpreter first, allowing you to,
  e.g., create beamer slides or write plain TeX files within Zettlr
* Furthermore, we have dropped our internal reveal.js exporter, since Pandoc
  supports everything we did out of the box (and better) than our exporter

## Tag Manager Update

The tag manager has received a necessary face lift. Now, the tag manager shows
all your tags and allows you to assign/un-assign colors and descriptions. This
makes it easier to assign colors to certain tags without having to remember the
tag first. Additionally, it gives you a better overview over your tags. The info
is now being propagated better across the app, with more places showing the
assigned colors for tags.

Additionally, you now have a better way to consolidate your tags: Within the
tag manager, you can now rename tags in order to clean up your tagging system.

### Splash Screen

As more and more users have increasingly large workspaces, we receive an
increasing amount of feedback that the app start seems sluggish. To indicate
that nothing is wrong and Zettlr simply needs time to recreate the cache, we
have implemented a splash screen that shows if the file loading isn't finished
after one second and displays the boot process to show what is happening behind
the hood.

### Migration Guide

There are two instances where you will want to migrate something.

#### Old defaults files

Since Zettlr will never remove any data without asking, it will keep the
previous files in your defaults directory. Now that their filename is also
meaningful, you can see them by their naming structure: `import.format.yaml` and
`export.format.yaml`. You are free to remove them or rename and keep them.

Zettlr ships with a set of new files that are now additionally appropriately
named. Those files are "protected". Protected files have a small lock icon next
to their name. Protected means that if you delete or rename them, they will
automatically be recreated. You can use this to your advantage: By deleting such
a file, you are effectively resetting it to factory default (good if you forgot
what you changed). By renaming such a file, you can effectively make a copy to
have several versions of the same settings depending on your needs.

#### Reveal.js Presentations

Since we have now dropped our internal reveal.js exporter, there are a few
changes you have to make to your existing reveal.js presentations. First, the
theme must now be defined in a YAML frontmatter instead of via the dropdown. A
minimal working YAML frontmatter will look like this:

```markdown
---
theme: league
---

... the rest of the file
```

Supported theme values are:

* `beige`
* `black` (the default, in this case you can omit the `theme` variable)
* `blood`
* `league`
* `moon`
* `night`
* `serif`
* `simple`
* `sky`
* `solarized`
* `white`

Then, in order to get a working reveal.js presentation, you have to make sure
that the property `standalone: true` is inside the profile (this is the
default). In order to additionally copy everything into the HTML file to create
a truly self-contained presentation, set the property `self-contained: true`.

All other things should work as before, but may require a small tweak here or
there.

## GUI and Functionality

- **New Feature**: You can now open multiple main windows, each with their own
  files loaded
- **New Feature**: You can now arbitrarily split the editor area into multiple
  editor panes to keep open as many files at the same time as you wish
- **New Feature**: After a long time, you can now again drag and drop entries in
  the table of contents in the sidebar to rearrange sections of your file
- **New Feature**: Overhauled, improved, and streamlined the defaults file
  system used by the importer and exporter
- **New Feature**: You can now pin tabs, which prevents them from being closed
- **New Feature**: The editor will now check your Markdown for potential style
  issues (can be disabled in the preferences)
- **New Feature**: In the combined filemanager mode, you can now see writing
  targets as a ring progress bar in the position of the file icon
- **New Feature**: Zettlr can now automatically update internal links (Wiki/
  Zettelkasten style) if you rename a file
- **New Feature**: When you hover over a link, you can now get a link preview
- **New Feature**: Zettlr now features a LanguageTool integration. You can turn
  it on in the Spellchecker settings and even provide your LanguageTool username
  and an API key to unlock premium features
- **New Feature**: You can now activate a statusbar that shows some context-
  specific information for each editor pane you have open; this statusbar also
  shows you information for code editor panels, e.g., in the assets manager
- **New Feature**: Changing a certain set of configuration options will make
  Zettlr ask you whether you wish to restart the app for the changes to take
  effect
- **New Feature**: While modifying import and export profiles, Zettlr will now
  check them for validity, and inform you of any potential errors
- **New Feature**: You can now specify the Pandoc working directory in a file's
  frontmatter with the property `pandoc_working_dir` within the `zettlr`
  object
- **New Feature**: Right-clicking on a file or directory now also gives you the
  option to copy the absolute file or folder path to the clipboard
- **New Feature**: There is now a new menu item that allows you to conveniently
  clear the FSAL cache in case of some errors
- **New Feature**: A new gutter to the left side of the editor will now display
  arrow buttons next to footnote reference bodies that will select the
  corresponding footnote reference up in the text upon click
- **New Feature**: Add splash screen to indicate FSAL loading progress
- Note preview tooltips now display a sanitized HTML version of the note's
  Markdown contents
- **New Feature**: Both entire YAML documents (including both profiles and
  regular files) as well as YAML frontmatter sections in Markdown documents are
  now linted, providing a visual indication that a piece of YAML code contains
  syntax errors that prevents, e.g., Zettlr from detecting the file's title or
  Pandoc from properly reading the metadata of the document
- Removed the "Get LaTeX" menu item since (hopefully) now the advice in the docs
  and in the tutorial are sufficient
- Replaced the old Markdown-to-HTML and HTML-to-Markdown converter with more up-
  to-date modules. This should not change how pasting from HTML or copying as
  HTML work, but it could.
- The TableEditor now has a clear data saving strategy: Whenever you change a
  table, you need to manually click the disk icon at the top of the table to
  apply all your changes to the document so that it can then be saved
- Quicklook windows are gone completely now, since they can be more than
  replaced by the new split views and multiple windows
- The windows now finally correctly remember their positions, fixing an old bug
- Improved the link tooltip inside the editor; it will show faster now and is
  easier to access
- Zettlr now recognizes Quarto Markdown files (`*.qmd`)
- Code files (e.g. `*.tex` or `*.json`) now have line numbers enabled and the
  margins of the main editor removed by default
- The sidebar tabs are now static at the top, meaning you don't have to scroll
  up within a long list just to see the tabbar
- Lists (especially in the assets manager) now also allow you to remove entries
  with a right click
- Fixed the Simple PDF, Textbundle, and Textpack exporters
- Added new variables for snippets:
  - `CURRENT_ID`: Holds the currently assigned Zettelkasten ID to the file
  - `FILENAME`: Holds the filename of the current file
  - `DIRECTORY`: Holds the directory path for the current file
  - `EXTENSION`: Holds the file extension for the current file
- Fixed inability to move the text cursor while renaming files in the file tree
- Fixed ability to case-sensitively rename files
- Fixed an incredibly dangerous bug that would lead to data loss if the app was
  being shut down before the statistics provider has been booted up; in which
  case the provider would overwrite sometimes several years worth of statistics
  with empty data
- Added the ability to use mouse buttons 4 and 5 for forward/backward navigation
- Fixed a visual glitch on Linux where in dark mode the active tab would have no
  colored bottom border
- Added a third exporter option: You can now have Zettlr ask you everytime where
  it should store an exported file
- In case of an error, the error dialog will now also present the Pandoc error
  code
- Fixed a minor bug in toolbar toggle controls that necessitated clicking them
  twice to bring them into the "active" state (holds especially true for the
  sidebar toggle)
- Fixed faulty updates on Windows: Now the downloaded file should be opened
  without any errors
- Middle-mouse clicks on the collapse/uncollapse indicators in the file tree
  should no longer trigger scrolling behavior on Windows
- File tree items now show their absolute path on mouse hover
- Clicking a directory will now also uncollapse it without having to click on
  the arrow
- The graph view now uses as labels YAML frontmatter titles, first headings
  level 1, or a filename without extension based on the preferences
- Fixed a usability issue on macOS where if you wanted to select a BibTeX file
  for your citations you had to click through intransparent buttons before being
  able to; now you can immediately select both CSL JSON and BibTeX files
- Parsed links will now show the correctly resolved link as titles
- The file tree now properly cuts too long file and directory names, indicating
  these with an ellipsis, rather than simply cutting off the text mid-letter
- Pressing `Cmd/Ctrl+S` while a TableEditor is focused, this will now trigger an
  update that applies the changes to the underlying document. In other words,
  when editing a table, you can press `Cmd/Ctrl+S` twice to first apply any
  changes from the table to the document and second save the document itself.
- The editor now recognizes Pandoc attribute syntax (e.g., `{.unnumbered}`)
- Added `lua` syntax highlighting support
- Improved the tutorial to make use of the new split views
- Citation keys in the autocomplete dropdown are now sorted by number of
  occurrences in the text
- Fixed the readability mode color gradient (red -> purple -> blue -> green)
- The "Save changes" dialog is now simpler and easier to understand
- The main editor is finally properly styled and looks more natural to work with
- Pre-rendered citations within Zettlr now respect the composite flag, meaning
  that `Some sentence by @Author2015` renders as
  `Some sentence by Author (2015)` instead of `Some sentence by (Author 2015)`
- Tags now include a measure of informativeness or uniqueness, called Inverse
  Document Frequency (IDF); the higher this value the more informative a tag is.
  This number is shown in the tag manager, and tags are ordered by this in some
  places
- The file autocomplete now also includes links to not-yet-existing files. This
  enables you to define links to files that you may want to create at another
  point in time and ensure that all files that link to this file include the
  correct link
- The editor now uses the built-in search panel from CodeMirror
- Added support for COBOL syntax highlighting
- Zettlr can now recognize changes to the Zettlr directory files (where things
  such as sorting and project settings are stored), which means that, if you
  have Zettlr open on two computers and synchronize your files, changes you make
  in one app should be picked up by the other
- Zettlr can now detect changes to the status of a directory as a git repository
  during runtime
- The "Characters without spaces" info is no longer present in the toolbar
  counter widget; the "characters" count now represents always the count without
  spaces across the app
- Mermaid charts now dynamically switch themes between `default` and `dark`
  depending on the app's display
- In various parts of the app, URLs will now be displayed in a shortened format
  if they are long and the space is limited
- If you make use of glob-patterns to filter which files will be exported during
  project exports, you will now get a visible error message if your glob-
  patterns have removed all files so that none remain to be exported
- Clicking on the "Project Properties" button in a directory properties popup
  with activated project functionality now closes the popup
- Redid the emphasis renderer to work on the SyntaxTree directly, which makes
  the emphasis render more properly and now works much faster than before
- Users on macOS can now disable window vibrancy
- Non-existing citekeys in the document no longer cause the list of references
  to be empty
- Dark mode is now set to `system` by default for all operating systems, not
  just macOS/Windows
- A new "match whole word" setting allows to control whether AutoCorrect can
  also correct partial words
- The tutorial is now available in Dutch as well.
- The combined file tree is now more verbose when it comes to icons: Folders
  now always have icons to indicate that they're folders (can be overridden with
  a project icon or a custom icon), and Markdown files have a more distinct icon
- Made the code block autocomplete more resilient in interaction with European
  keyboard layouts' dead key mechanism
- Contrain tooltips to a reasonable size, mainly to prevent overly long lines
  that are uncomfortable to read when the tooltip spans an entire fullscreen
  window

## Under the Hood

- Refactored the main editor component further
- Refactored the Sidebar panels into their own respective components
- Upgrade Electron to `25.x.x`
- Upgrade Pandoc to `3.1.6.2`
- Pandoc is now also available natively for Apple Silicon (darwin arm64)
- Upgrade Chart.js to `4.x.x`
- Upgrade CodeMirror to version 6
- Upgrade to Yarn v2
- Exchange `electron-devtools-installer` with `electron-devtools-assembler`, as
  the former appears to be unmaintained
- Moved from Electron Builder to Electron Forge for building Debian and RPM-
  packages, since Electron Builder seems to produce a few errors which Forge
  doesn't
- Switch from deprecated `@clr/icons` to `@cds/core`
- Pandoc logs are now logged in every case
- Improve the display and functionality of log messages
- Switched the configuration file management for the different service providers
  from the previously very bodged methods to the unified and new
  PersistentDataContainer
- Changed the default ports for the logging server to 9001 to avoid collisions
  with PHP fpm installations on development systems
- The yaml frontmatter title property is now its own property on file
  descriptors to centralize the extraction logic and save some code on the
  renderer's side
- Extracted the ID extraction functionality to its own utility function
- Fixed a bug that would incorrectly detect Python comments or C++ pragmas as
  tags
- Removed all `Meta` descriptors; now all descriptors are unified across main
  and renderer processes
- Documents are now no longer managed by the editor leafs. Instead, they are
  managed by the document provider
- Completely removed all instances of `hash`; the FSAL cache now is being called
  with absolute file paths. Hashed paths are only used to determine the shard.
- Exchanged `nspell` with `nodehun` so that we can load any Hunspell-compatible
  dictionary file in Zettlr, including the previously too-complex ones such as
  the Italian or Portuguese dictionaries
- Fixed the build pipeline so that native Node modules are now code-signed and
  work on macOS and Windows, meaning that `chokidar` should not need to fall
  back to CPU intensive polling anymore
- Sandbox print preview window iframe elements
- The update check will no longer block the boot cycle, making start up times
  fast even in degraded Wifi contexts where there is a connection, but extremely
  slow
- Zettlr now attempts to extract the version strings for supported external
  programs (such as Pandoc, Git, and Quarto) and displays them in the About panel
- Exchanged Zettlr Translate system with `gettext`
- Removed the translation provider, since its remaining functionality to list
  available dictionary files and translations has now been moved to the main
  command hub
- Removed the `Zettlr` class; the last remnant of the old, class-based system
- Remove deprecated modules `svg-inline-loader`, `raw-loader`, and `file-loader`
- Removed unused Markdown Syntax Tree tags
- Separate frontmatter detection and inner (YAML) parse responsibilities
- Remove the `info` property from YAML frontmatter blocks in Markdown AST

# 2.3.0

## GUI and Functionality

- **New Feature**: You can now customize the toolbar and add or remove buttons
  as you see fit
- **New Feature**: You can now navigate the file tree with the arrow buttons
  after activating the quick filter; use up and down to visually move through
  the visible items and left/right to collapse/uncollapse a directory; use Enter
  to "click" that item
- **New Feature**: The document tabbar now features buttons so you can easily
  scroll horizontally through many tabs
- Added "Copy filename", "Copy path", and "Copy ID" items to document tabs
  context menus (thanks to @kyaso)
- Added "New File", "Next File", and "Previous File" buttons to the toolbar
- The query input now gets blurred when starting a global search in order to
  prevent the dropdown from showing up, especially during auto-searches
- Added keyword/tag CSS class names to YAML frontmatter tags
- Added the last modification date to the file list, even if the additional info
  setting is turned off
- The "restrict to directory" field will now be empty by default
- Pressing `Tab` while the query input is focused will now directly focus the
  restrict-to-dir input
- The table of contents in the sidebar now shows the title of the currently
  active file, if applicable
- Removed the less-than-helpful file and folder removal shortcuts
- Fixed the recent documents menu on Windows
- Fixed wrong character count if counting without spaces
- Fixed wrong word count for indented lists
- Fixed wrong keyword/tag CSS class names
- Fixed jumping of the code editor in the assets manager
- Fixed wrongly positioned tabstops during snippets autocomplete
- Fixed an error that would erroneously render citations in footnote previews or
  copied text with styling

## Under the Hood

- Ignore `IDEA`-related files
- Update Pandoc to `2.18`
- Refactored the main window's store to be more modular for the upcoming
  additional changes
- Added an additional check for frontmatter values in code files

# 2.2.6

## GUI and Functionality

- A malformed directory settings file now does not prevent loading the
  directory; instead the malformed file is now removed
- Fixed a small visual glitch on Linux where the selected file was not
  highlighted in the file list in the thin or expanded file manager modes
- Fixed heading ID links not working with, e.g., accents
- Fixed heavy latency when working on a file with many related files

## Under the Hood

- Simplify the codeblock class hook again to significantly improve typing speed
- Updated all dependency packages to the respective latest versions

# 2.2.5

## GUI and Functionality

- Localized Previous/next file menu items
- Fixed selection of words on right-click in the editor
- Editor word selection on right-click now accepts both `'` and `’`
- Add Fortran syntax highlighting (keyword `fortran`)
- Fix a bug that could lead to data loss when changing documents while a table
  has focus
- Added an extra check so that unexpected values of `openDirectory` would not
  prevent Zettlr from starting
- Make the vim command line visible and style it according to the Zettlr themes
- Clicking on the toolbar now doesn't steal the focus from other elements,
  making it more comfortable to drag the window and immediately continue writing
- Added slight transparency to the inline code background color so that block
  cursors are visible inside that code
- Resizing an image upon pasting from clipboard now works better, since the
  aspect ratio will only be recalculated once you leave the input field (i.e. by
  tabbing into another input); this way you can just type in a specific number
- Disabling "render task lists" will now also disable the application of task
  lists; this helps speed up editing long documents with many tasks
- The main editor search now no longer automatically searches
- When opening the main editor search, anything in the search input will now be
  selected
- Fix unintended global search start
- Highlight results from global search in the main editor text
- The code editor in the assets manager now scales with the size of the window
- Added an option to prevent Zettlr from checking for updated translations

## Under the Hood

- Switched to the new code signing certificate for the windows installers
- Write errors which are logged properly to disk
- Display errors in the log viewer
- Added the default Homebrew installation directory for Apple Silicon Macs in
  order for Zettlr to find Pandoc installed via brew.
- Improve global search typings

# 2.2.4

This update changes the scroll effect on the document tab bar to be smooth
instead of snappy. To revert to the old behavior, you can use the following
Custom CSS:

```
body div#tab-container {
  scroll-behavior: auto;
}
```

## GUI and Functionality

- **New Feature**: You can now switch between zooming the whole GUI or just the
  editor font size when using the zoom menu items/shortcuts
- Restores the display of links in the related files section of the sidebar
- Differentiate between inbound, outbound, and bidirectional links in the
  related files section
- Fix related files display and link reporting
- Added a smooth scrolling effect for the tab bar
- Added classes in order to conditionally style the related files section based
  on the type of relation, the classes are `tags` if the relation is based on
  keywords, `inbound` for incoming links, `outbound` for outgoing links, and
  `bidirectional` for links from and to the said file
- Clicking on math now places the cursor correctly, reducing friction
- Select the image markup when clearing a rendered image by clicking on it
- Image captions do not disappear anymore while you are editing it, even if you
  move the mouse out of the image area
- Improve icon alignment in the related files section
- Relaxed conditions for emphasis rendering by just excluding word-characters
- Tab characters are no longer detected as spelling errors
- You can now choose to indent using tab characters instead of spaces
- Do not close the file left to a new usaved file upon saving the file
- Fixed a weird race condition in which the file manager would remain ignorant
  of an in-memory file after it has been saved to disk
- Changes to your files should now be detected immediately also on macOS
- Fixed a bug that would disable both types of magic quotes (single + double)
  if you disabled only one type
- Improve styling of progress bars on all platforms

## Under the Hood

- Resolve links on-demand in the link provider
- Factor out the `clickAndClear` functionality to its own helper
- Improve editor image CSS
- Factor out the checks to see if we can render some element to unify behavior
  across rendering plugins
- Update most pure Node scripts from CommonJS to ESM in order to support the new
  versions of csso, chalk, and got
- FINALLY managed to get fsevents to run! After about three years or so.
- Add support for JabRef `fileDirectory`-style comments

# 2.2.3

## GUI and Functionality

- The graph view now only updates when the underlying link structure has in fact
  changed
- Fixed an issue that would break project exports since we accidentally passed
  not just Markdown and code files, but also everything else in that directory
  to pandoc (including, but not limited to, PDFs, HTMLs, images, etc.)
- The graph view now supports displaying labels permanently; useful for smaller
  graphs
- Better graph sizing
- You can now highlight specific vertices based on text matching on its path
- The graph view scrolling has now been replaced by moving zoom, i.e. wherever
  your mouse cursor is when you zoom, the graph will zoom in ever so slightly
  onto that position
- Tags/keywords in a YAML frontmatter are now properly lowercased
- Massively improve the speed of graph building
- Fixed an error that would prevent the creation of new directories
- Fixed a bug that would always export a revealJS presentation using the black
  stylesheet
- Fixed commented entries in the YAML frontmatter being detected as headings
- The file tree now remembers which directories are opened for longer
- Make the emphasis rendering plugin less aggressive

## Under the Hood

- Remove the dependency on the LinkProvider within the FSAL
- The LinkProvider now only updates when necessary; easing the load on the graph

# 2.2.2

This update includes a long-awaited feature: Graph views. This brings Zettlr on
par with other apps such as logseq or Obsidian. You will find the graph view in
the stats window, which you can open as usual by clicking the statistics button
on the toolbar. The graph will re-render as soon as something in the link
structure of your notes changes. Rendering may take some time, however -- not
because constructing or displaying the actual graph takes so much time, but
rather, because resolving internal links (which can be either IDs or filenames)
takes a long time.

Within the graph view, you can interact with it in a few ways:

* You can tick the checkbox to exclude isolates from rendering, that is: files
  which are not linked to any other note
* With the `+` and `-`-buttons, you can zoom in and out of the graph
* Using the dropdown menu, you can restrict rendering to a single component.
  These clusters of files are ordered by size, so the first components in the
  list are the biggest in your network of files. Note that isolates are excluded
  from this list
* By utilizing the trackpad or scrollwheel of your mouse, you can scroll both
  vertically and horizontally; dragging does not work yet
* Clicking the target button resets the view on the graph to its origin if you
  have scrolled someplace else
* Clicking on a note will open it in the main window just as if you had clicked
  on the note in the file manager

Note that the graph view is still in its early stages. It works as advertised,
but since networks can be very tricky, there is a lot of room for improvement.
You will notice that we publish this new feature using a patch release (2.2.2
instead of 2.3.0). The reason is that we cannot finalize this feature in any way
without the feedback from the community. So for this feature, we would like to
invite you to provide feedback -- not just about potential bugs, but about
things we should improve in the visual feedback the graph view gives you.

See this as an opportunity: Whereas the graph views of Roam, logseq or Obsidian
are pretty much in a final stage, Zettlr's graph view is still a blank canvas
upon which you can project your ideas that help us all make sense of the chaos
that is the network of our files!

## GUI and Functionality

- **New Feature**: Zettlr now finally offers a graph view of all notes in the
  statistics window; clicking on a vertex opens the file in the main editor, and
  you can choose to hide isolates
- The full-text search doesn't skip files whose title and/or tags match the
  search terms anymore
- Hovering the mouse over a document tab now shows the full path of the file
- Ensure that in-memory files which are saved outside the workspaces are still
  added as root files
- Use a more appropriate cursor for resizing the split views

## Under the Hood

- Add d3 as a fixed dependency in `package.json`; lock to the version from
  mermaid
- Fix a dependency race condition in the service container
- Make error messages more meaningful
- Enable renderers to search for files using an internal link

# 2.2.1

## GUI and Functionality

- Fixed an error that would under certain circumstances crash the application on
  start
- Fix an error that would make some actions unusable if a faulty translation was
  provided
- Fixed an issue where sometimes moving the cursor to the beginning of a list
  item would misbehave
- Zettlr now detects if a directory is a git repository and displays this
  information in the directory properties
- Zettlr can now also preview emphasis such as italic or bold text
- Using an absolute path as the default image location will ensure that pasted
  images will be inserted using absolute paths as well.
- Sometimes, something goes wrong when you start the application; now you will
  receive an informative message box if that happens, so that reporting problems
  will be easier

## Under the Hood

- Other files are now stored in the `children` array; the `attachments` array is
  now gone for good
- Removed old remnants of the experimental WYSIWYG mode, since Zettlr now offers
  this via the ensemble of all rendering plugins in the main editor
- Incorporate the logic to disambiguate ID and filename links into
  `FSAL::findExact()`
- Improve findObject utility function
- Resolve outbound links directly in the link provider

# 2.2.0

**Attention**: This update switches one preference in the exporters' defaults:
`file-scope` is now removed. Remove this line from your defaults files, or reset
them to the (new) default, if you'd like to use this in your exports as well.
See for more info [this issue](https://github.com/Zettlr/Zettlr/issues/3103).

## GUI and Functionality

- Tags and keywords within a YAML frontmatter are now clickable
- AutoCorrect values are no longer detected as spelling mistakes
- Fix an issue with false detection of footnote reference texts
- Fix link resolving: Now files dropped onto the editor will be easier to detect
  as files (rather than weblinks)
- Fixed reloading issues with very large citation databases
- Fixed a visual glitch when choosing to "Open in a new tab" in a note preview
- Fix a regression that inserting pasted image paths into the editor didn't work
- Fix wrong display of citations if there was an error rendering the citation
- The tutorial is now also available after the first start; you can reopen it
  any time from the Help menu
- The autocompletion popup doesn't disappear anymore if you completely remove
  anything already written to begin anew
- Fix a bug that would with some installations result in a blank main window.
- Fixed a bug that would sometimes not update the tag autocompletion
- Ensure documents are saved when renaming a directory
- Do not show "Open Image Externally" if loading a data URL
- Improve styling for the "No results" message on file tree filtering
- Newly created files now always open in a new tab
- Fixed a bug where you would receive two "paste image" dialogs if you had text
  selected when pasting an image onto the editor
- Fixed conflicting text decorations between strikethrough and spellchecking
- Fixed a bug where a YAML frontmatter beginning and end would also be
  recognized even if it was not valid. A valid YAML frontmatter must be
  delimited by exactly three dashes/dots on their own line, and *not more*

## Under the Hood

- Update Pandoc to 2.17.1.1
- Activate watchdog polling for the citeproc provider. This should reduce issues
  with very large citation databases.
- If the error message upon a failed database reload indicates that the file was
  simply incomplete, the citeproc provider now attempts a second reload after a
  delay of 5 seconds
- Moved the workspace and root file opening logic into their own command
- Make the ZettlrCommand base class abstract and require constraints on derived
- Remove all calls to `global` in the renderer processes; instead properly type
  the API provided via the window object
- Refactor the main process:
  - Move the FSAL, the WindowManager, and the DocumentManager into the service
    provider realm
  - Factor out all commands into a new CommandProvider
  - Use singleton dependency injection to provide services to each other,
    utilizing an AppServiceContainer
  - Remove (almost) every dependency on the `global` object
  - Move the littered code from the Zettlr main class into their corresponding
    service providers
  - Fixed the dependency hell within the FSAL
- The app doesn't attempt to download the Vue3 devtools in production anymore
- The date formatter now takes everything as parameters and has unit tests

# 2.1.3

## GUI and Functionality

- Display inline math using monospaced font
- Right-clicking citations doesn't select parts of it anymore
- Inline-equations are now properly syntax highlighted
- Fixed a bug that caused unintentional pastes when closing a tab using the
  middle mouse button on Linux
- Heavily improved the full text search: Previously, certain files that should
  have been returned for specific search terms were not considered a match, and
  multiple results per line were mostly not reported; additionally, search
  results are now ordered by relevancy and the search results are marked more
  visibly
- Heavily improved the table editor user interface: Now the table editor will on
  certain actions write all changes back to the document so that the possibility
  of data loss involves a single table cell at most in case the user forgets to
  un-focus the table. Furthermore, the table editor will now not be removed from
  the document when it loses focus, and instead the table will be updated
  silently
- The log viewer now only displays errors and warnings initially
- Fix a small visual glitch on macOS for toolbar searches
- Added "Open in new Tab" button to link preview tooltip, when user has
  preference "Avoid Opening Files in New Tabs" set to true
- Fix `Use the CodeMirror default actions for Home and End` preference not
  working on MacOS
- Fix task item strikethrough appearing laggy
- Fix task item strikethrough covering the preceding whitespace
- On macOS, file tree icons are now displayed using the theme/system color. On
  all platforms, you can customize the appearance using the selector
  `body .tree-item clr-icon.special` (including platform/mode selectors)
- Improve the readability mode: Now it will not render a YAML frontmatter and it
  will additionally treat sentences smarter than before
- Fixed an issue that would sometimes break images when you edited the caption
  in the rendered image caption.
- Enable resetting of the custom Zettelkasten directory
- The default value for "Use system accent color" is now off for all platforms
  except macOS
- The app now remembers if you had the sidebar open, and which tab you selected
- The app now remembers your recent global searches
- The file tree now expands when you are filtering for files/directories
- Translate the auto dark mode start/end setting strings
- The ToC now displays the currently active section
- Fix file manager always showing word count, even if user selected character
  count in preferences
- When clicking on a heading in the ToC, the cursor is now set to that heading
  and the editor is focused immediately
- Fix recent documents items not being clickable in Linux
- Fix drag & drop of files onto the editor
- Fix some bugs in the link opener

## Under the Hood

- Update Pandoc to 2.17
- Removed the unused PDF settings from the config
- Removed the unused `pandoc` and `xelatex` config options
- Convert all MarkdownEditor hooks and plugins to TypeScript
- Tests now simply transpile without type checking
- Move service provider types to the new types directory
- Provide `@dts` as an alias to retrieve typings
- Move FSAL types to the new types directory
- Convert the remaining utility functions to TypeScript
- Polyfill the `path` module in renderer processes
- Convert the MainSidebar component to TypeScript
- Move out the statistics calculation from the FSAL
- The `yarn package` and `yarn test-gui` commands now skip typechecking,
  reducing build time by a large margin

# 2.1.2

## GUI and Functionality

- **New Feature**: You now have more fine-grained control over how your files
  are displayed: You can now select if the filename is always used or a title
  or first heading level 1 is used (if applicable)
- **New Feature**: You can now also fold nested lists
- **New Feature**: You can now choose to display the file extensions of Markdown
- **New Feature**: You can now choose to always only link using filenames
- The Vim input mode of the editor started working again, so we are re-enabling
  it with this update
- Fixed an error that would cause the global search to malfunction if you
  followed a link which then started a global search while the file manager was
  hidden
- Removed an unused preference
- Rearranged some preferences
- On Windows, tabbed windows will automatically hide their labels if the window
  becomes too narrow
- Reinstated the info on what variables you could use in the Zettelkasten
  generator
- Zettlr displays info text below some preferences again
- Citations are now first-class citizens and got their own preferences tab
- Fixed a small error that would close additional files when you renamed a file
  that was also currently open
- Fixed the context menu not showing during a full text search on macOS
- When something goes wrong during opening of a new workspace or root file, the
  error messages will now be more meaningful
- Small improvement that will not detect Setext headings level 2 without a
  following empty line. This prevents some instances of data loss where users
  forget this empty line and thus accidentally create a valid simple table
- Fixed an issue where the indentation of wrapped lines would look off after
  changing the theme or modifying the editor font via custom CSS
- Fixed the vim mode cursor being barely visible in dark mode
- Done task list items will now be stroked out faster

## Under the Hood

- Convert the MarkdownEditor to ES modules and TypeScript
- Make the `dot-notation` rule optional

# 2.1.1

## GUI and Functionality

- **New Feature**: Zettlr now accounts for backlinks to the currently active
  file, which means it now displays files which link to the current file in the
  sidebar
- New setting: You can now choose to hide the toolbar while in distraction-free
  mode
- Improved placement of the popup displayed by the Input Method Editor (IME) for
  writing non-alphabetic characters (e.g. Chinese, Japanese, or Korean)
- During drag&drop, you can now rest over a collapsed directory for longer than
  two seconds to have it automatically uncollapse -- this way you can reach
  deeper nested directories without having to stop the operation
- Clicking a search result in the global search sidebar will now highlight it
  in the sidebar
- The search now also starts when you press Enter while the restriction input is
  focused
- If you abort moving a file by dropping it onto its source directory, Zettlr
  will silently abort the move without nagging you about the fact that the
  target directory obviously already contains a file of the same name
- Renaming root-directories will now ensure the new path of the directory is
  persisted to the configuration
- Fix a rare error that would incapacitate the Math equation renderer
- Fixed an error that would sometimes prevent the autocomplete popup to close
  until the main window was closed and reopened (or the app is restarted)
- Fixed an error that would prevent a global search if no directory is selected
- Fixed a bug that disabled the table insertion toolbar button in the previous
  version
- Fixed an issue preventing updates of lists in the preferences
- Fixed an issue not displaying the currently selected theme in the preferences

## Under the Hood

- Update to Electron 16
- Make sure to de-proxy the tag database before sending it to the MdEditor
- Remove the `openDocuments` array from the Vue component data
- Convert the MainEditor component to TypeScript
- Added a `@providers` alias for easy referencing of service providers

# 2.1.0

## GUI and Functionality

- **New Feature**: Implemented "forward" and "back" actions, which are
  especially useful for people managing a Zettelkasten and frequently follow
  links: Now you can go back and forth between opened files (shortcuts:
  `Cmd/Ctrl+[` and `Cmd/Ctrl+]`) so you can more quickly navigate your files
- Fixed an error in the link filtering process that would throw an error when
  you attempted to remove internal links completely upon export
- Fixed `Cmd/Ctrl-Click`-behavior on footnotes
- Dragging and dropping files (both from the desktop and the sidebar) now always
  inserts relative paths
- More reactive updating of the related files section
- Improvements during insertion of snippets
- The footnote editor now has a consistent background color in dark mode
- You can now open linked files from within the preview tooltips
- Removed the shortcut to rename directories since that was rarely used and
  could confuse users since it was not obvious where the directory is in the
  file manager
- Moved the file renaming process via shortcut to the document tabs since it's
  much more visible there
- Fix a very rare bug in which selections inside headings would look off
- Fixed an error that would fail the print preview if you had images with
  relative paths in your document
- Internal links to files that contain a period should work now (except what
  follows exactly matches an allowed Markdown file extension)
- Scrollbars on Windows and Linux should now switch colors according to the
  app's dark mode setting
- Zettlr doesn't detect links to other headings in the form of `[link](#target)`
  as tags anymore
- Reinstated the ability to use pure number tags or hexadecimal numbers as tags
- Using the shortcut `Ctrl-Shift-V` to paste something as plain text will no
  longer paste it twice on Windows and Linux
- Zettlr can now be started minimized (in the tray/notification area) by passing
  the CLI flag `--launch-minimized`, which means the main window will not be
  shown after launching the app
- On single-file export, unsaved changes are now also exported
- MagicQuotes can now surround selections
- File duplication will now make sure to always create new files instead of
  overwriting existing ones
- Attempt to scroll back to the correct position after applying remote changes
- Adapt styles on Windows
- You can now specify a TeX template and an HTML template for projects
- Fix double titlebars on Windows and Linux when displaying modals
- Following internal links now also works for systems in which the ID is part of
  the file name
- Updated the display name in the Add/Remove Programs entry for Windows
- Task list items in the editor are now correctly spaced again
- Fixed a bug that would render it impossible to open images and files with non-
  ASCII characters within their path
- You can now copy the underlying equation code for LaTeX equations

## Under the Hood

- Added a further check to the filter copying. Since the filters that ship with
  Zettlr are bound to the inner workings of the app, we should always overwrite
  them if applicable (to ensure they are updated with the app), unlike the
  defaults which people should be able to modify without us messing with them
- Sanitized and standardized all Vue component names and app entry points
- Fix a whole bunch of linter warnings
- Remove the custom event system (`$on`, `$off`, and `$once`) in preparation for
  Vue 3
- Switched to Vue 3 (incl. Vuex 4, vue-loader 16, vue-virtual-scroller 2)
- The state is now being instantiated using a function which adds reactivity
- The modified documents are now updated in such a way that attached watchers
  are notified
- The snippet insertion process is now much more precise and allows snippets to
  be inserted at any point within non-empty lines without any quirks
- Update Pandoc to 2.16.2
- The VS Code debugger now uses the `test-gui` configuration and not the regular
  (potentially critical) main configuration; NOTE that this means you must run
  the `test-gui` command first to generate that data-dir in the first place
  before starting the debugger
- Cleaned up the handler for rendering task-list items
- Switched the windows update, tag-manager, stats, quicklook, project-properties,
  print, paste-image, log-viewer, error, assets, preferences, and about to
  TypeScript
- `extractYamlFrontmatter` does not require the linefeed anymore
- Remove the `openFile` method from the main Zettlr object. Use
  `getDocumentManager().openFile` instead to open a file
- Add an automatic updater for `CITATION.cff`
- Zettlr now extracts outlinks from a file and adds them to descriptors
- Added `@common` as a shorthand alias for importing files within the `common`-
  directory
- The file autocompletion database now uses the full paths to index files

# 2.0.3

## GUI and Functionality

- **Default changed**: The exporter's HTML defaults have now `self-contained: true`
  instead of previously `self-contained: false` -- make sure to update your
  settings accordingly!
- The editor dropdown list now won't be wider than the window, even if you have
  very long citations or keywords
- Removed the leading `#` in the tag cloud
- Allow tags to be sorted by name or count
- Re-introduce the project properties window, since the place within the popover
  was very limited and people have begun calling for more features, so we need
  the space of a dedicated window
- Image caption changes are now also saved when the text field loses focus
- Reworded "night mode" to "dark mode" consistently
- Fix a minor design glitch
- Removed the previous HTML template; now Zettlr uses Pandoc's default
- Fix a small visual glitch that would show link tooltips in unexpected
  locations
- Fixed a small bug that would make Zettlr treat numbers at the beginning of a
  line as a list too often. Now typing, e.g., "21.12.2021" will not yield a
  "22." on the next line
- Changing heading levels using the context menu on heading markers will no
  longer insert the new heading level at arbitrary positions in the document
- Fixed the accessibility to screen readers of toolbar search controls

## Under the Hood

- Update Pandoc to 2.16.1
- Improve sorting behavior of directories on creation and renaming of files
- Removed custom middle-click paste code for Linux, cf. #2321
- Fixed a floating-point to integer conversion failure error
- Fix potential errors in the updater window with additional sanity checks
- Project properties are now persisted to disk only if they actually changed

# 2.0.2

## GUI and Functionality

- Linking files by dragging them onto the editor from the file manager works
  again.
- Text input is automatically focused on global search (`Ctrl+Shift+F`).
- Previously, when you saved an in-memory file to disk, the dialog would begin
  in some random directory, but never the currently selected directory. This is
  now fixed.
- Added syntax highlighting for Octave (Matlab), keyword: `octave`
- The sidebar now refreshes also whenever it is shown, preventing wrong messages
  such as "No citations in document" when a document with citations is open.
- Modal windows now have a title bar
- Slightly increased the status bar height
- Fixed the image size calculator during image pastes
- Fixed a bug that sometimes caused the editor to randomly jump when entering a
  newline
- The updater has received a face lift: It should now be more responsive and
  easier to handle. We now filter out files which wouldn't work on the given
  platform either way, making it harder to accidentally download the Intel-
  packages when you're on ARM (or vice versa).

## Under the Hood

- Switched the Linux middle-mouse-paste code to listen to mouseup events instead
  of mousedown events in response to issue #2321
- Update Pandoc to 2.15
- Refactor the `UpdateProvider` so that it now has a unified state and a better
  error reporting. It should work much better without unrecoverable states and
  is more responsive. Additionally, removed a lot of old and dead code from it.

# 2.0.1

No stable release works without bugs, and thanks to our community, we found them
quickly! This patch fixes those initial bugs.

## GUI and Functionality

- Previously, list items were rendered as if they were code blocks if they were
  indented by at least four spaces, which was not supposed to happen. Thanks to
  @Redsandro for fixing this!
- The autocomplete dropdowns in the editor now only show the top 50 matches. Any
  more wouldn't be visible either way, and additionally, we have had reports
  that databases with more than 10,000 items made those lists somewhat slow.

## Under the Hood

- Switched to providing necessary information to `BrowserWindow` instances via
  `URLSearchParam`s instead of utilizing the `additionalArguments` property on
  the window constructor, since on Windows, Electron injects an additional
  property `prefetch:1` afterwards, rendering it pure luck to retrieve the
  correct information across all Platforms.
- Switched the `Sidebar` and the `SplitView` components from `v-show`-directives
  to `v-if` directives to prevent rendering while they are not in view.

# 2.0.0

Since the last release, 1.8.9, there have been 1,921 commits and 823 files
inside the codebase have changed (plus one or two commits after editing this
changelog and bumping the version string). Thus, the changelog this time does
not contain a meticulous list of every change. Rather, we focus on notable
changes here. If you would like to see the full list of every change, please
follow [this link](https://github.com/Zettlr/Zettlr/compare/v1.8.9...v2.0.0).

## 32bit Builds Are Discontinued

We do not ship any more 32bit builds. From 2.0.0 onwards, only 64bit builds
(both Intel and ARM) are supported. For Windows ARM builds, Pandoc is not
available, so to export and import files on Windows ARM you must install Pandoc
manually, if possible.

## New Configuration Options

Several existing configuration options have changed their format. This means
that changes to these won't be recognised and they will reset to their default.
In this case, you may have to re-adapt your preferences in several places.
Please have a look at your settings after updating and see if they still are set
the way you like.

## Writing Targets Must Be Re-Applied

Due to a change in the underlying data structure, this version of Zettlr will
not recognise any writing target set by a Zettlr version 1.x. This means: Please
note down the important writing targets you have set before updating and then
once re-apply them. We would like to apologise for this inconvenience, but
believe its benefits by far outweigh the single additional migration effort on
your side.

## No More Transitive Files / New Browser-Like Behavior

The idea of "transitive files" we implemented in previous iterations of Zettlr
proved to be counter-intuitive to many people. We now removed that feature
in favor of a much better tab-management. By default, Zettlr will now try to
avoid opening new tabs and instead attempt to replace existing tabs whenever you
open any new file. You can force Zettlr to open a file in a new tab instead by
either middle-clicking, or right-clicking the file and choosing "Open in a new
tab." If you generally do not want tabs to be closed in favor of other files,
you can uncheck the option "Avoid opening new tabs." Files with unsaved changes
will never be replaced. This behavior is very closely aligned with how modern
browsers handle links.

## Autosave Is Now A Setting

A few years ago we implemented auto-saving after a delay of five seconds with no
change to the current file. However, some people mentioned that they'd like to
choose what to do. Now you can switch between three modes of autosaving. "Off"
disables autosave and you have to manually save using `Cmd/Ctrl+S`.
"Immediately" saves files after a very short delay of 250ms, that is basically
whenever you stop typing. "After a delay" (default) will save files after the 5s
delay you know from previous versions of Zettlr.

## PDF-Preferences Are Discontinued

The PDF-Preferences window has been removed in favor of the new "assets
manager." While it did prove to be a nice reminiscence of how LibreOffice or
Word handled layout, it was not a scalable solution. Instead, we have now
switched to defaults files, which are a little more complex than this dialog,
but provide much more functionality and flexibility.

## New Dialog: Assets Manager

Instead of the old PDF-Preferences window, Zettlr now contains a so-called
"assets manager." This is a new preferences window that allows you to customize
settings which are stored in individual files. The first two tabs feature
exporting and importing settings using so-called defaults files. Defaults files
are written using YAML and provide Pandoc with sensible defaults for every
export. We will shortly after the release of 2.0 include extensive documentation
for how these work. The defaults we provide should work well for most users.

The third tab contains the custom CSS, and the fourth tab contains the new
snippets feature.

## Custom CSS Has Moved

The Custom CSS can now be edited directly in the assets manager instead of in
its own dialog.

## Zoom Functionality Has Changed

Previously, you could increase and decrease the editor's font size using the
zoom shortcuts. Now, the zoom shortcuts will zoom the complete user interface.
This is an accessibility feature, since several people with visual impairments
as well as people with large external displays have mentioned they would like
the user interface itself to be scalable.

The editor's font size can now directly be edited with a new setting in the
editor settings tab.

Scroll-to-zoom has been removed, because too many people have accidentally held
down `Cmd/Ctrl` while using the scrollwheel, causing many accidental zoom
operations.

## The Pandoc Command Has Been Removed

In the past, you had the ability to modify the command that Zettlr would run to
export your files. However, several times we had to adapt the command, which
lead to frustration among users because we had to manually inform everyone of
these changes and they had to manually "reset" the command. Now that we have
switched to defaults files, the command that will be run in every case is
`pandoc --defaults "/path/to/defaults.yaml"`. Instead of modifying the CLI
arguments, you can now adapt the defaults Pandoc will be run with, which is
possible because every CLI argument has a corresponding setting in defaults
files, which can be edited in the assets manager.

## Native User Interface

Another notable change is that now we have switched to a native user interface.
This means that Zettlr does not have a completely custom design anymore, but
rather orients itself at the various interface guidelines published by Apple,
Microsoft, and the GNOME team. Thus, on macOS and Windows Zettlr now follows the
Big Sur style and the Metro style respectively. On Linux, we have attempted to
model the GNOME interface but had to make a few changes due to the fact that
there are numerous different window managers with different aesthetics.

## Two PDF Export Options

You will notice that there are now two different PDF exporting options, one is
called "PDF Document", the other "PDF (LaTeX)". The first option enables you to
export a document to PDF without the help of a LaTeX distribution. This way you
can have PDF exports without installing such a distribution. The second option
allows you to export to PDF as you know it from previous versions of Zettlr.

## Project Settings Have Moved

With the introduction of defaults files, there is less necessity to ship a full
dialog just to edit a project's settings. Instead, the project settings have
been moved to the novel "Properties" dialog of directories, which you can access
via the context menu.

## GUI and Functionality

- **Feature**: Switched to using defaults files in the exporter. Additionally,
  the exporter is now modular, allowing for more extensions in the future.
- **Feature**: You can now define snippets, reusable pieces of text that allow
  you to save some time when writing
- **Feature**: The "global search" has been renamed "full text search" and has
  moved to its own sidebar panel -- you can switch between the file manager and
  the full text search using the three-way toggle in the toolbar
- **Feature**: A new sidebar tab shows you related files
- **Feature**: Added a calendar view to the stats dialog, showing you what
  you've written over the year
- **Feature**: The macOS version of Zettlr now boasts a new application icon,
  adapted to fit the style of the Big Sur operating system. It was provided by
  Marc Oliver Orth (@marc2o) – thank you!
- **Feature**: Zettlr now supports bibliography files on a per-file basis. Just
  set the wanted bibliography in your YAML frontmatter, within the
  `bibliography`-property.
- **Feature**: The tag cloud now offers you "suggested tags" for the current
  file. Tag suggestions are words equalling tags found inside your file which
  are not yet prepended with a hash-character. You can modify the list of
  suggestions and insert them at once. Zettlr will insert them into the
  frontmatter so that the actual text will remain untouched. If there are any
  tag suggestions, the tag cloud icon will feature a small red dot.
- **Feature**: Now Zettlr can export to PDF even without any LaTeX-distribution
  installed on the system.
- **Feature**: The footnote editing logic has been improved. Now, multiline
  footnotes are handled appropriately, and you can safely use multi-line
  footnotes alongside the in-place editing feature.
- **Feature**: You can now customize the data directory using the
  `--data-dir="/path/to/directory"` switch. This allows portable installations.
- **Feature**: In addition to the "Glass" sound you can now also have the
  Pomodoro timer play a "Chime" or a "Digital Alarm" after each step
- **Feature**: The filter now not only filters the file list but also the file
  tree
- **Feature**: New "Properties" popouts give you access to information about
  your files and folders via the context menu
- **Feature**: Projects can now be exported into multiple formats at once,
  allowing you to choose from every available format
- **Feature**: You can now further filter which files will be exported using
  glob patterns
- **Feature**: A new update dialog improves the updating experience
- 32bit AppImages and Windows builds are no longer supported.
- Double-dollar equations are now rendered in display mode.
- Removed the Pandoc installation item from the help menu.
- Moved the Pandoc and XeLaTeX settings to the export tab in preferences.
- Updated the tutorial instructions to install Pandoc
- Fixed a bug that would delete file if it got renamed as itself.
- All languages will now be downloaded by the CI workflow. Updates will still be
  pulled via the application on boot.
- Removed the ability for the translation provider to arbitrarily request
  languages that have not been installed in order to remove that fragile
  feature. All languages will now be provided from the application immediately.
- All windows will now remember their last position.
- Some components of the renderer elements will now respect a given accent
  color set by your operating system (only available for macOS and Windows).
  You can choose between a theme's accent color and the operating system's in
  the display settings.
- You can now close files by middle-clicking their tabs
- MDX supported as a type of markdown file
- New File and Edit File can now fast rename without selecting the extension
- Add a tray to the system notification area, off by default. To activate, see
  Preferences → Advanced → "Leave app running in the notification area" (or
  "Show app in the notification area" when using MacOS).
- Fixed a bug that would mark some quotation marks as misspelled
- Fix the visibility problems under night mode mentioned in issue #1845
- Enabled syntax higlighting for fenced code blocks that use attribute lists as
  per issue #2259
- Added the SIL Open Font License to the About dialog

## Under the Hood

- Removed support for 32 bit AppImages on the CI.
- Migrated the exporter to TypeScript.
- Completely rewritten the exporter in order to be able to use defaults files
  and enable much more flexibility.
- Removed the Pandoc command.
- Add typings for external modules, remove the internal custom ones for `bcp-47`
  and `nspell`.
- Reenabled the Pandoc and XeLaTeX options in preferences.
- Removed the generic IPC call from the config provider and replaced it with
  consistent checks as to which options have actually changed. This increases
  the performance after configuration saves.
- Migrated the config provider to TypeScript.
- Migrated the Citeproc Provider to TypeScript, and cleaned the provider up:
    - The provider has now the capability to load multiple databases at once and
      switch between them.
    - Furthermore, the provider now needs much less variables, the logic is much
      simpler, and many unnecessary ipc calls have been removed.
- Migrated many utility functions and other scripts to TypeScript.
- The translations are now loaded by the `trans` helper to make sure it will
  always work.
- Migrated the complete GUI to Vue.js, using a reusable component system.
- The window chrome is no longer controlled by the window registration handler.
- Now tests can be run as JavaScript or as TypeScript files (use `.js` or
  `.spec.ts` files respectively).
- Generalised the window state management so that all windows are now able to
  remember their positions easily.
- Zettlr is now completely jQuery-free.
- Migrated the FSAL cache from unstable Objects to Maps and Sets.
- Migrated the TagProvider to a Map as well.
- Added an assets provider responsible for maintaining the various files Zettlr
  now uses
- Completely sandboxed the renderer processes. Now, even if an attacker gains
  access to a browser window, the chances of them causing any damage is greatly
  reduced
- Moved all static assets to their own directory
- Fixed font, image, and resource loading in general via webpack
- Fixed the debug capabilities; now everyone should be able to debug both the
  main process as well as the renderer processes using VS Code
- Added "recommended extensions" to the VS Code setup, allowing for easier
  interoperability across code contributors
- Switched to the native "recent documents" functionality on macOS and Windows
- Switched to a new, completely GDPR compliant API for updates. No piece of data
  will be transferred anymore (except the update information from our server to
  the apps)

# 1.8.9

## HOTFIX FOR JPCERT#90544144

> Read our Postmortem on this issue and the last one on our blog.

This is a hotfix that fixes a potentially severe security-issue, reported to us
by the Japanese cybersecurity organisation JPCERT/CC. It was reported that due
to insecure iFrame handling on our side, malicious actors could take over users'
computers using specially crafted iFrame-embed codes or Markdown-documents
containing such an iFrame.

This release closes this vulnerability. Specifically, the following precautions
were taken:

1. Now, whenever Zettlr renders an iFrame, it will omit all attributes except
   `src` -- in the security disclosure, the attribute `srcdoc` has been used to
   maliciously access the test system. While this means that certain features
   are not supported during preview (e.g., `allowfullscreen`), remember that the
   attributes will still be exported so that in HTML exports, they will work.
2. We have added a global whitelist that by default only contains the hostnames
   of YouTube and Vimeo players so that those embeds work out of the box. For
   all other hostnames, rendering of iFrames will be blocked by default.
   Instead, you will be presented with a warning and be asked whether or not you
   want to render content from the given hostname. You can then choose to render
   it _once_, or permanently add the named hostname to the whitelist.

> Note that you can completely disable any iFrame pre-rendering in your display preferences.

We would like to apologise for the inconvenience. If you are interested in how
it came to this situation, please read our Postmortem on this issue.

# 1.8.8

## HOTFIX FOR ELECTRON CVEs

This is a hotfix that updates a vulnerable Electron version to a safe one. This
is in response to a row of CVEs that have been detected in the source code of
Chromium in the past days. With an outdated Electron-version (<12.0.6), it was
possible for an attacker to take over your computer via Zettlr using a crafted
HTML webpage.

This release fixes Zettlr 1.8.7, which was vulnerable to this kind of attack. It
upgrades Electron from a vulnerable 11.x.x-version to the safe version 12.0.6.

> **DO NO LONGER USE ZETTLR 1.8.7! RELEASES PRIOR TO 1.8.8 MUST BE REGARDED AS UNSAFE!**

# 1.8.7

## GUI and Functionality

- On Linux systems, the application icon should now show up again.
- Fixed an issue where your text would "jump" irradically when you were writing in the last line of the file.

## Under the Hood

- Restored the generic folder path in the `electron-builer.yaml` config.

# 1.8.6

## GUI and Functionality

- Your typing speed is now as fast as previously again, even for long paragraphs and files (thanks to @mattj23 for implementing the fixes in the multiplexer).
- You can now also switch to sub-directories using the file list navigation; it is not limited to files only anymore.
- Fixed a bug that would show a wrong path as the current one on pasting image data onto the editor.
- Fixed a bug that would make dragging items from the file list impossible.
- Fixed odd behaviour that would make dragging and dropping items in the file tree (especially in combined mode of the file manager) hard.
- Fixed a logical bug that would open a dialog notifying of remote changes for every detected change, rather than just once per file.
- Added RMarkdown files (`.Rmd`) to the list of supported file extensions for which Zettlr can be registered as a default handler.
- Fix a regression error that has rendered citation exporting impossible.

## Under the Hood

- Fixed a performance sink in the multiplexer module which introduced noticeable lag while writing long paragraphs and documents (implemented by @mattj23).
- Implemented a global event listener that prevents any arbitrary navigation away from the loaded URL that occurs within webContents. So this way we do not need to sanitize any anchors or take care about setting `window.location`, because all of these events will be captured and navigation will be prevented. For opening local files and directories, make sure to prepend the path with `safe-file://`, which is recognized by this listener.
- Implemented a global event listener that makes sure any call to `console.log` is also received in the main process so that we can intercept those and add them to our global logging interface as well. This way, debugging errors in the renderer process can be debugged together with users as well. _Messages from the renderers are indicated by a [R] including the window identifier (e.g. "[Main Window]")._
- Migrated the Tags Provider to TypeScript. Cleaned up the IPC calls.
- Moved electron-builder configuration to `electron-builder.yml`.
- Removed no longer necessary scripts.
- Moved most type annotations to corresponding types files. The structure is currently: All `node_modules` without type support reside within `./source`, whereas the service provider types are stored in `./source/app/service-providers/assets`.
- Removed generic IPC calls for the CSS Provider and migrated that to the provider class.
- Zettlr now detects a potential downloaded Pandoc in the resources directory during development.
- Fixed a logical error in calculating the application uptime.
- The application now exits forcefully if an error is produced during boot.

# 1.8.5

## Apple Silicon Support

This version provides native Apple Silicon/M1 support, a.k.a. the darwin/arm64 architecture. Make sure to download the correct update file (either x64 for Intel-based Macs or arm64 for the new Apple Silicon chips).

## A Note to Apple Silicon users

If you possess one of the new Apple devices sporting Apple's M1 chip, please see whether or not the application is able to run the built-in pandoc (which is still compiled for 64 bit). If your bundled exporter fails, please report an issue.

## A Note to Windows ARM users

As of the current development build, Microsoft has finished support for running 64 bit applications on ARM computers. However, this is not yet officially released, so the bundled Pandoc might not work and you have to return back to the system-wide installation. However, if the bundled 64 bit Pandoc _does_ work on your ARM computer, please notify us so we know that we can officially support Windows ARM again!

## Drag Behaviour Fixes

Due to efforts within the file manager structure, we could re-enable the functionality to drag files out of the app without having to press any modification key before actually dragging something.

## GUI and Functionality

- **Feature**: 64bit applications will now run the built-in Pandoc. To see whether your application runs using the bundled Pandoc, open the developer logs and look for "pandoc." If Zettlr has used the built-in Pandoc for an export, the pandoc command will not begin with "pandoc" but with the full, absolute path to the bundled Pandoc binary. **If your application does use the bundled Pandoc, you can uninstall any system-wide Pandoc installationn; Zettlr should still be able to export. If not, please report a bug**!
- **Feature**: macOS-users can now use horizontal scrolling instead of using the arrow button to toggle between the file tree and the file list (only available in thin file manager mode; this behaves exactly like back and forth navigating in browsers such as Safari and Chrome).
- **Enhancement**: Added a new option to allow spaces during autocompletion (of tags, citations, or internal links).
- **Enhancement**: Added a configuration option to programmatically set the editor's base font size. Additionally, the zooming now works reliably. (This setting is independent of the base font size above.)
- **Enhancement**: Values from the AutoCorrect replacement table will now also be indicated as correct, so you don't have to add them to your user dictionary anymore.
- **Enhancement**: Added an option to prevent auto-searches when following Zettelkasten-links.
- **Enhancement**: Zettlr now recognizes the `tags` frontmatter property. _Please note that Pandoc does not recognize the `tags`-property, so if you need tags to be processed by Pandoc, consider using the `keywords`-property._
- **Enhancement**: The File System Abstraction Layer (FSAL) now spits out a few descriptive statistics collected across all loaded files and folders.
- Made the dialogs' tab lists more accessible for screen readers.
- Fixed the other files's extension icons in the sidebar -- they now also display in dark mode.
- Fixes to the stylesheets.
- Fix too dark colours for some variables in CodeMirror.
- Added a new CSS variable that allows you to set the font-size of the whole application, `--base-font-size`. You can set it in your custom CSS to increase or decrease the overall font-size of everything persistently. Remember to apply it to the `:root`-pseudo element.
- Fixed a race condition in the dictionary provider that would render spellchecking unfunctional in certain edge cases.
- Revamped the about dialog's other project tab.
- Removed the deprecation warning for deprecated installations.
- Improved the preferences explanations with regard to AutoCorrect modes and the Magic Quotes section (some require adaptions by the users in the corresponding translations!)
- Re-built the QuickLooks. Now they share even more code with the rest of the app, should react more snappy, and are more responsive then ever.
- Fixed a few logical bugs where the meaning of the "Overwrite file?"-dialog's buttons were swapped, overwriting a file if you chose "Cancel" and not overwriting a file if you chose "Ok."
- Fixed a bug that would mistakenly show a file twice in the file manager if a file rename or the creation of a new file would overwrite a file that was already present.
- Added a switch in the export options to choose whether to use the internal Pandoc or the system wide application.
- Messages can now be filtered in the log viewer.
- Windows can now be regularly closed using the `Cmd/Ctrl+W`-shortcut without interfering with the open tabs in the main window anymore.
- On macOS, Zettlr will not force-show the main window anymore when you click on its Dock icon, but rather restore the default behaviour on macOS.
- You can now zoom both Quicklook editors and the main editor independently using the zoom shortcuts.
- Unlocked the ability to select "Follow Operating System" in the auto dark mode settings. _Please note that this setting might have no effect on certain linuxoid Operating Systems._
- Improved tag/keyword detection in frontmatters. Comma-separated lists should now also work.
- Fixed a bug making it impossible to open Markdown files from the menu.

## Under the Hood

- Removed jQuery UI from the dialog classes completely.
- Removed jQuery from the editor controller.
- Removed jQuery from the updater.
- Removed jQuery from the tag cloud dialog.
- Removed jQuery from the stats dialog.
- Removed jQuery from PDF preferences.
- Removed jQuery from the CSS dialog.
- Removed jQuery from the file manager.
- Removed jQuery from the Pomodoro counter.
- Fix a bug in the error handler during update checks.
- Removed the timeout on the dictionary provider, as the dictionaries are likely to be loaded prior either way.
- Force `electron-packager` to 15.2.0 to enable darwin/arm64 (Apple Silicon) builds.
- Zettlr now detects Byte Order Marks (BOM) if present in a file.
- The LogViewer got a new paint job: It's now based on Vue, much less resource-heavy and it includes filters to only show certain log levels.
- Moved the log window creation to the Window Manager.
- The window registration procedure now supports handling the toolbar which now also doubles as a title bar (if you don't want a toolbar).
- Migrated the Quicklook windows to Vue.js.
- Overhauled the print window.
- Changed function name `askOverwriteFile` to `shouldOverwriteFile` to make it semantically more correct.
- Aligned the exact behaviour of the `file-rename` and `file-new` commands to be the same when it comes to overwriting files.
- Began implementing another new menu functionality: A `shortcut` property will send a shortcut-message to the currently focused window.
- Migrated the Appearance Provider to TypeScript.
- Renamed `darkTheme` to `darkMode`.
- Migrated the Target Provider to TypeScript.
- Transform the zoom-commands to shortcuts.
- Move the `loadIcons` function to a more central place in the window registration module.
- Moved the tree view functionality to its dedicated Vue component.
- Fixed a regression error from updating LESS.
- Moved the file list functionality to its dedicated Vue component.
- Unified ES6 syntax within the file manager components.
- Migrated the Vuex store to TypeScript.

# 1.8.4

## Deprecating 32 bit builds

This version ships with a debug notification that will inform users of deprecated operating systems about that fact. This debug notification cannot be turned off, but will be removed in Zettlr 1.8.5, which will use the bundled Pandoc version first of all. Beginning with Zettlr 1.9.0, we will no longer support 32 bit applications, so you have to make sure your operating system supports 64 bit. If your Windows is still 32 bit, there is a _very high chance_ that your processor actually supports 64 bit. Please check this, if you want to continue using Zettlr.

## GUI and Functionality

- **Enhancement**: Navigating the file list has just become easier. Now when you navigate the list **files will not be opened immediately**! Rather, they are being marked as "active," making the navigation much less cumbersome. To open an activated file, simply hit **Enter**.
- Visual improvements to the quick filter. The "back"-arrow now appears below the input.
- The quick filter now searches for all search terms (delimited by space) separately.
- The editor will now be focused whenever the containing document is changed.
- The cursor will now be of the correct height no matter whether you are on a heading class or within a normal-height text line.
- Pandoc will now be pre-bundled with 64 bit installers.
- Fixed a bug that the TableEditor would oftentimes "swallow" table cell content, making it almost unusable.
- Fixed a logical error that would display `.tex`-files as if they were directories in the file manager's tree view.
- Added two more variables, `%y` and `%X` for Zettelkasten-IDs, which allow you to use a two-digit year or the unix epoch (seconds since Jan 1st, 1970) in your IDs (thanks to @cdaven for implementing).
- RMarkdown files (`.rmd`) are now supported in general.

## Under the Hood

- The statistics controller is now the Stats Provider.
- Migrated the Stats Provider to TypeScript.
- ASAR support reinstated
- Switched GitHub Actions CI to use Node 14.x.
- Prepared everything so that Pandoc can be bundled with Zettlr at every time. However, the corresponding code is not yet active to provide for a transition phase where we still ship 32 bit builds.
- Fixed the TableEditor. The two major changes are that it does not depend on jQuery anymore, and that now all changes are always applied to the AST, not the DOM element. The DOM element is always rebuilt after the AST has changed so that the single source of truth is always the AST.
- Made sure that environmentally necessary directories are now created recursively.
- Added a `prompt`-passthrough to the main Zettlr class.
- Fix function signatures in the FSAL.
- Fix function signatures in the WindowManager.
- Migrate the command infrastructure to TypeScript.
- The regular expressions are now unified within the `./source/common/regular-expressions.js`-file (thanks to @Kangie for implementing).
- The recent docs provider is now written in TypeScript.
- Removed conditional RMarkdown checks.
- Remove empty strings, if applicable.

# 1.8.3

## GUI and Functionality

- **New Feature**: Added a quick filter to the file list that will filter the directory contents much more quickly than a full text search. Currently, it does not account for typos. It will attempt to match the filename, YAML frontmatter title, and first heading level 1 according to your preferences. If you simply type a `#`-symbol, the list will be filtered for files containing tags. Add a full tag behind it and the files containing that tag will be shown.
- Fixed broken link rendering from 1.8.2.
- The default PDF template of Zettlr is now compatible with Pandoc 2.11. This means it won't work with Pandoc 2.10 or less anymore. (Thanks to @Kangie for implementing.)
- Renaming files from the context menu of the document tabs now contains the original file name.
- Code files now have monospace fonts applied consistently.
- You have an additional option now to direct Zettlr to remove an object irreversibly, if moving it to trash fails due to some reason.
- Citations are now easier than ever as you do not have to put square brackets around them – Zettlr will do this automatically for you.
- Fixed another error where empty `title`-attributes inside YAML frontmatter would break down the complete file tree within which such a "malicious" file resides, resulting in the whole tree being offloaded and unusable.
- Fix a BibTex attachment parsing error.

## Under the Hood

- Migrated sorting functions into the FSAL module and converted them to TypeScript.
- Changed the FSAL parsing logic to separate the Markdown and code file logics.
- Fix a hidden error with the continuelist addon.
- Improved logging when certain files and directories take a significant amount of time to load.
- Fixed an ID problem where the ID `file-manager` was given twice.
- Updated dependencies:
    - @typescript-eslint/eslint-plugin `4.10.0`
    - @typescript-eslint/parser `4.10.0`
    - fork-ts-checker-webpack-plugin `6.0.7`

# 1.8.2

## Support for Pandoc 2.11

The default Pandoc command now targets Pandoc 2.11 and above. **In order to use the new command, make sure to "reset" it once, or (if it contains customisations) replace `$citeproc$` with `--citeproc --bibliography "$bibliography$" $cslstyle$`.** However, you can retain compatibility with older versions by replacing the new part `--citeproc` with `--filter pandoc-citeproc`. The new `$bibliography$` variable will be replaced with `/path/to/your/library.json`. Furthermore, the `$cslstyle$`-variable will be replaced with `--csl /path/to/your/style.json`, if applicable.

## GUI and Functionality

- The file search popup now retains your last search again.
- The global search now lets you select all text again.
- Removed deprecated Pandoc command variable `$citeproc$` and added the two variables `$bibliography$` and `$cslstyle$`.
- Began implementing better screen reader support for Zettlr. Now, a certain amount of elements has received correct labels according to the ARIA guidelines so that screenreader are now better in handling the app:
    - The toolbar is now being recognised as such, the toolbar buttons themselves have correct labels
    - The editor tabs are recognised as a tabbar and you can easily switch tabs now.
    - The sidebar buttons are now being correctly identified as tabs.
    - Added region landmark roles to a few of the components in order to facilitate quicker voice over navigation.
    - The icons in the file manager now have `role="presentation"` set to not have the screen reader name all of those "unlabelled images" one by one.
- Fixed some relative links to files on your system not being resolved correctly.
- Fix weird indentation rendering in the syntax code highlighting blocks.
- Fixed an issue that sometimes did not fully shut down the application before exit. This lead to numerous issues, the most visible of which was that sometimes configuration changes were not persisted.
- Fixed an issue in which user dictionary-entries were not actually removed when removed from the preferences.
- The citation engine now also supports loading CSL YAML files as bibliographies.
- Fixed some issues with the citeproc provider.
- Fixed multi-cursor placement.
- Fix duplicate IDs when linking files whose filename contains the ID with the setting "Always link with filename."
- Fix a few visual link rendering oddities.
- Fix the ToC navigation sometimes not working.

## Under the Hood

- Migrated the UpdateProvider to TypeScript.
- Migrated the DictionaryProvider to TypeScript.
- TextMarkers are now bound to the Document instances, not the editor overall. This increases the speed of document switching.
- Updated dependencies:
    - @clr/icons `4.0.8`
    - adm-zip `0.5.1`
    - archiver `5.1.0`
    - bcp-47 `1.0.8`
    - citeproc `2.4.52`
    - codemirror `5.58.3`
    - got `11.8.1`
    - mermaid `8.8.4`
    - semver `7.3.4`
    - uuid `8.3.2`
    - vuex `3.6.0`
    - fsevents `2.2.1`
    - @electron-forge/cli `6.0.0-beta.54`
    - @electron-forge/plugin-webpack `6.0.0-beta.54`
    - @teamsupercell/typings-for-css-modules-loader `2.4.0`
    - @typescript-eslint/eslint-plugin `4.9.1`
    - @typescript-eslint/parser `4.9.1`
    - cross-env `7.0.3`
    - css-loader `5.0.1`
    - csso `4.2.0`
    - electron `11.1.0`
    - electron-bundler `22.9.1`
    - eslint `7.15.0`
    - eslint-config-standard `16.0.2`
    - eslint-plugin-standard `5.0.0`
    - eslint-plugin-vue `7.2.0`
    - file-loader `6.2.0`
    - fork-ts-checker-webpack-plugin `6.0.6`
    - less `3.13.0`
    - less-loader `7.1.0`
    - mocha `8.2.1`
    - style-loader `2.0.0`
    - ts-loader `8.0.12`
    - typescript `4.1.3`
    - vue-loader `15.9.5`
- Removed dependency `v8-compile-cache`

# 1.8.1

## GUI and Functionality

- Fixed the non-working reveal.js exports.
- Add support for chemical formulae in KaTeX (thanks to @likeadoc for implementing).
- Design fix for the color swatches in the tag manager.
- Fix preferences not opening on the corresponding menu item (Windows/Linux).
- Fix the parent menu not closing on a click in the child menu (submenu).
- Fixed rendering of footnote references.
- Jumping to specific headings now places those headings at the top of the viewport, instead of simply pulling it into view.
- Fix an edge condition where tags within code blocks would be detected if they contained an odd number of `-characters.
- Re-instated the directory rescanning functionality.
- Disable VIM editor input mode until further notice.

## Under the Hood

- The release tags will now be created with a prefix "v" again. This should fix various issues around the assumption of the "v" being the correct GitHub tag.
- Fix all linter errors. PRs should now receive a nice green checkmark instead of the error symbol (unless there are new errors in the PR itself).
- Remove asynchronous initialisation logic from the main object's constructor.
- Added a footnote testing file.
- Significantly increase document loading times by deferring text marking functions to idle times in the browser's event loop, using `requestIdleCallback`. This induces a small visual lag, but the documents load much faster, and arguably, it's better this way because one doesn't have to wait until the document has fully rendered before one can start to write. (Some testing with regard to long-term writing performance might make sense.)
- Add debug logging to the configuration provider to check errors on config save and load.

# 1.8.0

## Breaking Changes

- Renamed the **sidebar** to **file manager**. We finally decided on better terminology for distinguishing the right from the left sidebar. This means: The left sidebar, formerly known only as "sidebar," is now the "file manager." The right sidebar, formerly known as "attachment sidebar," is now "the" sidebar. This change was introduced to reduce user confusion and provide a better user experience.
- The shortcut for opening the developer tools on Windows and Linux is now `Ctrl+Alt+I` (was: `Ctrl+Shift+I`) to resolve a conflict with the shortcut `Ctrl+Shift+I` (insert images).
- Renamed **Root Directories** to **Workspaces**. The term "root" is rather technical, and for most people, it makes most sense to think of those roots as workspaces, albeit other than being opened at the root level of the application, they have no difference to regular directories.
- The shortcut `Cmd/Ctrl+O`, which previously would let you open _workspaces_, now opens files. To open a workspace, use `Cmd/Ctrl+Shift+O`. This is now in line with many other programs.

## GUI and Functionality

- **New Feature**: Typewriter mode. By pressing `Cmd/Ctrl+Alt+T`, you can activate the typewriter mode, which will keep the current line in the editor always centered so that you have to move your eyes less while editing a text. This also works in combination with the distraction free mode so that you can fully focus on what you're editing right at the moment.
- **New Feature**: The sidebar (formerly attachment sidebar) is now tabbified. That means you have three distinct tabs to choose from with regard to displaying important information: the non-markdown files in your currently selected directory, the references in the current file, and the table of contents of the current file.
- **New Feature**: When hovering over links, they now appear in a separate tooltip to click them without holding down Ctrl/Cmd.
- **New Feature**: The QuickLook windows now share the main editor including its appearance. The same options apply for Quicklook windows as they are set in the global preferences (e.g. if you turned off image previewing, images would also not be displayed in the Quicklooks, etc).
- **New Feature**: Now you have an additional option in the "Advanced" preferences to choose between a "native" appearance of all Zettlr Windows (that is, a frameless window with inset traffic lights on macOS, and standard window decorations on Windows and Linux) or a custom built-in appearance (that is, for all platforms a frameless window with custom drawn menu and window control buttons, which mimick the Windows 10 design).
- **New Feature**: The heading tag elements (those `h1` to `h6`-tags replacing the Markdown heading characters) finally serve a purpose: Clicking on them reveals a small menu which lets you quickly choose a different heading level.
- **New Feature**: Improvement in the citation rendering capabilities: Both when copying Markdown as HTML, and when viewing footnote tooltips, any citation will be correctly rendered by the citeproc provider.
- **New Feature**: The TableEditor now pre-renders table cells so that it looks more like it will when you export it!
- **New Feature**: A selection of notifications will now be displayed using your operating system's notification service (if available), for instance export messages, errors, and updates. All notifications will still be displayed in the main window, so if you do not like this behaviour, you can turn notifications off for Zettlr within your operating system settings.
- **New Feature**: Whenever you begin a code block (`\`\`\``), Zettlr now offers you to autocomplete the syntax highlighting language.
- Added syntax highlighting modes (with keywords):
    - **diff**: `diff`
    - **Dockerfile**: `docker`/`dockerfile`
    - **TOML**: `toml`/`ini`
- Fixed the fold-gutter being too close to the text.
- The editor link autocompletion now respects the setting to use headings level 1 instead of YAML frontmatter titles where possible.
- The paste image dialog now also provides the original image size as a default value, so that you simply can use the arrow buttons on the field to adjust the image size.
- Fixed a rare bug where changes would be discarded if you renamed the modified file quickly enough.
- HTML export should now centre both figures and figure captions.
- Sorting files by name now takes into account possible settings such as using headings of level 1 or YAML frontmatter titles so that sorted files now correspond to their display again.
- You can now select rendered references from the right sidebar.
- The file tabs now have their own, dedicated menu, containing a new "Close all tabs" command to close all open file tabs (thanks to @anoopengineer for implementing).
- The file info now displays the selection information, if there is any. The popup that opens when you click the counter then lists all selections within your document.
- When you initiate a keyword search from the tag cloud by clicking on a tag, it'll be automatically enclosed in quotes, enabling searches for keywords with spaces in them.
- The image paste dialog now shows you the resolved path of the directory into which the image you are about to paste will be saved to.
- Fixed a missing translatable string from the paste image dialog.
- Fixed the width of the word counter in order to make the toolbar more "stiff."
- Enabled Dart syntax highlighting (thanks to @Kangie for implementing).
- Reduced the added margins for overflowing dialog windows from 15 % to 2 %, making the visible gap on smaller screens smaller.
- Remove the intermediary `.ztr-project`-migration code, which means you should update to Zettlr 1.7.x before updating to 1.8.x, if you still use an older version of Zettlr.
- Fixed (= monkeypatched) a weird bug that would cause selections on specially indented lines (e.g. wrapped blockquotes, list items, etc.) to be padded by precisely four pixels, making the selection not look like a box.
- Double clicks on file tabs now make files intransient (if they were transient before).
- The editor is now in a non-editable mode if no file is open. If the editor is read-only, the Zettlr logo will display in the background to indicate that fact. Empty files, on the other hand, will not yield the feather logo anymore. This should now meet up with users' expectations about file editing better.
- The last opened file will now reliably open whenever you start the application again.
- File loading (especially on boot) is now much faster, because the opened tabs won't be switched through during load anymore. Only the relevant, last file will be opened and displayed.
- Fixed a bug that would prevent you from exporting standalone files.
- Non-breaking spaces (NBSP) are now considered word delimiters in the spellchecker.
- Fixed a bug that would not close all tabs when the corresponding entry was selected from the tab context menu.
- Fixed a bug where checkboxes of tasks would be strangely hidden on undo/redo operations that checked/unchecked those checkboxes.
- Fixed a bug that would throw errors and not actually remove the file if said file was a root.
- Fixed broken shortcuts `Cmd/Ctrl+Shift+E` (focus the editor) and `Cmd/Ctrl+Shift+T` (focus the file list).
- Markdown links to local files that are absolute are now attempted to be opened internally, without recurring to external programs.
- The various rendering methods now only update anything that is within the viewport, thereby increasing the performance vastly. This is especially noticable for large documents.
- Fixed a bug that led to the exporter ignoring custom templates and always reverting to the default.
- Fixed the date formatter, as the moment.js locales are not found when compiling using `electron-forge`.
- Fixed a bug that would mess up the tag-tooltip on files under certain circumstances.
- Fixed a bug that would throw errors instead of exporting, if the export-directory is set to the current working directory and a non-root file is being exported.
- Fixed a bug which would not let you create duplicates of root files. Now, you can and the duplicate is being placed in the currently selected directory.
- Fixed a rendering edge condition where if you wanted to retain multiple single-line breaks with backslashes, the backslashes positioned on the line would have had alternating colours.
- Collocated the time-display and time-sorting settings for files to reduce confusion if users _display_ the modification time but sort using the creation time, or vice versa.
- Improved the layouting of the display settings tab.
- The context menu is now a custom one, making the experience more seamless.
- If you change the display settings for the editor, the editor will now also remove rendered elements that you do not wish to be rendered anymore.
- Footnote tooltips are now interactive, which means you can select text from them, and also click on any link to visit it without having to scroll to the bottom and do the same action there.
- You can now forcefully open a file non-transient by either middle-clicking it, or holding down Ctrl/Cmd.
- If you use YAML frontmatters demarcated by only dashes (`---`), for instance for compatibility with Jeckyll, these will not render as tables anymore.
- Switched to reveal.js 4 and fixed an occasional error on export.
- The tutorial is now also available in German.
- The application menu now displays many more shortcuts which were already available albeit not visible.
- Checkboxes are now disabled in Quicklooks.
- Fixed a bug that caused files dropped onto the editor from the file manager not to be linked when the file manager is in combined mode.
- Custom protocols for links (e.g. `zettlr://`, `thunderlink://`) can now be up to 100 characters long to be recognized by Zettlr.
- Fixed an issue that Zettlr would sometimes attempt to open a link to a local file in the browser instead of the correct app.
- Finally fixed the document tabs using the wrong font in the Frankfurt and Bielefeld theme.
- Fixed a display glitch in the combined file manager in dark mode.
- Now both Quicklook windows and the main window remember their last position. As long as the configuration of displays did not change, they will appear at the same positions as the last time they were open.
- Menu items in the application menu that can have a "checked" state (indicated by, e.g., a checkmark) now remember their correct state if other settings change consistently.
- Non-image files being dropped onto the editor are now being linked.
- Files that are dropped from the outside onto the editor are now linked using a relative path.
- Fixed a behaviour that would lead to the autocomplete to stop working completely until a full refresh of the window.
- Fix a bug that prevent non-existing documents to be created upon following a link despite the option being activated.
- Added `F11` as an accelerator for fullscreen on Windows.
- Fixed a display bug (= the window would reload itself) when there were no tags in the tag manager.
- Fixed the padding of dialog buttons and input fields also in dark mode.
- Fix pasting on Windows 10 (thanks to @graphixillusion for fixing).
- Fixed a sometimes weird behaviour when linking files.
- Following Zettelkasten-links should now be way faster.
- Fixed an issue with number-only frontmatter keywords.
- Clean up the application menus on Linux and Windows: Now all preferences live under a shared menu item.
- Prevent multiple cursors while following internal links.
- Fix display glitches on the sorters.

## Under the Hood

- Moved (almost) all window functionality to a dedicated `WindowManager` module. The added benefits of this are:
    - Centralised window functionality
    - A correct place for `window-controls`-commands
    - Sleeker design
    - Enable a much better window handling: (1) Now all windows are closed automatically before the main window is being closed; (2) When someone requests a Quicklook/Print/Main window, an existing window is being searched first and made visible, instead of (re)creating it.
    - New window types can be added much faster.
- Switched to Electron forge (thanks to @tobiasdiez for implementing).
- Bumped dependencies:
  - @clr/icons `4.0.4`
  - @electron-forge/cli `6.0.0-beta.53`
  - @electron-forge/plugin-webpack `6.0.0-beta.53`
  - @teamsupercell/typings-for-css-modules-loader `2.3.0`
  - @typescript-eslint/eslint-plugin `4.5.0`
  - @typescript-eslint/parser `4.5.0`
  - archiver `5.0.2`
  - astrocite `0.16.4`
  - chokidar `3.4.3`
  - citeproc `2.4.48`
  - codemirror `5.58.2`
  - chart.js `2.9.4`
  - copy-webpack-plugin `6.1.0`
  - electron `10.1.5`
  - eslint `7.8.1`
  - eslint-config-standard-with-typescript `19.0.1`
  - eslint-plugin-import `2.22.1`
  - eslint-plugin-standard `4.0.2`
  - eslint-plugin-vue `7.0.0-beta.3`
  - file-loader `6.1.1`
  - fork-ts-checker-webpack-plugin `5.1.0`
  - fsevents `2.1.3`
  - got `11.8.0`
  - joplin-turndown `4.0.30`
  - md5 `2.3.0`
  - mermaid `8.8.2`
  - mocha `8.2.0`
  - moment `2.29.1`
  - node-loader `1.0.2`
  - nspell `2.1.4`
  - raw-loader `4.0.2`
  - reveal.js `4.1.0`
  - tippy.js `6.2.7`
  - ts-loader `8.0.7`
  - typescript `4.0.3`
  - uuid `8.3.1`
  - vue `2.6.12`
  - vue-template-compiler `2.6.12`
- Removed dependencies:
  - uglify-js
  - on-change
- Added a new Handlebars templating helper function, `i18n_value` that allows you to translate something passing a value to the translation helper (e.g. `{{i18n_value 'trans.identifier' someValue}}`).
- Refactored the main build Workflow file. Now it doesn't run on a matrix, but due to the many dissimilar steps involved, there are three distinct jobs. Other than that, we switched to `yarn` everywhere and cleaned up the code.
- Removed the now unused script `afterSign.js`.
- Finally removed the verbose IPC calls from the logs.
- Migrated the toolbar logic from jQuery to vanilla JS.
- Migrated the main renderer from jQuery to vanilla JS.
- Migrated the popup class from jQuery to vanilla JS.
- (Mostly) migrated the dialog classes from jQuery to vanilla JS (tabs are still done using jQueryUI).
- Added a popup provider for easy creation of popups across the main renderer process.
- Added an update provider for easy access to specific updating functionality (such as downloading an update, and automatically running it).
- Migrated any popups that were defined inline into their respective handlebars template files.
- The TableEditor is now finally a module.
- Outsourced the CSS computations from the main module of the TableEditor.
- Migrated the CodeMirror editor instantiation into its own module (MarkdownEditor).
- Transformed all event listeners on the CodeMirror instance to "hooks" to reflect the fact that they are plugins, except they are not run like parameterless commands but hook into certain events of the application.
- Moved the CodeMirror assets from the old folder into the MarkdownEditor module.
- Moved some general utility functions to the `common/util`-folder.
- The rendering plugins have been optimized. They now take less time to run and also don't keep an additional array of all the textmarkers in memory, decreasing the computational load especially for big documents.
- The app now saves the last opened file again.
- Moved the Turndown and Showdown converters to two utility functions, md2html and html2md.
- Moved the regular expression for detecting image files by extension into the global RegExp module.
- Moved the `moveSection` helper function to the `common/util`-folder.
- Documentation fix for `safeAssign`.
- Fixes in the tests.
- Completely refurbished the test command. Now, a full-fledged testing directory will be set up to test features within the GUI without endangering your regular configuration in case you use Zettlr regularly.
- Better handling of the custom paths for both the Pandoc and the XeLaTeX executables in the advanced preferences.
- Migrated the FSAL to TypeScript so that the different descriptors can be better handled. Also, this showed countless logical errors, which are now mostly fixed.
    - Furthermore, the responsibilities have been readjusted: The FSAL is now responsible for emitting events whenever the internal state changes. This is not being done by the commands anymore.
    - The actions are now proper methods on the FSAL class in order to enable better tracking of the function arguments and to help ESLint fix possible signature errors.
    - Moved every piece of state logic from the commands to the FSAL.
    - Now, the general way anything regarding the files works is as follows: User --> one of the commands --> an action on the FSAL --> emits which part of the state has changed --> the application main class receives these notifications --> triggers potential updates in the renderer.
    - Additionally, now the distinction between the meta objects which can be serialized and sent to the renderer and the tree objects within the FSAL is made more clear: Metadata files can have content attached to them (in order to save new content to a file), whereas the full objects, which are never getting sent to the renderer, do not contain a content property anymore.
    - Also, we managed to fix errors regarding remote change detection.
- The log provider now also outputs on the console, if the app runs unpacked (`app.isPackaged === false`).
- Updated all service providers. They are now loaded immediately after application boot (right after the `ready`-event fires on the `app`-object) and not when the Zettlr main class loads.
- Created a new directory `app` which provides functionality that pertains only to the lifecycle of the application itself, such as boot and shutdown functionalities. Service providers have been migrated to there.
- Fixed the issue that only the `en-US`-language of the CSL styles was loaded for the citation provider.
- CSL locales and CSL styles are now bundled with the app as `native_modules`.
- Began providing first global interfaces which the service providers make use of in order to enable ESLint to detect errors.
- Provide a test library, which you can load to debug citeproc-related issues and test the provider.
- Converted the CSS Provider to TypeScript.
- Converted the Log Provider to TypeScript.
- Migrated the Quicklook and Print window classes to Typescript.
- Added a utility function to quickly broadcast arbitrary IPC messages to all open Zettlr windows.
- Migrated many functionalities that are important for all windows on the renderer side to a dedicated TypeScript module (`register-window`).
- Divided the menu template into templates for macOS and Windows (+ all other platforms).
- Simplified the menu building process.
- Added classes and event listeners to show custom built menus within frameless BrowserWindow instances.
- Deprecate the `remote`-module.
- The md2html-function can now make anchors renderer-safe, so that they don't open within the main window anymore.
- The menu handler is now a service provider.
- Added a notification provider for better notification management, and to further reduce the main IPC classes.
- The tag list on file list items is now only shown when there are actually coloured tags available, and hidden otherwise. This enables a better UX for the users as the tag-list-tooltip will then consistently pop up, not being hidden behind an invisible div.
- Removed the Watchdog service provider, as it is no longer being used.
- The Window Manager now saves the positions of each window (main and Quicklooks), persists them on disk and ensures the windows are displayed properly. The corresponding settings have been removed from the configuration service provider.
- The menu provider now keeps track of the state of those checkbox menu items which are not controlled externally by a configuration setting, but rather always begin unchecked when the application starts.
- Moved the typo-logic to their respective places in the renderer.
- The dictionary provider now listens on the correct channel and is additionally based on `fs.promises` thoroughly.
- The app bundle now contains all language files; the i18n-modules have been moved.
- "Fixed" the high CPU usage of Zettlr when having many files and directories open in the app.
- Fixed the force-open command. It now only searches for an exact filename-match, if the given argument (the contents of the link) do not look like an ID. This way we save at least one full file-tree search, which improves the speed notably especially with large setups.
- Re-ordered the filetypes array so that expensive functions will attempt to match those extensions first which are more likely to occur.
- Moved the ID regular expression generation into the corresponding file.

# 1.7.5

## GUI and Functionality

- Fixed a bug where opening RMarkdown files with Zettlr not open would throw an error.
- Fixed a bug where the app would not process inline images during export, leading to missing images.
- HTML Export now centres figure captions underneath figures (thanks to @Kangie for implementing).
- Zettlr finally allows alternative/title texts in images to be specified, making it possible to preview images with a title, and have them properly export even with relative filenames.
- Fix wrong design of the sorters in combined sidebar file trees.
- Fixed a bug where adding more and more list-characters in front of a list item would make the left gutter "swallow" these due to an extreme amount of negative indent. Now the line indentation for soft-wrapped lists (or anything indented) should work as expected.
- Fixed a behaviour that would sometimes lead to the editor inserting `tab`-characters instead of spaces.
- Added UX improvements to the fold gutter and the global search bar (thanks to @doup for implementing).
- Fixed non-centered button icons and made some UI elements a little bit bigger.
- You can now abort searching in Quicklook windows by pressing escape while the search field is highlighted.
- Fixed a rare error where codeblocks would not be indented correctly in HTML outputs.
- Zettlr now renders linked images.
- Restored the security question when you are about to overwrite an already existing file.
- Made URLs in references into clickable links that open in the system's browser (thanks to @maxedmands for implementing).
- The context menu on directories within the file list now correctly shows you project options, if the directory is one.
- The file tree has been cleaned up. Now, the children toggle (if a directory has any) as well as any additional icon will be displayed aligned with each other.
- Fixed a bug that would not display the filename but a heading level 1 that has been removed from the file.
- Single inline image inserts are now handled without adding newline characters.

## Under the Hood

- Added an additional check for directory exports to check that they indeed have an attached project.
- Removed all legacy WebHostingHub-Glyph references and switch fully to Clarity.
- Removed unused legacy code from the Quicklook windows.
- Replaced `getTokenAt` with `getTokenTypeAt`, hopefully achieving performance gains on documents littered with renderable elements.

# 1.7.4

## GUI and Functionality

- Removed a verbose debug notification which was added in order to test for persistence of bug #746.

## Under the Hood

- Fixed missing CSS styles (#1141).

# 1.7.3

## GUI and Functionality

- Fixed a bug causing project exports to fail.
- The `Cmd/Ctrl+K`-shortcut now works with most domains and protocols (i.e. no matter which URL is in the clipboard, it should insert it now).
- Fixed a serious bug that would lead to file descriptors never updating their metadata and cause thousands of remote notifications where they shouldn't be. Due to this, Zettlr was thinking that the file hasn't been updated by a save.
- The application is now also available as an Windows ARM 64bit release.

## Under the Hood

- Upgraded `joplin-turndown` which should result in better HTML-to-Markdown conversion on pasting.
- In case Pandoc produces any output (such as warnings or other useful info) but runs successfully, this output will be logged so that you can troubleshoot even non-fatal warnings.

# 1.7.2

## GUI and Functionality

- The NSIS installer (Windows) now contains customized, branded images for the sidebar and header of the various pages visible during the setup process.
- Added syntax highlighting modes (with keywords):
    - **Clojure**: `clojure`
    - **LaTeX**: `latex`/`tex`
- Fixed a bug where the trailing `---` of a YAML frontmatter would mistakenly be identified by the renderer as ATX-headings in readability mode, resulting in weird display of the last YAML frontmatter line.
- Added feedback if there was no directory selected, but one is needed to do a certain task.
- Multiline math equations now feature syntax highlighting.
- Fixed a bug that would sometimes render parts of multiline equations as headings.
- Added an option to tell Zettlr to use the first heading level 1 of a file to display instead of the filename (however, a frontmatter title will override this).
- YAML frontmatter ending characters should not trigger AutoCorrect anymore.
- The exporter now respects values from a YAML frontmatter, if (and where) applicable.
- You should now be able to fold Markdown sections from anywhere within their section text.
- Fixed a rare bug where Zettlr would attempt to render an internal link as a citation.
- Creating files using a case-sensitive extension name should now work.
- Set desktop Linux desktop icon in BrowserWindow config.
- `reveal.js`-presentations now do not have standalone-flags during export.
- The "Import"-option now also lets you select Markdown and text files. However, instead of running them through Pandoc, they are directly copied into the target directory.
- Fixed a bug that would cause the global search to stop working in certain situations, e.g. after renaming a file.
- The middle mouse button now closes tabs (thanks to @Kaan0200 for implementing).

## Under the Hood

- Added the logo source files to source control. Please make sure to read the accompanying README file in the `icons`-directory before using!!
- The AutoCorrect replacement now checks for the actual mode at both range endings before actually performing a replacement.
- The importer is now a module.
- Fixed a logical error in the FSAL change detection, which would lead to the FSAL not being able to process additions of assets.
- The application now uses `app.getVersion()` instead of requiring the `package.json`-file (thanks to @Aigeruth for implementing).
- CodeMirror is now required directly within the plugins and is independent of the location of `node_modules`.
- Zettlr is now also available for ARM64 Windows (thanks to @smitec for implementing).

# 1.7.1

## GUI and Functionality

- Fixed a race condition that would cause the renderer to become completely unresponsive when creating uncomplete Zettelkasten links (e.g. `[[contents]` or `[contents]]`).
- The interactive tutorial is now also available in French (thanks to @framatophe for their translation!).
- The sidebar now shows single-citekeys (without square brackets) in the references list again.
- Added syntax highlighting modes (with keywords):
    - **Smalltalk**: `smalltalk`/`st`

## Under the Hood

- Updated dependencies:
  - @zettlr/citr `1.2.0`
  - @clr/icons `3.1.4`
  - joplin-turndown `4.0.28`
  - citeproc `2.4.6`
  - electron `9.0.5`
  - electron-notarize `1.0.0`
  - mocha `8.0.1`
  - chalk `4.1.0`
  - got `11.4.0`
  - tippy.js `6.2.4`
  - moment `2.27.0`
  - uuid `8.2.0`
  - v8-compile-cache `2.1.1`
  - eslint `7.4.0`
  - eslint-plugin-import `2.22.0`
  - eslint-plugin-vue `7.0.0-alpha.9`
  - electron-devtools-installer `3.1.0`
  - webpack-cli `3.3.12`
  - uglify-js `3.10.0`
  - vue-loader `15.9.3`
  - css-loader `3.6.0`
  - mermaid `8.5.0`

# 1.7.0

## Breaking Changes

This release contains several breaking changes to 1.6 due to heavy internal refactoring.

* Your virtual directories will be gone after installing.
* Projects will be incorporated into the `.ztr-directory`-files, which means that you need to extract these files (or backup them) if you plan to roll back to 1.6 or earlier, lest you will lose the project settings.
* `Cmd/Ctrl+W` will now attempt to close open tabs first before closing the window. To close the main window directly, use `Cmd/Ctrl+Shift+W`.
* Now you will need to either `Cmd+Click` (macOS) or `Ctrl+Click` (other platforms) on internal and external links as well as on tags in order to follow the link/start a search.
* `Cmd/Ctrl+[1-9]` now **do no longer toggle recent documents** -- rather they select the corresponding tab!

## GUI and Functionality

- **New Feature**: Zettlr now supports (theoretically) unlimited open documents and orders them in tabs at the top of the editor instance.
    - The tabs display the frontmatter title, if applicable, or the filename.
    - On hover, you can get additional info about the documents.
    - Drag and drop the tabs to re-sort their order.
    - Get going where you left of the day before: Open files are persisted during restarts of the application.
    - **Transiency**: Tabs are opened transient, which means if you do not modify their contents, they will be replaced with another file that you open. This way you can quickly stroll through search results without having to close hundreds of tabs afterwards!
- **New Feature**: RTL support! Now whether you are writing in Hebrew, Persian, Urdu or any other right-to-left writing system, you can do so now. We've added support for the respective options of CodeMirror in the "Preferences -> Editor" tab.
- **New Feature**: You can now direct Zettlr to automatically create new files if you click on an internal link that does not match a file. Thanks to @halcyonquest for their contribution!
- **New Feature**: Vim and Emacs insertion modes are now supported! You can switch persistently between these two and the "normal" insertion mode using the preferences. Thanks to @JorySchossau for implementing this feature!
- **New Feature**: Directory icons. From now on you can select an arbitrary icon to further visually distinguish certain directories from the others. This has no other than a purely visual effect and may help identify specific directories within a longer list reliably.
- **New Feature**: Many apps feature it already, Zettlr joins them now. An interactive tutorial will be opened on the first start of the app.
- If available, a title from a YAML frontmatter will be appended to the displayed file entry when linking files.
- Copying images from the Explorer/Finder/file browser now offers to insert them into the document, copying them over to the assets directory.
- The popups are now more resilient against accidental closing, just like the dialogs.
- When focus-selecting the global search bar (pressing the mouse button in the input and using it to select some text immediately) works as in other inputs now.
- Added the week-number as a variable for filenames and the Zettelkasten IDs (use `%W`).
- Changes to the Pomodoro timer: Now the sound will play each time you release the mouse button on the volume slider to check how loud it is. Furthermore, the mute button has been removed in favor of a volume indication, with 0% equalling the former mute setting.
- When the tag cloud is filtered, "Copy Tags" will only copy the filtered tags, and no longer all tags. To copy all tags, reset the filter. Furthermore tags will now be copied to clipboard including the leading hashtag.
- Re-enabled double-dollar equations for rendering and syntax highlighting.
- HTML-style comments (`<!-- Lorem Ipsum -->`) are now also exempt from the word counting.
- Fixed an error in the Table Editor that would assume empty rows to be header rows, leading to false behavior when trying to display a completely empty table.
- The Table Editor can now also parse and display simple and grid tables, and a wider range of pipe tables, as described in the Pandoc manual.
- Fixed a small mistake where literal blocks would be wrongly offset as the editor treated them as list items.
- Fixed artefacts with spellchecking errors. Thanks to @ryota-abe for proposing the correct selector!
- The Table Editor now remembers what the source table looked like and tries to recreate that when it applies the changes to the DOM.
- Added verbose error reporting and improved the error handling during citeproc boot. Now, Zettlr will (a) remove error-throwing CiteKeys so that the rest of the library loads just fine and (b) display the exact errors as reported by citeproc-js so that users can immediately identify the bad keys and know where to look.
- The global search bar's autocomplete will now also work for non-western scripts such as Japanese, Korean, Chinese, or any other.
- Virtual directories have been discontinued. Parts of their functionality will be re-implemented in different ways.
- On Linux, we've restored the default window decorations -- that is, the burger menu button is gone, and the menu will be displayed wherever the window manager decides.
- Fixed a small bug that could lead to errors during autocomplete selection if no frontmatter is present in the file.
- Added syntax highlighting modes (with keywords):
    - **Elm**: `elm`
    - **F#**: `f#`/`fsharp`
    - **Haskell**: `hs`/`haskell`
    - **VB.net**: `vb.net`/`vb`/`visualbasic`
    - **HTML**: `html`
    - **XML**: `xml`
    - **Markdown**: `markdown`/`md`
    - **Julia**: `julia`/`jl`
    - **Turtle**: `turtle`/`ttl`
    - **SPARQL**: `sparql`
    - **Verilog**: `verilog`/`v`
    - **SystemVerilog**: `systemverilog`/`sv`
    - **VHDL**: `vhdl`/`vhd`
    - **Tcl**: `tcl`
    - **CommonLisp**: `clisp`/`commonlisp`
    - **Scheme**: `scheme`
    - **PowerShell**: `powershell`
- Fix the colours of the heatmap search list.
- Fixed a logical error in the detection of remote changes of attachment files.
- Fenced code blocks, delimited by three backticks have a customizable box background. The colour (and different styles) can be customized by targeting the `code-block-line`-CSS class.
- The font size of mathematics was decreased a bit to align it better with the size of normal text. Thanks to @tobiasdiez.
- Support fenced code blocks surrounded by tildes (`~`) instead of backticks.
- The About dialog of the application now also holds a tab with debug information about both the binary, the system, and the current environment.
- Tags with diacritics are now also removed on export (with the respective setting turned on), so that the removed tags match the tags which are highlighted in the editor.
- Fixed searches behaving irrationally if you search again while the previous search has not yet ended.
- Switched to using the [Clarity Design](https://clarity.design/icons) icon set where possible.
- Sort buttons now show how the directory is currently sorted. One shows and toggles what is being sorted by (name or time). The other shows and toggles what direction is being sorted ine (ascending or descending).
- Modified display settings are now applied on configuration changes (not just after clicking somewhere in the document).
- Modals now also apply a dark theming if in dark mode.
- Fixed image exports.
- Fixed correct exporting of images when exporting to Textbundle and Textpack.
- Fixed revealJS presentations which now display Math.
- Fixed the autocomplete behaviour, especially with cursor movement.
- If there is a selection in the document, its contents are used to fill in the search field now. Furthermore, the occurrences of the search term are now already highlighted without you having to search first.
- If there is a selection in the document, its contents fill up the global search field on focus, if the global search field does not have any contents.
- Fixed wrong display of project property table of content evaluation level.
- When linking files, Zettlr will now present you those files that match with at least one tag with the currently active file, making cross-linking of notes as easy as typing the link-start and hitting the arrow down-key. Bonus: It'll present you these options even if the files reside in a completely different root directory.
- Fixed behaviour of nested checkboxes.
- Fixed escaping of special TeX characters in input value fields (e.g. project properties).
- Finally fixed the parenthesis-link-problem. This means: For each Markdown link, the algorithm will parse the full detected URL and see if all opening parentheses have closing ones. If there are more opening parentheses than closing ones, the algorithm will push the link further in an attempt to fully resolve all parentheses. If this is not possible (because the link itself contains more opening than closing parentheses to begin with), you need to encode one opening parenthesis using `%28` for the algorithm to successfully render the link.
- Dragging search results like normal files is now possible.
- When switching directories while a search result list is displayed, this search is now performed at the other directory immediately after switching.
- Reversing a MagicQuote can now be performed by pressing backspace after a replacement has taken place, in order to restore the default double (") or single (') quote.
- Math doesn't render in comments anymore.
- Opening files with Zettlr when the app is not running will now correctly open them.
- Zooming on Windows and Linux can now be facilitated by scrolling while holding down the control-key.
- Use `Cmd/Ctrl+Shift+L` to copy the active file's ID to the clipboard.
- You can now also use `F2` to trigger a file rename for the current file.
- Improve the detection and rendering of Setext-headings.
- Dropping files from the file list onto the editor now inserts a valid Zettelkasten-link to that file into the editor.
- Images will now also render in-line.
- The "Window" submenu is now not confined to macOS applications anymore, but available to all platforms.
- URLs in Markdown links will not be rendered anymore.
- Enabled the context menu now also for both directories in the file list and the empty space in the file list (if there is some).
- You can now open directories externally (read: in Finder/Explorer/your Linux file browser) in the context menu now.
- Zettlr now attempts to set the cursor back to the place where it has been after programmatically updating the document content, e.g. after a remote change.
- Added a setting to control the sensitivity of Zettlr checking for remote file notifications on certain systems.
- Prevent multiple cursors when performing a special action (following a link, clicking a tag, etc.)
- Now both the current cursor position and the word count are displayed side by side. No need to right-click again to toggle!
- Citations in comments are now no longer rendered.

## Under the Hood

- **FSAL Refactor**: This release includes a huge refactor of the file system core of the application. In general terms, the rewritten core enables Zettlr to handle the file system more efficiently, uses up less RAM and has some other goodies that make the whole File System Abstraction Layer (FSAL) much more scalable for future feature implementations. More precisely:
    - **From OOP to Functional**: While previously files and directories were heavily object-oriented with one full object being instantiated for each and every file including a whole prototype chain, the new core switches to a functional approach, removing the memory-intensive prototype chains. Instead, files and directories are now represented by a **descriptor** which includes the all meta-information packages, but no function bodies. Instead, the new FSAL calls functions to which it passes one or more descriptors in order to enable the function to modify the descriptor itself. This also makes state management easier, as the whole FSAL only works with object pointers and does not re-instantiate most descriptors every time a function modifies them.
    - **Improved state management**: Now the state is not littered across the main process code base, but instead is centrally managed by the FSAL core class, which emits events every time anything in the state changes. This keeps the functional logic of the application much simpler. As opposed to before, the Zettlr main application class only accesses the FSAL state, and furthermore makes use of three events -- directory replacement, file replacement, and full file tree update -- to propagate any changes to the renderer process.
    - **File Caching for faster boot**: The FSAL additionally includes a [sharded](https://searchoracle.techtarget.com/definition/sharding) file cache which approximately halves the boot time. Furthermore, this enables the app to be much more resource-friendly for your storage, as the number of file accesses is reduced heavily -- at most, one hundred files will be opened during boot, instead of up to 10,000 or more, depending on the amount of open files you had.
    - **Improved remote change detection**: As a result of the descriptor-system and improved central state management, detecting and managing state changes induced remotely much easier. The whole logic of the watchdog has been cut down to its essential parts to make its business logic more manageable.
    - **Improved debugging**: Also as a result of implementing the new FSAL core as a self-contained EventEmitter module, it's much easier to locate logical errors, as due to improved state management missing state updates in the graphical user interface most likely emanate from exactly there, and not the FSAL. This has already helped identify several very small and almost unnoticeable bugs that did not update the renderer's state as wanted.
- Improvements to image dragging and dropping from the attachment sidebar.
- Switched the string variable replacer from vanilla JavaScript to moment.js, which simplified the function considerably.
- The `export` module is now really a module.
- Switched to cTime internally as the representation for modification time, because it'll capture more changes than mTime.
- Updated insecure dependencies.
- `.git`-directories are now ignored.
- Applying the CSS line classes for Markdown headings should now be less computationally intensive.
- Switched to Gulp for LESS compilation (thanks to @tobiasdiez for implementing).
- The command autoloader now logs potential errors during command loading.
- You can now pass a temporary configuration file to Zettlr, e.g. for testing purposes. Simply start Zettlr from the command line and pass `--config /your/config/file.json`. It can also only be a stub (e.g. only containing certain selected configuration parameters), as Zettlr will set all missing properties to their respective defaults. If the path is relative, Zettlr will attempt to find the file either at the repository root, if `app.isPackaged` is `false`, or at the current executable's directory.
- Added a test command for GUI testing. It creates a small directory structure so that you can test the GUI without having to sacrifice your files or your mental health for that issue. Run `yarn test-gui` to run Zettlr in that test environment, and do to the files whatever you want!
- The targets class is now a service provider.
- Fixed the `flattenDirectoryTree` utility function. I have no idea why it worked for eleven months, but when it started throwing errors on the `FSAL` I realized it did a lot of things but it should've never worked. JavaScript is magic. Update: Found a newer and more optimized utility function, `objectToArray`, so I'm trashing it for good.
- The Pandoc-command is now logged in its resolved state immediately before actually being run.
- Windows installers are finally signed.
- Switched back to the `package.json` configuration for electron-builder, because, well, Electron.
- Fix a lot of unused and weirdly coded code.
- Added a flag to determine if the Zettlr version has changed, indicating an update (or downgrade). Based on this, the FSAL will clear its cache on boot.
- Added command-line flag `--clear-cache` to programmatically clear the FSAL cache on startup.
- Moved the `forceOpen`-functionality to a command.
- Refactored the autocompletion logic and moved it out into its own designated class to reduce the size of the `ZettlrEditor` class.
- Refactored the logic for building the bibliography in an attempt to further reduce the size of the `ZettlrEditor` class.
- Include the `codemirror.css` into the geometry styles so we have one less dependency to include on startup.
- Switched to Electron 9.0.0.
- Set the `standalone` flag for Pandoc on all non-special exports.
- Image rendering now also supports base64-encoded inline images.
- Improvements to the detection of tags, internal links and footnotes. The algorithm is now more efficient and stable in various situations.

# 1.6.0

**The macOS-build of Zettlr is now code-signed and notarized, which means you will be able to open it without having to explicitly add an exception in your security preferences.**

## Breaking Changes

- If you want to enable the newly added MathJax CDN support for equation rendering, make sure to add the `--mathjax`-flag to your Pandoc command. If you did not modify the Pandoc command, you can "restore" the (new) default value, which will add the MathJax support for you.

## GUI and Functionality

- **New Feature**: [Mermaid](https://mermaid-js.github.io/mermaid/#/) chart support! Now you can add code blocks with the keyword "mermaid" (i.e. "```mermaid")to your document and use the Mermaid chart language to create charts!
- **New Feature**: Zettlr is now able to open file attachments for citations in your files. Simply right-click a citation, go to "Open Attachment" and select the cite-key for which you want to open the file attachment. Got multiple? Here's how Zettlr chooses which one to open: All attachments are listed and then the PDF files are sorted on top of the list. Then, Zettlr will open whatever attachment is the first in the list.
- **New Feature**: You now have an additional setting that allows you to determine if, and when, the filename will be automatically added to your link. "Never" means that the file name will never be added, "Only with ID" means that the file name will only be added, if the link is constructed using the ID, and "always" (the default) means that the file name will always be added, possibly duplicating it.
- **New Feature**: NOT search operator. Now you can use an exclamation mark (!) before the term in your global search to exclude certain search terms. If any NOT-condition is satisfied, the file will no longer be considered a candidate. You can combine the NOT-operator with both exact matches (`!"an exact phrase"`) and single terms (`!word`).
- Added TypeScript syntax highlighting. Keywords: `typescript`, `ts`.
- Added `Windows 32bit` build.
- Switched from `showdown` to `turndown` for converting HTML to Markdown on pasting contents. This makes pasting HTML formatted text much better than prior. Thanks to @Zverik for implementing!
- Pressing `Alt-Up` and `Alt-Down` will now swap lines in the editor window up or down.
- Cleaned up the shortcuts. Until now, `Ctrl+B` would also make text bold on macOS. Now, only `Cmd+B` will work, while `Ctrl+B` will only work on non-Apple systems.
- Improved the Math equation detection again. Now it's simpler, faster and will work more reliable. Escaping dollar signs should most of the time not be necessary anymore.
- Added syntax highlighting to inline and block Math equations. Now they're displayed in monospace to make it easier for you to write them.
- Title and tag matching of search terms during global search is now performed case insensitive.
- Added an option to copy the filename of files to the clipboard via the context menu.
- Exact search terms in the global search are no longer trimmed (trailing and leading whitespace is not removed) to maintain the meaning of "exact".
- The AutoCorrect option can now be activated and deactivated as intended.
- Added German secondary guillemets to the MagicQuotes settings.
- Better citation detection: Now, standalone-citations at the beginning of line will also be rendered.
- Improved the contextmenu behaviour.
- When creating a new file, the editor is re-focused again so that you can immediately begin writing.
- Task items are now rendered irrespective of the list-type-character they use, i.e. the following examples will all be rendered correctly: `- [ ]`, `+ [ ]`, and `* [ ]`.
- The "Empty directory"-message is now translatable and available in several languages.
- Headings will no longer be considered tags
- Fix `Ctrl+F`-shortcut on macOS.
- When linking a file using the Zettelkasten links, the prompt will now include *all files from the whole root*, not just the files from within the current directory.
- Made the dialogs more resilient. Now you can select text somewhere on dialogs, and regardless of whether you accidentally moved too far (out of the dialog), it will not close anymore, when you release the mouse.
- The front matter is now disregarded when counting words or chars.
- In case of renaming a directory, the containing directory is now re-sorted everytime so that changes are reflected immediately.
- The HTML template now includes a switch to include MathJax (CDN) in order to display equations in HTML exports and the print preview (only works with Pandoc installed).
- Improved placement of Input Method Editors (IME) for non-western input sources (e.g., Japanese or Korean typeset). Thanks to @ryota-abe for implementing!
- The file linking autocomplete will now respect your choice of Zettelkasten link starting characters, if they differ from `[[`.
- The formatting of Zettelkasten-links is now according to other formattings (such as emphasis or bold text), slightly transparent.
- On autocompleting Zettelkasten-links, the closing characters for the links are now added in case they are not already present (due to autoclosing, or else).
- The automplete-dropdown for Zettelkasten-links does not appear anymore if editing a footnote.
- Added overall days statistics to the stats dialog.
- Image-Paths correction for Windows systems.
- Setext headers are now rendered in the correct size, in line with the ATX headers.
- Abstracts in the YAML frontmatter are now considered on PDF exports.
- Fixed a rare bug, which would cause the edit flag on the main process to remain even though the renderer reports the editor is clean (that is, no changes to the document).
- Fixed an error where a completely empty custom CSS (e.g. when the user simply selects and deletes all content in the dialog or in the file) would cause the dialog generation to crash until a restart of the app.
- Fixed a rare error where an error would be thrown during export of extremely small projects.
- Fixed an error where the writing target popup would close itself via click on an option on Windows systems.
- Fixed "Select All" context menu item for text selection.
- Allow spaces in header delimiting rows.
- revealJS-presentations now have a basic syntax highlighting (Solarized theme).
- HTML exports now have a basic syntax highlighting (Solarized theme).

## Under the Hood

- Fixed a small bug that would display a non-intuitive message when checking for updates and the update server is not available.
- Fixed wrong error logging in the Citeproc provider.
- Added the necessary `cslenvironment` to Zettlr's default TeX template so that Pandoc >2.8 does not throw errors. Thanks to @frederik-elwert for implementing!
- Cleaned up the keymap for CodeMirror. It's now centralised within `generate-keymap.js` and not scattered in all the plugins anymore.
- Rewrote the i18n loading logic, resulting in huge performance gains on startup. Thanks to @BAKFR for implementing!
- Exchanged deprecated API calls in the `AppearanceProvider` class.
- The default DMG height for macOS installers now again shows the disclaimer at the bottom of the archive window.
- Fixed a logical bug with zoom levels bigger than 40x.
- Fixed the welcome log message, because whatever it was, it did not read こんにちは (Hello).
- Now during startup all files that do not exist anymore in the `openPaths`-property will be removed (because only directories can be "dead").
- Wrote script to automatically update the CSL styles and locales that are shipped with the app. Also, updated the CSL styles and locales.
- The YAML mode within frontmatters is now correctly detected by all plugins, so that e.g. AutoCorrect does not apply within YAML-frontmatters and quotes are the "correct" ones (no need to disable MagicQuotes temporarily to write frontmatters).
- Added an additional check to make sure to differ between explicit and implicit paste events in the CodeMirror instance.
- Finally fixed the weird glitches of the file list. Now it will correctly scroll files into view, not break, and be not empty for a fraction of a second.
- Overhauled the QuickLook windows. Now they react to much more finetuned configuration changes, are more responsive, and in general react faster to changes.
- Switch to Electron 8.
- Fix Pandoc error logging.
- Detach Popup event listeners on close.
- Add configuration files for Visual Studio Code to simplify coding. Thanks to @tobiasdiez for implementing.

# 1.5.0

## GUI and Functionality

- **New Feature**: AutoCorrect! Zettlr can now automatically replace certain characters with special symbols. For instance, by default it will replace `-->` with `→`, `!=` with `≠` or perform certain default replacements, such as transforming hyphens and fullstops with their typographically correct symbols (`...` -> `…` and `--` -> `–`). You can edit the replacement table in the preferences and adapt them to your own needs. _Please note_ that this feature will only be active when you are outside of codeblocks. This is meant to prevent unintended replacements, especially with certain languages such as R, where ASCII arrows are part of assignment operations.
- **New Feature**: Magic Quotes! Together with AutoCorrect, we've implemented the ability of Zettlr to use magic quotes. That means, whenever you type `"` (double quote) or `'` (single quote), it will instead insert the typographically correct characters of your choice, for instance `„…“` for German, or `« … »` for French. Even `「…」` for Japanese are supported! _Please note_ that this feature will only be active when you are outside of codeblocks. This is meant to prevent unintended replacements, as most languages require the ASCII quotes. Note also that having this feature active will deactivate the automatic bracket matching for quotes.
- YAML Frontmatters now receive the correct syntax highlighting.
- YAML Frontmatters do now have influence on the appearance of files: If a `title` is given, Zettlr will use this instead of the filename in the file list. If an array of `keywords` is given, Zettlr will add them to the rest found within the file.
- Codeblocks are now excluded from both tag extraction and ID search algorithms, so for example `#include` (used in C++ code) will no longer be recognised as a tag.
- Fixed a bug that would ignore the page size set in your PDF preferences when using the default template.
- Fixed a bug that prevented you from moving files and folders in combined sidebar mode.
- Fixed the broken footnote in-place preview and editing support when using named references.
- Improved the design of wrongly spelled words -- now the dotted line is closer to the actual words.
- Fixed `Alt`-clicking files in the combined sidebar mode. Now this will also open QuickLooks.
- Added the shortcuts `Cmd/Ctrl+Shift+E` to focus the editor and `Cmd/Ctrl+Shift+T` to focus the file list.
- On macOS, you can now also `Cmd-Click` links and tags to open/follow them.
- Added the variable `%uuid4` to use Universally Unique Identifiers version 4 (random UUID) within certain strings in the app.
- Improve "Copy as HTML" to also provide fallback Markdown.
- Fixed paste detection (if there's only HTML in the clipboard)
- Changed the Support-link to link to Patreon.
- Added a new error message informing you of malformed citation keys.
- Fixed the print preview.
- Removed the quotes from the matchbrackets-configuration.
- Fixed link rendering and the opening of links.
- Added the shortcut `Cmd/Ctrl+T` to create a task list. Thanks to @jeffgeorge for implementing!
- The blockquote character `>` is not treated as a list-item anymore, meaning you don't have to `Shift-Enter` into the next line anymore to prevent the blockquote from expanding unnecessarily.
- Implemented a "fat" cursor for the insert mode of Windows, so that when you press the `Ins`-key to toggle between inserting and replacing, Zettlr will graphically announce that you'll now be replacing characters rather than inserting. _Please note that this will only look good for monospaced fonts -- the other themes will have characters that are bigger than the cursor._
- Improve the tabs display for long titles (e.g. in the preferences dialog).
- The link detection algorithm is now less aggressive.
- On HTML exports (both revealJS presentations and regular HTML files), image paths will _not_ be absolute anymore, but relative.

## Under the Hood

- Switched to Electron 7.
- Added v8 code caching for better startup performance.
- Added a global logging interface for better error and bug handling.
- Relaxed the policy on wrong citation keys: One wrong key won't stop the loading of the rest of the database anymore, only the wrong key won't be included.
- Moved out the markdownOpenLink-function from the editor class to the utilities.
- Added much better heuristics to resolve paths linked to in markdown documents. Except a few edge cases, the algorithm should be able to open most varieties of links.
- The exporter now escapes the templates to account for potential spaces in the template path.
- Increased efficiency and cleanliness for loading the fenced code highlighting modes. Thanks to @BAKFR for implementing!
- Added support for building AppImage releases using the command `yarn release:app-image` (or `npm run release:app-image`). Thanks to @yashha for implementing!

# 1.4.3

## GUI and Functionality

- The word counter does not count files with newlines as having words anymore.
- The regular expression search functionality treats expressions containing forward slashes correctly.
- When the file list is focused, it only captures arrow key presses and does not prevent other shortcuts from working.
- Tags are now added and removed to and from the tag dropdown selector during runtime.
- Fixed a rare error that could occur during tag cloud searches.
- Fixed the scheduling mode for the automatic dark mode switching. It now also works with overnight schedules where the start time is bigger than the end time (such as 21:00-06:00).
- Added sponsors-list to the About-dialog.

## Under the Hood

- Began work on unit tests.
- The `localiseNumber()` helper is now capable of localising negative and floating numbers as well.
- Rewrote the exporting engine to be more modular.
- Removed the Handlebars runtime from VCS.
- Switched from `adm-zip` to `archiver` for zipping Textpack-files.
- Updated Electron to `6.1.2`.

# 1.4.2

## GUI and Functionality

- Removed the last remnants of Clusterize.js
- Fixed a bug that would cause the app to crash when you search for `//`.
- The default editor search is now case-insensitive.
- Added highlighting, which can be applied either with `==highlight==` or `::highlight::`.
- The EdgeButtons of the table editors won't cover the toolbar anymore. Additionally, their movement is now smoother.
- If there are untranslated strings in your language, Zettlr will now try to show you the meaningful English ones first, before falling back to the translation identifiers, making the user experience better.
- Minor design improvements.
- Fixed the sidebar toggle.
- Added a context menu item to show a file in Finder/Explorer/your file browser.
- Added a notification when opening a new root directory to announce that the process of opening a directory may take some time. Zettlr will notify you once the new root directory has been fully loaded.
- When you close a root directory which also happened to be the currently selected one, Zettlr will try to select the previous or next root directory before actually closing the directory so that you will always have one directory selected.
- Fixed a small error that would count italics at the beginning of a line as a list item when applying a block-formatting style.

## Under the Hood

- Made sure the default languages do not appear twice in the preferences.
- Zettlr will now detect files it can open case-insensitively (so: `.md` === `.MD`).
- Images in export should work again.
- Remedy a small error on some Linux launchers.

# 1.4.1

## GUI and Functionality

- Added a security check when you are about to overwrite an already existing file.
- Overwriting files in a directory now doesn't leave an empty space in the file list.

## Under the Hood

- Fixed Electron's dialog signature handling.
- Small fixes to the core.

# 1.4.0

## GUI and Functionality

**This update will reset your sidebar mode to the initial value of thin.**

**From this update on, you will need to hold either the `Alt`-key or the `Ctrl`-key on your keyboard, if you plan to move a file out of the app.**

- **New Feature**: Table management has just become easier. With the new table helper plugin, Zettlr enables you to circumvent manually having to edit Markdown tables. All you need to do now is keep the table helper active in the settings and just edit your tables as you would do in any other application. The table helper offers the following keyboard navigation shortcuts:
    - **Tab**: Move to the next cell, or the first cell on the next row, if the cursor is in the last column. Adds a new table row, if the cursor is in the last row.
    - **Shift-Tab**: Move to the previous cell, or the last cell on the previous row, if the cursor is in the first column.
    - **Return**: Move to the same column on the next row. Adds a new table row, if the cursor is in the last row.
    - **Arrow Up**: Move to the same cell in the previous row.
    - **Arrow Down**: Move to the same cell in the next row.
    - **Arrow Left**: If the cursor is at the beginning of the cell, move to the previous cell. Moves to the last cell on the previous row, if the active cell is in column 1.
    - **Arrow Right**: If the cursor is at the end of the cell, move to the next cell. Moves to the first cell on the next row, if the active cell is in the last column.
    - **Buttons**:
        - **Alignment-Buttons** (top-left): Aligns the currently active column left, center, or right.
        - **Removal-Buttons** (top-right): Removes either the current row or the current column. Does not remove the last row or column.
        - **Add-Buttons**: Adds rows or columns to the top, left, bottom or right hand side of the currently active cell, depending on the button.
- **New Feature**: 1.4 introduces a **readability mode** that you can turn on. It will try to highlight your sentences based on four possible algorithms, where green means that it's readable and red means that the sentence is difficult to read. You can turn on the mode in the toolbar. Thanks to @wooorm at this point for providing the incentive of implementing the algorithm!
- **New Feature**: The Translatr-API is now integrated into the app. This means: All translations will automatically be kept updated. Additionally, you can comfortably download all available languages (completed at least 50 percent) from the preferences dialog.
- The app will boot much faster now.
- Root directories that have not been found on app start, or are removed during runtime, are indicated as "dead" in your directory tree. If they reside on a removable medium, you can now simply plug the medium into the computer and rescan the directory. You don't have to manually open it anymore.
- Citations in your text are now always updated, you don't have to type anything for this to work.
- Inserting tasklists is now possible via context menu and formatting toolbar.
- New Theme: **Karl-Marx-Stadt**.
- Now you can choose which time to use for sorting and for displaying in the file meta: It's either the last modification time of the files or the creation time.
- Directory sorting is now persisted during reboots.
- Clicking on tags now initiates a search for the given tag.
- Added three new optional variables to pass to external exporter programs: `$infile_basename$` (input filename without directory), `$outfile_basename$` (output filename without directory) and `$indir$` (the input file's directory)
- You can now change the number of spaces to indent by in the preferences.
- Images can now be put inside links on the condition that they are (a) the only element inside the link's description and (b) relative links won't work during preview.
- You can now activate RMarkdown file support in the advanced preferences.
- You can now tell Zettlr to count characters instead of words (e.g. for Chinese).
- Custom CSS is now also rendered in the QuickLook windows.
- The preview image colour is now adapted to the active theme.
- You can now choose the formatting characters that should be used by the formatting commands.
- You can now change the pattern used for generating new file names, and omit being asked for filenames in general.
- Zettlr now tries to escape the input you provide for options that are directly passed into LaTeX documents.
- When you have open two or more root files with the same filename, Zettlr will display the containing directory's name as well.
- French-style guillemets are now supported for auto closing.
- Image display in HTML exports fixed.
- The About dialog contributors' tab now displays the date when the translation was last updated at.
- The dates and times all across the app are now correctly localised.
- When initiating a replace command with a regular expression search, you can now use variables in your replacement value so that you can re-use capturing groups from the search regular expression:
  - `$1` in the replacement value will be replaced with the first capturing group
  - `$2` with the second capturing group
  - ... and so forth.
- Zettlr now automatically downloads updates to the translations, if available.
- The editor now has a light background image in case it is empty.
- Fixed a bug with certain types of keyboards on macOS conflicting with internal CodeMirror commands.
- Prevent opening of a user's home directory.
- The citation rendering plugin won't render the domain parts of Emails anymore.
- Markdown links in braces won't include the closing brace anymore.
- The search's heatmaps now use the theme's colour as a base to indiciate the relevancy instead of always green.
- The image regular expression is now a little bit less restrictive, allowing for some spaces before and after the image.
- Fixed a small bug during checking and unchecking of task list items that would prevent the updating of the underlying Markdown text.
- When you enter an ID and choose the ID from the popup list, the filename belonging to that ID will also be inserted after the ID.
- You can now filter the tags in the tag cloud.
- You can now duplicate files within a given directory.
- The tag selection dropdown will not appear anymore, if you type a `#` somewhere within a word or a link. It must either be at the beginning of a line, or preceded by a space for the tag dropdown to appear.
- If there are two or more root directories open with the same name, Zettlr will now display the containing directory just like with root files.
- Added a line:column indicator mode to the word counter (switch modes with right-click).
- You can now move through the file-list with the arrow buttons in steps:
  - Arrow down: Select next file
  - Arrow up: Select previous file
  - Shift key: Move up or down by ten files
  - Command or Control: Move to the bottom or the top.
- Added a table generator.
- Fixed a small bug that would not correctly sort newly created files.

## Under the Hood

- Massive rewrite of the underlying mechanism of loading the directory trees into the app. It's now asynchronous and the app starts up way faster than before.
- Replaced the citation engine with `Citr` for more accurate results in previewing citations.
- The `Citeproc` engine is now a service provider.
- Switched internally to CSS-variables for all colours.
- Moved all Zettlr CodeMirror modes to their respective files.
- Moved all helper functions to their own files.
- Translations located in the `lang`-directory in the user data folder now take precedence over the shipped translations.
- Moved all local find functionality to a new class `EditorSearch` and did some fixing.
- Massive rewrite of the watchdog logic. Now the app is blazingly fast, there's no up-to-five-seconds-delay anymore when you add/remove any files and the app should generally feel smoother to handle.
- Fixed duplicate dictionary entries and saving of the dictionary preferences function.
- Moved the comment detection in the link rendering command further back to speed up performance significantly.
- Added a clipboard inspection dialog to inspect the contents of the clipboard and make sure copy & paste operations work as expected.
- Updated the `make.sh` script to automatically infer the version to use from the source's `package.json`.
- Simplified the process of maintaining the revealJS templates, added a few other goodies. The command `reveal:build` will now re-build the full revealJS templates with the installed revealJS version.
- The Citeproc-provider now logs all errors that prevent a successful boot to the console.
- Replaced the sidebar with a Vue.js component.
- The configuration setting for the `sidebarMode` is finally called as such.
- Removed `ZettlrWindow::setTitle()`.
- ESLint is now added to the `devDependencies` so that everyone can use the same code style.
- Add activation for opening external links on macOS.
- Switched to `Electron 6`.

# 1.3.0

## GUI and Functionality

**Attention, this update breaks three shortcuts: To view the file list, the tree view, and the attachment sidebar, you need to use `Cmd/Ctrl+!` (for toggling the sidebar), and `Cmd/Ctrl+?` for toggling the attachments. The shortcuts for `Cmd/Ctrl+[number]` are now reserved for recent documents!**

**Attention: Due to changes in the configuration, this update resets your setting concerning text snippets. They are now called "file information" and the corresponding setting will be set to "Show", regardless of your current setting.**

- **New Feature**: Zettlr can now automatically switch between light and dark mode either based on a fixed schedule or, if you are using macOS or Windows, based on the appearance of the operating system.
- **New Feature**: Add words to the user defined dictionary. You can remove words by removing them in the "Editor" tab in the preferences.
- **New Feature**: You can now provide a default path for images that you paste onto the editor in the preferences. If you provide a relative path, it'll be relative to the file.
- **New Feature**: In the preferences you can now switch between the three themes of the app:
  - _Berlin_: A modern sans-serif theme, the default.
  - _Frankfurt_: A clean serif-based theme with royal blue highlights.
  - _Bielefeld_: For Markdown purists, this theme features creme colours and a monospaced font.
- **New Feature**: Rearrange sections in your documents by dragging the headings in the Table of Contents popup around (_Note: Only works with ATX-Style headings!_). Please note that the last section will always count until the very last line, therefore including footnotes and references.
- **New Feature**: You can now also load BibTex files into Zettlr.
- Popup redesign: Now the popups aren't semi-transparent anymore, have rounded edges and are much more crisp. Therefore it's even easier to read them.
- Display contributors tab on the about dialog containing the names of all authors of the translation files.
- You can now customize the pandoc command to your liking using several variables.
- Added syntax highlighting for
  - Go (keyword: "go")
  - Kotlin (keyword: "kotlin")
- Add shortcuts for easier access to the recent documents.
- HTML export now relies on Pandoc, if available, and only falls back to Showdown if Pandoc hasn't been found on the system.
- You can now edit Math formulae by clicking on them.
- The tag count is now shown next to the tags in the tag cloud.
- During global search, the search results will include all files once at most, so files within virtual directories, for example, will be excluded to prevent duplicate files.
- The preview images when pasting an image from clipboard load faster.
- Formatting marks at the beginning or end of a misspelled word are now excluded from the selection.
- Now, if trying to follow a link without a protocol (e.g. `www.google.com` instead of `https://www.google.com`), Zettlr will automatically assume `https` as the protocol to make sure it can be opened by the web browser. Correctly configured servers should automatically redirect you to `http`, if applicable.
- Zettlr now highlights the full link when you right-click it to give visual feedback that the context menu options "Copy Link" or "Open Link" will indeed use the full link, and not just a part of it.
- The dictionary selection is now more compact than before.
- The editor automatically selects the word under cursor on requesting a context menu, making both the code more clean and enabling you to simply right-click a word to make it, for instance, bold.
- Now you can comment out selections of text using the new shortcut `Cmd/Ctrl+Shift+C`.
- You can now also link to files on your local filesystem from within Markdown files. Zettlr will try to open them. The following algorithm is applied internally: First, try to open the link just like that. Second, try to open the current file's folder plus the link. Third, try to open https://\<link\>. If all three methods don't yield a result, Zettlr will show you a notification.
- The GUI is not locked anymore while a popup is shown.
- The tag preferences have been updated.
- CodeMirror by default sets the cursor to the beginning or end of a whole line (with line wrapping). You can now change that behaviour, so that the `Home` and `End` buttons bring you to the beginning and end of the _visible_ lines, not the logical lines.
- Zettlr now counts completed pomodoros.
- The image path of pictures pasted from clipboard will now always be relative.
- You can now drag & drop attachments onto the editor.
- The full path to an attachment will now be shown on mouse over.
- You can now turn off the dialog asking you to load remote changes into the editor by checking the corresponding checkbox in the preferences or in the dialog.
- The file list now shows the full filename after a 1 second delay if you keep your mouse over the name of a file.
- You can middle mouse click on editor-tabs to close them.

### Fixes

- Fixed a bug that would, on certain actions, lead to unwanted behaviour when using the menu items for these actions instead of the shortcut.
- The last opened file will now be added to the recent documents on start up.
- The window's title will now only contain the currently opened file's name, and never the full path, even for root files.
- The dictionary loading mechanism works far more reliably now.
- Fixed a bug with checking and unchecking task items in the editor.
- Fixed an error in option validation.
- Fixed the translations for the pagenumbering sections in the PDF preferences and project settings.
- Fixed a small bug concerning case insensitive searching.
- Fix for single-letter Math preview.
- Fixed the "remove from virtual directory" command.
- Design fix for dialog tabs on small screens.
- Fix automatic rendering of Markdown links containing brackets (especially a problem for Wikipedia links)
- Improved performance during window resizing and moving.
- Removed all inline-javascript from the `index.htm` and moved it to a new `main.js` in the renderer process.
- Links will not be rendered within comments anymore so that you can escape Markdown links as expected using backticks.
- Fixed wrong cursor positioning after the headings have been altered.
- Finally exchanged all mentions of "snippets" with "File metadata" or information, respectively, to reflect the fact that text fragments (a.k.a. "snippets") have been ditched several months ago.
- Fixed an issue that prevented from re-creating writing targets after deleting them without a restart of the app.
- Fixed inconsistent behaviour with the document search.
- When trying to close the main window immediately after modifying the open document, you will now not be prompted to save the document anymore. All changes will be saved automatically.
- Now files with more than one tag will have tag indicators more consistent to files with only one tag.
- On rare occasions, Zettlr instances run on Windows can enter a zombie state where the main process is still running albeit the main window has been closed. Trying to run Zettlr anew will fail with an error due to the (now non-existing) window being accessed during the `on-second-instance` event. This fix makes sure a window will be opened in any case if there is none prior to restoring Zettlr.
- Fixed the placement of the popups, so they should now be visible.
- Fixed the context menu on files that have visible tags.
- Fixed wrong citation suggestions after a change of the library file.
- Fixed a bug causing the attachment extensions to be checked case-sensitive, instead of case-insensitive.
- Fixed the search not saving the strings you were searching for after re-showing the popup.

## Under the Hood

- Re-throw errors during command run in Zettlr main class.
- Moved the dictionary to its own dedicated provider for more versatility and improved upon its functionality.
- Created an appearance provider which takes care of switching the Zettlr theming based upon user choices.
- Switched from the `build`-property `electron-build` toolchain to the API.
- Switched to `Electron 5.0.0`.
- Some CSS cleanup, again.
- Changed the way popups are closed from an invisible barrier div to a simple click detection handler.
- Added Table and Strikethrough support to the copy & paste operations.
- Moved the Table-of-Contents-popup to the ZettlrBody class.
- Removed excess debug code.

# 1.2.3

## GUI and Functionality

- Restore the "New Directory …" functionality.
- Fixed an error when trying to run the app on some Linux distributions.
- Added a link to download more translations for the app.

## Under the Hood

- Made sure a popup will always be displayed, even if the pivot element cannot be found.
- Bump dependencies.
- Apply `chmod`-fix to the Linux distribution (see #134 for more information).

# 1.2.2

## GUI and Functionality

- Fixed a bug preventing you from creating Writing Targets.
- Allow all unicode characters to be part of a tag.
- The Scrollbars are now bigger.
- The change between dark and light mode is now much smoother.
- Fixed the "Paste as Plain text" command behaviour when CodeMirror is focused.
- Dialogs now fit better on smaller screens.
- Added icons to the export options HTML, PDF, DOCX, and ODT.

## Under the Hood

- Fixed a logical error in a failcheck if there was no writing target assigned to a file previously.
- Switched to the Zettlr API for update checks to avoid hitting the GitHub rate limits.

# 1.2.1

## GUI and Functionality

- Removed the Quicklook overlay windows. Quicklooks now directly become standalone windows.
- General improvements to the default PDF template.
- On Windows and macOS, Zettlr now also fills up the recent document list in the Taskbar/Dock.
- Huge UX improvements.
- Improvements to the spellchecking engine. Now, it won't check inline code.
- We're removed the "Create new Directory" button from the toolbar, and made the "Create new File" button more visible by replacing the icon with a huge "Plus" sign.
- The Pomodoro timer now sends out notifications when a task has ended so that you'll always know what's up next!
- The find popup detects when you start to type a regular expression. If it's a valid regular expression, it will switch to a monospaced font, helping you to write the expression correctly.
- The find popup now remembers your search term on a per-session basis.
- Fixed the position of the popups. Now they won't cover the toolbar.
- Fixed the misbehaving markdown shortcuts in the formatting toolbar. Now block formats are replaced, not left in place when changing the formatting of a paragraph.
- Fixed a small bug in the PDF template that would render emphasised text underlined instead of italic in exported PDF files.
- Fixed the links inside footnote tooltips. Now they are readable and don't break out of the tooltip anymore.
- Fixed an error that prevented Zettlr from being able to automatically import language files.
- Fixed a bug causing emails not to render.
- Fixed a bug preventing you from clicking the "Print" icon on Windows.
- Fixed double-clicking the Quicklook and Print window title bar on macOS and Linux.

## Under the Hood

- Bumped dependencies. **Switched to `Electron 5` Beta**.
- The Quicklook-windows will now also load the correct CodeMirror-plugins from the autoload file.
- Moved out the recent files to its own provider.
- Design cleanup. Many variables have been renamed to make it possible to create new themes based upon the Berlin theme.
- The renderer does not constantly query the main process for up-to-date citations anymore, which both reduces CPU power and increases battery life.
- The popups can now be told if their contents have changed so that they re-place themselves correctly.

# 1.2.0

## GUI and Functionality

- **New Feature**: Zettlr can now import and export both `textbundle` and `textpack` files. Refer to [textbundle.org](http://textbundle.org/) for more information.
- Removed the Speech submenu from Windows and Linux, as it is only used on macOS.
- **Attention**: The recent documents submenu is now to be found in the `File` menu! It resides no longer in the toolbar.
- Added an "Inspect Element" context menu item if the debug mode is enabled.
- The context menu doesn't show up on directory items in the file list anymore, which it wasn't supposed to anyway.
- Fixes in the math rendering. Now the app will correctly render all equations, be they inline or multiline.
- Added a flag to let the app know if you want to receive beta release notifications. If you tick the checkbox, Zettlr will also present you with beta releases, so that you can stay up to date.
- When importing files, the "All Files" filter is now at the top and should be selected by default.
- Fixed a small bug that would render exporting of standalone files impossible.
- Rendered Markdown links now retain the outer formatting (e.g., if you wrapped the whole link inside bold or emphasis).
- The Zettlr default `tex`-template now doesn't break checkbox exports by including the `amsmath` and `amssymb`-packages.
- New shortcuts: Pressing `Ctrl+Enter` will insert a new line below the one in which you are currently, placing your cursor there. Pressing `Ctrl+Shift+Enter` will do the same but above the current line.
- Added context menu entries to copy mail addresses and links to clipboard.
- For compatibility reasons with some Linux distributions that reserve the `Alt`-key for dragging windows around it is now also possible to press the control key to follow links and initiate searches.
- Removed a bug that would allow multiple dialogs to be shown as some kind of "overlays" on top of each other.
- Updates to the design of the editor. Now the margins of the editor don't resize as soon as you change the font size.
- Updates to the zooming of the editor's font: Now it'll stop at both 30 percent and 400 percent for lower and upper limits. Exceeding these may yield very weird errors.
- The cursor over the Quicklook windows' window controls is now the default, not the dragging.
- Added `shell` syntax highlighting (using keyword: `shell` or `bash` [for compatibility with Highlight.js]).
- Adapted the styles - now the filenames stay readable even during global searches.
- If you drag a file out of the app and cross a directory, it won't retain its highlighted state after you finish your drag&drop-operation.
- Tags, internal links and normal links now only have a pointer cursor when one of the meta keys (currently: `Alt` or `Ctrl`) is pressed.
- Implemented formatting support for HTML paste operations. If there's HTML in the clipboard as you paste, it will be converted to Markdown so that the formatting is retained. If you do not want to keep the formatting, simply hold down `Shift` before you paste, so that the formatting will not be kept.
- Removed the minimum window size constraint so that the application window will be resizable to half a screen even on smaller devices.
- Restored the window maximise/minimise-functionality by double-clicking on the toolbar.
- Fixed a small bug that would throw errors on Windows and Linux if you would open a file in Zettlr by double-clicking it in the file browser while Zettlr was already running.
- Links are now correctly detected by the preview algorithm.
- Fixed a bug that would make it impossible to export Markdown files with strikethrough text using the Zettlr default template.

## Under the Hood

- Fixed a small logical error in the menu buildup process.
- The context menu in the `ZettlrBody` class is now always instantiated anew.
- Rewrote the logic of detecting and rendering mathematical equations.
- Updated the `KaTeX.css` stylesheet to the newest version and removed some errors (thanks to @Wieke for doing this).
- Rewrote the complete command structure of the app and branched it out into standalone files. Thereby the system becomes extremely modular and new commands can be written with ease. Additionally, it becomes possible to create shortcuts for certain commands.
- Fixed a small possibility of running into an error while performing a global search.
- Exchanged the variables for usage in `TeX`-templates with Pandoc-Style $-variables. Additionally, now all occurrences will be replaced with the correct value.
- Moved the JavaScript bits out of the Handlebars templates and added them to the Dialog handler classes.
- Code cleanup.
- Removed the complete KaTeX dist files from the Zettlr source and switched to using the shipped files provided by the KaTeX module, reducing the binary sizes, maintenance effort and code clutter at once.
- The Custom CSS is now a service provider.
- The configuration is now a service provider.
- The tags handler class is now a service provider.
- Removed the superfluous `getLocale`-functions from `ZettlrBody` and `ZettlrRenderer`.
- Pulled in the URL regular expression from the GFM CodeMirror mode so that the pre-rendered links by the command are the same as those detected by the GFM mode.
- Added the `ulem`-package to enable export of strikethrough and underline text.

# 1.1.0

## GUI and Functionality

- **Attention!** Installing this update will reset the application language to the detected system locale and reset all spellcheck choices (i.e. you will have to re-select the dictionaries using the preferences window). The reason for this is that Zettlr is now compliant with the regulations for language codes as laid out in the Best Current Practices No. 47 ([BCP 47](https://tools.ietf.org/html/bcp47)). To achieve this, all mechanisms of finding and loading translation files and dictionary files had to be modified.
- **New Feature: Paste Images**. From now on it is possible to copy images directly to the clipboard, then press `Cmd/Ctrl+V` in the editor and Zettlr will ask how to proceed. By pressing `Return` the default action will be taken: The image will be saved into the currently selected directory using either the original filename or a simple hash (for instance if you took a screenshot and there's no associated URL available), and it will be inserted at the current cursor position as a standard Markdown image tag, using the filename as title. If you don't press `Return` directly, you can adapt some options, such as the file size and the filename, and also choose a custom directory alternatively.
- **New Feature: Set writing targets**. You can set writing targets for files by right-clicking them in the preview list. Each file that has a writing target will display its progress in the snippets section. **Set an existing target to 0 to remove it.**
- **New Feature: Print support**. Just press `Cmd/Ctrl+P` to open the print preview, which is essentially an exported HTML file. Click the printer icon in the titlebar to print it!
- **New Feature: Custom CSS**. Beneath your tag preferences, you now have a new menu option that lets you override certain styles of the app to customise it even further! From now on, the sky really is the only limit for customising the app.
- **Huge updates to the statistics dialog**. We've added a lot of functionality to the statistics dialog. If you click the `More …` button in the statistics popup, the resulting dialog now presents you with a overhauled interface. Now you'll be able to filter your data by week, month, and year. Additionally, you can choose to compare the timeframe with the previous one (either week, month, or year). This way you'll be able to track your writing habits much more differentiated.
- Tags are now only rendered as such and detected by the internal engine, if they are preceeded by a newline or a space. This will prevent page anchors inside links (e.g. `example.com/page#anchor-name`) or words with hashes in them from being detected as tags.
- Switched from `Droid Mono` to `Liberation Mono` for displaying monospaced code and comment blocks because of better support for glyphs in the latter font.
- Fixed an issue with the titles of the exporting buttons for HTML, docx, odt and PDF.
- Fixed a small bug that made it unable to open standalone files from the directory list.
- Small fix to the margins of switches. General fixes to the colours of the input controls in dark mode.
- Fixed a bug that led to files reporting the same tags more than once.
- Search results are now readable even in dark mode.
- Fixed a bug that would not correctly transform the links of images dragged from the attachment sidebar onto the editor, causing errors by pandoc when trying to export the file.
- Task list items are now rendered directly after you leave the formatting. You don't have to leave the line anymore.
- Special tags that you've assigned a colour to are now displayed distinct from other tags in the tag dropdown list.
- Now changing dictionaries during runtime yields the expected effects: The full word buffer will be invalidated so that formerly-wrong and formerly-correct words are checked against the new dictionaries.
- Fixed a small bug that would cause users with French localisation to not be able to use the preferences dialog as it was intended.
- Fixed a bug that made it impossible to load new dictionaries from the user directory.
- Fixed a small issue that would display the full translation strings for dictionaries and languages that were not translated in the currently loaded translation, instead of just the language codes.
- Fixed a small bug that would, on some Linux distributions, lead to the operating system opening up loads of file explorer windows when the "Open Directory"-button in the attachments sidebar was clicked.
- Now it's not possible anymore to try to create files and directories within virtual directories.
- The cursor blinks now smoothly.
- Changes to the word-count chart: Now numbers are localised and the date is not in the ugly ISO format anymore.
- You can now easily search for a file to link with the newly implemented autocompletion list that will pop up if you begin writing an internal link (i.e. type `[[`). After accepting an autocomplete suggestion, Zettlr will either put the ID between the brackets, or the filename, if there is no ID.
- Fixed a bug that would throw an error if updating the config with no dictionary loaded on app boot.
- Fixed a bug that would move a file to a random directory instead of enabling you to actually copy said file outside the app, if you dragged the file out of the app and passed the directory list.
- Fixed the highlighting effect on drag operations. Now even if you use the thin sidebar mode, the directories where you can drop files will receive the highlighting shimmer.
- Added an option to hide the heading characters and replace them with a small tag indicating the heading level (`h1`, `h2`, etc). Off by default.
- Refined the rendering of links. Now, inline elements will be also rendered correctly inside rendered links.
- The app will now correctly scroll to the selected file again (if any).
- Added an option to hide directories from the preview list while performing a global search.
- Fixed a small error that would strip false positive tags on export (i.e. that would also strip escaped tags).
- Massive updates to the notification service provider. If a message is too long, it will be truncated when it is first shown to you. If you then click on the notification, it will expand itself so that you can read the full message. Click on it again to hide it. Additionally, the notifications are now the same height and move smoothly as soon as new notifications arrive or old ones get removed.
- Gave the exporter an update: Now, if Pandoc experiences an error during export, you will be presented with a better error dialog which even lets you select portions of the error message for you to google them.

## Under the Hood

- Moved the input styling to the geometry section and only left the colouring in place.
- Added a `data-default-action` support for Dialogs. Now there can be a button with the attribute `data-default-action="data-default-action"` (repetition necessary for ensuring a correct DOM structure) in each dialog that will be focused on instantiation of the dialog, thereby enabling a simple "default action".
- Small changes to the translation files to remove some duplicates.
- Added `md5` for generating simple hashes.
- The `ZettlrDictionary`-class is now an `EventEmitter` and emits `update`-events whenever the composition of the loaded dictionaries changes.
- Renamed the default theme to its correct name: **Berlin**.
- Small changes to enable on-the-fly theme CSS replacement.
- Better escaping of some feedback strings in the preferences template.
- **The app is now BCP 47 compatible. This means that it should be possible to load every translation file and every dictionary folder using the correct language tag, instead of having to fall back to the crude xx_XX-type Zettlr used until now.**
- Moved the editor-specific `getWordCount` function out as a helper function.
- Added an `updateFile` method to the `global.ipc` to enable files to update themselves silently if something changed.
- Moved the calculating functionality of the `ZettlrStatsView` class to the main process's `ZettlrStats` class.
- Removed the `ZettlrStatsView` class and moved the triggering functionality to the `ZettlrBody` class accordingly with the other popups/dialogs.
- Branched out the `ZettlrDialog` class so that all functionality is now provided by specialised dialog classes that inherit from the base class.
- Rearranged the options within the "Advanced" tab in the preferences dialog.
- Moved out all CodeMirror `require()` to a new file called `autoload.js` in the assets directory to save space in the main `ZettlrEditor` class.
- Added a security pass to the droppable directories to make sure they don't accidentally accept the file and direct the main process to move it out of the app instead of moving it to themselves.
- **Switched back to `electron 3` for the time being, as `electron 4` still has a nasty bug that renders the toolbar unusable when exiting fullscreen on macOS (see https://github.com/electron/electron/issues/16418 ).**
- Switched to `nspell` for spellchecking, as the correction-finding algorithm works smoother and the repository is not as old as `Typo.js`.
- `makeExport` now returns a Promise instead of the Exporter object. The exporter is now only returned if it's call succeeded (by passing it to `resolve`).
- There is now the yarn command `yarn less:extract` available which extracts the CSS class names and IDs from the prebuilt styles. _Please note that you must run the `yarn less` command beforehand._

# 1.0.0

## GUI and functionality

- Added a written reason for why some preferences options failed validation and need to be corrected.
- Moved the attachment options to the "Advanced"-tab in the preferences window.
- Fixed a bug that threw errors when you tried to `Alt`-click a virtual directory.
- Fixed the bug that virtual directories got duplicated on the creation of new files.
- Added a "Donate" menu entry to the help menu.
- The startup overlay is now gone.
- Dictionaries can be selected and deselected at runtime.
- Fixed a bug that did not remove the file's ID in the preview list, after it has been deleted from the file itself.
- Added an option to deactivate the automatic closing of pairs of matching characters in the editor.
- The app now supports code folding! Now you can click the new, small arrows left to Markdown headings to collapse everything below it!
- Removed the customised word processor templates. Zettlr now uses the default reference docs provided by Pandoc.
- Projects can now also be exported to odt, docx, and HTML.
- Added tag autocomplete. Now when you start typing a `#`-character, you are presented with a list of tags you already use inside your files, so you don't use similar (but not same) tags in different files.
- Added `citeproc-js` integration: Now you can point Zettlr to a JSON CSL-file (ideally generated by Zotero) and it will automatically enable you to put `@BibTex-ID`s or even complex Pandoc citations in your text, which will not only be automatically replaced by a correct citation (only Chicago supported, because it is only a preview), but also renders a preview bibliography! Additionally, if you point Zettlr to a CSL Style file in the settings of a project, it will use this file to generate your citations!
- Added an option to change the `sansfont` property of `LaTeX`-documents, used mainly for headings.
- The Pomodoro timer now remembers your settings on a per-session basis.
- Added an additional check to see whether or not a huge number of words has been pasted into the editor. If so, the word counter won't count these towards the overall counter. So if you need to paste in whole documents, this won't raise your word counter absurdly high.
- Fixed a bug that rendered unwanted Math previews.
- Added file-open buttons. Now, whenever you are required to select a normal file, Zettlr provides you with a button that lets you choose the file comfortably.
- Zettlr now features an additional "Display" preferences tab, which lets you control all things that define Zettlr's appearance.
- You can now constrain the maximum size of images in the editor, separated by maximum width and maximum height.
- Updated the about dialog to now feature a tabbed interface containing main projects with licenses for the four big projects Zettlr use (Electron, Node.js, CodeMirror, and CitationStyleLanguage), all complementary projects, and the license of Zettlr itself.
- Now only escaping characters are formatted, not the characters following them.
- Fixed a bug that would prevent you from being able to modify an already loaded image without restarting Zettlr, because it would cache the image and not reload the modified version of it.
- Updated the styling of form elements: Now ranges and radio buttons are also displayed in the Zettlr design.
- Added an option to set a custom TeX template for PDF exports both in the general PDF preferences as well as on a per-project setting.
- Restored the functionality to quickly navigate the files in the preview container using the arrow keys `Up` and `Down`. Also you can once again jump to the end of the list by pressing an arrow key while holding `Cmd/Ctrl`.
- Zettlr now sorts your files based on a natural sorting order. You can restore the ASCII-sorting (the sorting as it has been until now) in the settings.
- Tags can now be escaped with a backslash (`\`) to make sure they won't show up in the tag dropdown list and also won't render as tags.
- Keyboard navigation is much more reliable.
- Fixed creation of new files while writing in the editor with no file open.
- The search functionality in both editor and Quicklook windows has been enhanced. It is now faster and you have to explicitly request a regular expression search by typing it literally. This means: Searching for `/\w/` will select all words inside the editor, while `\w` will literally search for that string.
- Zettlr now supports internal links. If you place a pandoc-compatible identifier inside a markdown link, it will try to jump to the respective line. E.g., the identifier `#tangos-photography-and-film` will match the heading `# Tangos, Photography, and Film`. Simply use a standard Markdown link: `[Go to Tangos, Photography, and Film](#tangos-photography-and-film)`.
- Zettlr keeps some margin between the cursor where you are writing and the window edges, i.e. it won't touch the window edges anymore, but keep a nice distance.
- Quicklook windows can now be "popped out" so that they are no longer bound to the main window but can be dragged onto different displays, etc.
- Windows and Linux windows now follow macOS in having no native window frame, but instead they employ the same strategy as macOS: The toolbar is the top element inside the main window of Zettlr, featuring window controls and, additionally, a button to open the application menu from the toolbar.
- Zettlr correctly selects words containing apostrophs so that you can correct them adequately without the app "forgetting" the l' or 'll-part (or similar) of the word.
- There's now an option to copy a file's ID to clipboard, if the file has one.
- We've updated the Zettlr icon! It now matches the brand colour and has a modern look.
- The image size constrainers look nicer and more intuitive now.
- Added controls to determine which elements are rendered inside Markdown documents.
- Simplified the attachment file handling and enabled dragging the paths of the files into the editor (e.g., to insert images).
- Now the ID- and tag-search is case-insensitive.
- Changes to the ID generation: Now if you press `Cmd/Ctrl+L`, the generated ID will be pasted wherever your cursor is currently (e.g. inside all text fields). Zettlr tries to back up your clipboard's contents and restore them afterwards.
- Zettlr recognises IDs inside the name of a file. **If the ID pattern returns a match in the file name, this ID takes precedence over any ID that may be in the file's content!**
- Added context menu entry to open link in the browser.
- Images can now be dragged from the attachment pane onto the editor and will automatically be converted into valid Markdown links.
- The tooltip that displays footnote texts when you hover over footnote references now displays formatted text, and not raw Markdown.
- The zoom level of the editor's text is not lost on toggling the distraction-free mode anymore.
- Update to the citeproc search. If you type an `@` and begin searching for a work to cite, you can now also search through the title and don't necessarily have to know the ID anymore!
- Added basic tag cloud functionality. You have now a new button in your toolbar that shows you all the tags that you've used somewhere in your files. You can also copy the full list into the clipboard!
- Updates to the search functionality: Now the AND operator works as a requirement again (until now files have also reported search results if one or two of the search terms have matched, even if they were all required). Additionally, the tag search within files now accounts for a hashtag in front of the search term.

## Under the hood

- Documentation update in `ZettlrValidation`.
- Updated the `.dmg`-installer file with a better background image.
- Consolidated the `package.json` build fields.
- **Warning: The app ID has changed from `com.zettlr.www` to `com.zettlr.app`.** [For the implications please check this link](https://www.electron.build/configuration/nsis#guid-vs-application-name) -- the change only affects Windows users.
- Refactored the complete menu logic to make it more accessible.
- Added a global `notify()` method in the renderer process for convenience.
- Added an option to make footnotes inside files unique prior to project exports.
- Moved the dictionary functions to the main process for asynchronous background loading.
- Began using `tern.js` for better autocompletion.
- **Fundamental Core Update**: Now on each request for a new file tree (using the command `paths-update`) not the whole object is sent towards the renderer because of app crashes arising from the use of synchronous messages via the new `typo`-channel. Instead, a dummy list is sent containing only the properties that the renderer accesses anyway. This way not only the amount of data is reduced quite significantly, but also the app does not crash on file and directory operations.
- Removed an additional openPaths-update during the renaming of root files.
- Now the current directory is re-set correctly after renaming the current directory.
- Refactored the context menu to resemble the same structure as the application menu.
- Switched to the `handlebars.js` templating engine.
- The `askSaveFile()`-dialog is now non-blocking.
- `ZettlrFile` objects won't forcefully try to move a file to trash while handling watchdog events anymore.
- `ZettlrRendererIPC` and `ZettlrIPC` now access the `ipc`-modules consistent with all other classes.
- Generalised the `askFile()` function in `ZettlrWindow` for further purposes.
- The `ZettlrConfig` now acts as an event emitter and emits `update`-events, whenever the configuration object changes. It can be subscribed to using `global.config.on` (to unsubscribe use `global.config.off`).
- Added a `global.ipc.notify`-function to easily send notifications to the renderer.
- Added a "cachebreaker" to the preview images in Zettlr.
- Moved a lot of files around: The CSS, Fonts, JavaScript and the template files are now in the `common` directory, so that it makes sense that there can be multiple windows that share those files.
- **ATTENTION: We've stopped committing the compiled Handlebars templates and CSS files to the repository, so even if you don't develop styles or templates, you now need to run `yarn/npm less` and `yarn/npm handlebars` before you run the application!**
- Removed a bunch of superfluous pass-through functions from the `ZettlrRenderer` class.
- Bugfixes in the `ZettlrExport` class.
- Switched to documentation.js for generating the API documentation.

# 0.20.0

## GUI and functionality

- Fixed a bug during import that resulted in crashing the app if no Pandoc was found.
- Updated the styling of the app to make it feel more modern.
- To open a file directly by typing its name into the search bar you don't have to get the capitalisation correct anymore.
- It is now possible to traverse the file tree directly by clicking on the directories inside the preview pane. Use a single click to make that directory your current one, or use an `Alt`-click to traverse back up to its parent directory.
- Now the "Save changes before quitting?"-Dialog won't appear — all your files will be saved immediately before quitting.
- Zettlr now remembers your last opened file and the last selected directory and restores them on each restart (if they still exist).
- Images can now also have pandoc attributes assigned (in curly brackets after the image tag) and will both render correctly inside Zettlr and work as intended on export.
- The app will now remember its size and position on screen and restore it after a restart.
- Changes to the design of the dark mode. It's now a little bit blue-ish and the colours are finally adapted to the brand.
- The directory list is now way less cluttered and looks way better than before.
- Dropping images onto the app is now possible!
- Added the long-commented-out blockquote command to the context menu.
- iframes will now be rendered as well (such as the embed codes by YouTube or Vimeo). Note that only `<iframe>`-tags will be rendered, so Twitter embed won't work, for example.
- Removed a small bug that would use the text selection cursor over directories after you've dragged a file.
- Zettlr now remembers the last directories you were in when you successfully imported a file or opened a directory.
- Added `Droid Sans Mono` as monospaced font family and updated the fonts around the app.
- The Zettelkasten ID doesn't need to be in the format `@ID:<your-id>` anymore. Also the zkn-links can be customised.
- The generation of IDs is now up to your creativity.
- Made the search progress indication better. Now, instead of the background filling up with sometimes ugly colours, a circle just as for the Pomodoro timer is used.
- The file snippets now hold additional information, such as the ID of the given file or the amount of tags. Additionally, if you hover over the number of tags, a popup will tell you *which* tags the file holds. Directories also now show their number of children elements (both directories and files).
- The text snippets have been removed from the app.
- The Quicklook windows now follow the application's theme.
- Fixed a bug that generated a falsy first search cursor and prevented case insensitive searching.
- Added extended statistics. Now you can exactly see when you've written how many words by clicking the new button in the small statistics popup.
- You may now use `#`-characters inside tags.
- macOS users now have an inset titlebar to make the app feel more immersive while not in fullscreen as well.
- QuickLook windows now display the headings in the correct size again.
- On smaller displays, Zettlr now has smaller margins and paddings so that each display size's space is used best.
- Removed the `ID`-button from the toolbar. The command is still present in the menu and still works using the shortcut `Cmd/Ctrl+L`.
- Fixed the bug that the attachment pane tooltip was partially hidden.
- Quicklook windows are now constrained to the body area, and cannot be dragged over the toolbar.
- Added validation to the settings so that you can't accidentally set wrong values.
- The default buttons for dialogs are now reactivated, so you can remove files and folders by simply hitting `Return` to confirm the removal.
- Anything markdown-specific (links, tasks, images) won't be rendered in any mode other than markdown anymore. So you can now rest assured that your links won't be converted and comments won't be displayed the size of headings in comment blocks or something.
- Indented tasks are now rendered.
- The table of contents now ignores comments in comment-blocks (no matter which language) and also has a better detection for the level of these.
- Fixed a bug that threw errors on moving directories around.
- Added Math inline-rendering.

## Under the hood

- Implemented the try/catch construct around `ZettlrImport` to actually catch the errors that were thrown by this function.
- Added globally accessible config getters and setters so that the `ZettlrConfig`-object is now reachable from within all classes in the app.
- Changes to `ZettlrWindow` to create windows using programmatical boundaries.
- Updated the image finding regex again.
- Reorganised the font families in the less resources.
- The popup is now much simpler to call.
- Removed instantiation from both ZettlrImport and ZettlrExport.
- All Zettlr installations now receive a unique UUID.
- Using `global.config.get` it is now possible in the renderer to access the configuration programmatically without the need to send events.
- Replaced all renderer configuration requests with the new, faster and synchronous method.
- Fixed a missing dependency in `ZettlrAttachment`.
- Updated to `electron` 3.
- Changed `app.makeSingleInstance` to `app.requestSingleInstanceLock` as recommended by the docs.
- Updated dependencies to the newest versions.
- Image preview rendering is now independent of `path`.
- Refactored the complete configuration setting process.
- Explicitly set `defaultId` on confirmation dialogs.
- `detach()` is now called only after the move operation of a `ZettlrDir` has been completed to remove the `parent`-pointer.

# 0.19.0

## GUI and functionality

- **Import functionality**: Now you can import from nearly all file types pandoc supports into Zettlr. Simply select the desired target directory and select File -> Import files!
- Added a lot of **exporting** options. More are still to come!
- **Export Markdown files as reveal.js presentations**: From 0.19.0 on, Zettlr will support the export of reveal.js-presentations. Also, there's theme support built in!
- If you insert a footnote, the cursor is not moved throughout the document so that the writing flow is more immersive.
- The text field used to edit a footnote reference text is now automatically focused.
- The editor will now directly mute lines when in full screen as soon as you change the preference setting for this. You don't have to move the cursor anymore for this.
- Fixed a bug that showed a dedicated _file_ menu when right-clicking directory ribbons and then threw errors if you clicked on anything in the menu.
- Fixed the strange behaviour of Zettlr telling you there are no suggestions for a word, although you did not right-click a wrongly spelled word.
- Inline links rendered inside headers are now always the correct size.
- Email-addresses are now correctly identified and will be rendered as clickable links as well. If you `Alt`-click on them, they will open the default email option (i.e. they are the same as clicking on any website's email addresses).
- Fixes to the project feature.
- Made the dictionaries finally independent from the four default translations.
- Added about 70 languages to the four default translations. This means: If you now include a custom dictionary or a custom translation, chances are high that it will be detected and translated automatically!
- Added a bunch of dictionaries that now come shipped with the app.
- Finally found & fixed the bug that kept detecting whole swathes of text as links and inserted them on link insert or didn't detect any link at all.
- Transferred the download page in the updater to the new download landing page at zettlr.com/download.
- Clicking on marked tags in the preview list will now trigger a search for these tags.
- Added support for `TeX`-files. So in case you want to export something to PDF, you can add custom `LaTeX` statements in their respective file to amend the styling Zettlr applies.
- You can now rest assured that on export of projects with nested files all images, even relative ones, will successfully be rendered in your PDF output.
- Changes to the HTML exporting template. Now, images should always fit on screen.
- You can now create `LaTeX` files by using the extension `.tex` when creating new files.
- Better Pomodoro counter.

## Under the hood

- Changes to the `runCommand` method in `ZettlrEditor`.
- Changes to the `insertFootnote` command.
- Changes to the `_editFootnote()` method in `ZettlrEditor`.
- Changed the event type the editor is listening to when you finished editing a footnote from `keyup` to `keydown`.
- Moved the inline and block element rendering functions to their own commands to reduce the file size of `ZettlrEditor`.
- Fixed the task recognition regex to prevent ugly errors logged to the console if you entered on an empty line a task list item directly followed by braces (such as `- [ ](some text)`).
- Additional security checks while building the context menu.
- Amended the regex for rendering links. Also provided a callback option for CodeMirror to be able to port the plugin fully externally and integrate it into other instances.
- Added `ZettlrImport` class for handling file imports.
- Removed the unnecessary PDF exporting LaTeX template from the pandoc directory.
- Added another newline character when gluing Markdown files together on project exports.
- Fixed a bug that would not read in a saved project config on restart.
- Huge changes to the selection and retrieval of dictionaries for the spellchecking algorithm.
- Made the regular expression detecting links in the clipboard non-global and limited it to only detecting single links in the clipboard.
- The download page will now count all updates by users to keep track of how many users are using the app (only the click is counted, no personal information is collected). To avoid detection of you updating, simply visit zettlr.com/download manually.
- Amended `ZettlrRenderer` by a function to programmatically trigger global searches.
- Added `.tex` to the list of supported file types. Added a mode switch to `ZettlrEditor`s `open()` method.
- Small fix to the toolbar CSS for not having a hover effect on the Pomodoro button in dark mode.
- Change to the `less.js` script. It now minimises the CSS output to further optimise the styling.
- Spell checking is now off by default in fresh installations to speed up the first start.
- Amendments to `ZettlrProject`, `ZettlrFile` and `ZettlrExport` to ensure relative image paths are accurately converted into absolute ones on exporting them.
- Streamlined setting the `ZettlrWindow` title. `Zettlrwindow::setTitle()` is now deprecated.

# 0.18.3

## GUI and functionality

- Now the list design and all other colours and syntax highlighting should be fixed again.
- `ALT`-clicking files now opens them as QuickLook windows.
- Now Quicklook windows render the content automatically as the main editor does. Only the previewable elements will not be rendered.
- Fixed a bug that allowed you to try to create files, folders and virtual directories although no directory is selected.

## Under the hood

- Cleaned up the mess inside the LESS resource files and removed the global pollution with CSS styles that led to strange rendering behaviour.
- Replaced the `net` command to check for updates with the better package `got`, thereby reducing the amount of requests to one only. Therefore, `is-online` also has been removed.
- Updated dependencies. Switched to electron `2.0.8`.
- Changes to the `_gen()` and `select()` methods in `ZettlrPreview`.

# 0.18.2

## GUI and functionality

- Minor fix to the style of `code`-blocks in modals.
- Fixed a bug that prevented you from immediately re-selecting the previous file by simply clicking it again, after you opened an external markdown file in Zettlr, which then was selected automatically.
- Fixed an error thrown if a root file was removed remotely.
- Fixed Zettlr always asking to replace a file although it hasn't been modified remotely.
- Fixed a missing translation for changed files.
- Fixed the threshold for being close to surpassing average from 50 words below average to the half of average. 50 words were definitely too narrow for anyone to really see the intermediary message.
- Fixed some design rules.
- Reallowed arbitrary text selection inside the editor (mainly necessary for macOS's quick lookup functionality).
- Added styling for horizontal rulers (`* * *`) and escaped characters (e.g. `\*`).
- Fixes to the new tooltips. Now all tags receive the nicer tooltips on mouse over.
- Replaced the old footnote tooltip bubble, which did not look nice, with the much better `tippy.js`-bubbles.
- Added HTML syntax highlighting.
- Fixed an error on the export of Markdown files with code blocks.
- Added syntax highlighting capabilities in fenced code blocks for the following languages (use the words in brackets after the beginning of a code block, i.e. `\`\`\`javascript`):
    - C (c)
    - C# (csharp)
    - C++ (cpp)
    - CSS (css)
    - Java (java)
    - JavaScript (javascript)
    - LESS (less)
    - Objective C (objectivec)
    - PHP (php)
    - Python (python)
    - R (r)
    - Ruby (ruby)
    - SQL (sql)
    - Swift (swift)
    - YAML (yaml)

## Under the hood

- Added an additional check to definitely determine if chokidar has choked or the file has indeed been modified remotely.
- Lots of documentation has been added to the source code.
- Moved the `tippy()` function from the `ZettlrRenderer` to the correct classes (`ZettlrToolbar` and `ZettlrPreview`).
- Changes to the link detection regex in `ZettlrEditor`.
- Changes to the `export.tex` LaTeX export template. It now provides the `Shaded`-environment Pandoc requires on exporting files containing fenced code blocks.
- Added some amount of `HTML` syntax highlighting.
- Added a multiplex mode that can highlight fenced code blocks.
- Changed signature documentation of `ZettlrRenderer`'s `setCurrentFile` method to reflect the actual process (it is being passed a hash, not a file object).
- Changes to the `_tags`-array in `ZettlrPreview`. Now, the array is never completely regenerated, but resized according to the actual `_data`-array. The changes have affected the functionality of the functions `_gen()` and `refresh()` in this class.
- Added a `remove()` method to `Zettlr` for root files wanting to delete themselves.

# 0.18.1

## GUI and functionality

- Now it's possible to download and install custom translations for Zettlr! If you want to use a translation that is not (yet) officially bundled with the app, simply import the translation JSON-file into Zettlr using the respective option. It will immediately be available for selection within your preferences (but a restart to apply the change is still necessary). The language file must be in the format `aaa_AAA.json` so that the app can detect the language by looking at the file name.
- Numbers are now localised with the correct delimiters.
- Zettlr now automatically indents text using four spaces to better work with other Markdown parsers.
- Changed resizing constraints: Editor can now have 90 percent width at maximum.
- Fixed a small bug that lets you open non-markdown files as roots.
- You can now copy selected Markdown text as HTML! Just press `Cmd/Ctrl+Alt+C` instead of `Cmd/Ctrl+C`.
- Added an online-check. From now on, if you are offline, Zettlr won't show you ugly error messages, but a simple notification that you are, in fact, offline and Zettlr can't check for updates.
- Improved footnote placement.
- Improved the placement of images in exported PDF files.
- Increased search speed and fixed internal errors in displaying search results.

## Under the hood

- Changes to `getSupportedLangs()`: The function now returns a dynamically generated array of all available translations. This also includes language files that are placed inside the app's data directory (in the subdirectory `lang`).
- Changes to `i18n.js` to reflect the fact that a language could also be located inside the application data directory (it now first tries to load the file from within the app, and if this fails searches for the file in the app data directory).
- Zettlr now preserves the linefeeds of a file on saving.
- Refactored the app's LESS and style handling.
- Simplified the theme toggling.
- Consolidated CSS styles.
- Updated dependencies. Switched to Electron `2.0.6`.
- Removed `package-lock.json`, because nobody uses them anyway and yarn `1.9.2` just complained about them.
- Changed resizing constraints: Editor can now have 90 percent width at maximum.
- Fixed a logical error in `ZettlrConfig` that allowed non-markdown-files to be opened as root files.
- Buffered the update check with an online-check. Renamed the original `check()` to `_fetchReleases()`.
- Fixes to the footnote placement.
- Removed an unused function from `ZettlrEditor`.
- Removed excess `console.log` from `ZettlrBody`.
- Added an additional security check before marking results in the editor instance.

# 0.18.0

## GUI and functionality

- Added the project feature: Now you can convert directories into "projects" (via context menu). A project is simply the possibility for you to adjust PDF options for a set of files differently than in your general PDF settings and tweak the generation a little bit more. It is thought especially for exporting many files into a single PDF file, and has options to generate a table of contents or a title page. _All files in the project directory and all of its sub-directories are concatenated in the same way as the preview list does it. Directories themselves are ignored. Then all these files are simply glued together and exported using the special settings you've given the project._
- Included tag preferences. These allow you to assign colours to specific tags, so that you can see in the preview list directly which files contain specific tags (such as, e.g., `#todo` or `#in-progress`) to have an overview over the work you need to do or categorise your files.
- Now the editor should correctly resize itself if the window itself changes its size.
- Now, if you use the combined view, Zettlr recognises a second click on an already selected directory and switches to the preview list instead. If you do so while the expanded mode is active, nothing will happen.
- I finally found the bug that was showing `NaN` instead of real numbers in the stats view. Now it should work on all systems just fine. (It only happened when there were less than thirty days of recorded statistical history available.)
- Adjusted the placement of the dialogs. Now they should definitely be placed in the center, if they are smaller than the window and should never result in a scrollable window.
- The dialog windows should pop up much faster now.
- Changed the styles of all dialog windows, and made pretty especially the PDF preferences windows.
- Replaced the system default's title popups with nicer looking popups.
- Changed image preview rendering. Now, images smaller than the viewport will not scale up to fill the full width, but remain smaller than the viewport width.
- Added a preview rendering of task items with checkboxes.
- Now Zettlr will directly react to you clicking with your mouse into the window and doesn't require you to click a second time after the app has been focused again.
- Snippets are now off by default.
- Fixed a small error that led to the editor behaving strange after resizing the sidebar.
- There is now no lag anymore on saving files. As a side effect, the global search is not exited when you change a little bit and then save the file.
- Changed PDF export.
- Small fix to the ZKN tag detection.
- Added additional error handling in the updater (so you know _why_ Zettlr couldn't tell you why no update check is possible).
- Renaming files is now faster.
- If you now begin to drag a file, after you have stopped dragging the file (i.e. either you dropped it onto a directory or you dropped it somewhere else to cancel the move), the preview pane will be shown again.
- Now it is possible to drag out Markdown files from Zettlr into other apps.
- Clicking on the "No open files or folders"-notification when there are no open folders or files in the directory tree will automatically show the open-dialog.
- Fixed the theming in the QuickLook windows. Now they will be the same theme as the app itself.

## Under the hood

- Finally renamed the `strong` element in the file tiles in the preview list to a simple `p` to re-gain semantic correctness there.
- Lots of LESS-code added, several other files have been changed.
- Added an event listener to Window resizes to change the editor's width accordingly with the `resizable` activated.
- Changes to `requestDir()` function in `ZettlrRenderer`.
- Changes to the Statistics viewer.
- Changes to `ZettlrDialog`.
- Changes to `ZettlrRenderer`. Now the translation strings will be copied into the memory of the renderer process directly. This results in better overall performance, especially in dialogs, for which a lot of such strings are needed.
- Updated development dependencies: `electron` is now `2.0.4`, `electron-builder` is now `20.19.2` and `less.js` is now `3.5.3`.
- Changes to `ZettlrBody`-proceed function.
- Added `tippy.js` to the list of dependencies; replaced standard system titles with Tippy titles.
- Added the `acceptFirstMouse` option to the creation of new `BrowserWindow`s.
- Now refreshing the editor instance after dragstop of the divider between combiner and the editor.
- Removed an unnecessary if-statement in `ZettlrToolbar`.
- Added a method to only update the current file in the renderer process, which speeds up saving *a lot*.
- Additional check in `ZettlrVirtualDirectory`.
- Changes to the `LaTeX` export template.
- Replaced the complicated and unreliable tag recognition to a much simpler regular expression.
- Error handling in `ZettlrUpdater`.
- Changes to the process of renaming files. Now the renaming process should be reflected quicker in the renderer, because we don't send a complete new path object, but only the specific, renamed file.
- Fixes and changes to the dragging behaviour in the renderer.
- Added a dragging event, so that the main process automatically enables dragging out of the app.
- Added the `getRenderer()`-function to `ZettlrDirectories`, so that the `EmptyPaths`-object can send the respective event to the main process.
- Combined the `setContent()` and `save()`-functions in `ZettlrFile`, because there was simply no need to have them separated. Also, removed the `modified`-flag from the file.

# 0.17.1

## GUI and functionality

- **Combined preview and directory pane**. Now only one of both is visible, never both, but also never none. Pressing `Cmd/Ctrl+1` and `Cmd/Ctrl+2` will still toggle visibility of both preview and directory pane, but not in parallel anymore. So hiding the preview pane will automatically show the directory pane and vice versa. Also, if you are on the preview pane, moving with your mouse to the top of the pane will show an arrow that lets you enter the directory pane again. Zettlr will automatically switch to the preview pane in a number of cases: Selection of a directory, searches, and renaming of files.
- Added syntax highlightning for Markdown tables.
- Resizing of combined tree view and preview pane as well es the editor is now possible.
- Changes to the HTML export template. Now tables are better integrated, as well as blockquotes.
- Added an option to choose whether or not the combined view or the regular, old view should be used for preview and tree view.

## Under the hood

- Removed some unnecessary toggle-functions.
- Changes to the styles of preview and directory panes.
- Changes to the main template.
- Markdown table detection is now handled by the ZKN-mode.
- Changes to the styles for enabling both extended and narrow sidebar mode.
- Added another check for popup height in `ZettlrPopup` to ensure popups can be displayed on screen and don't end up being cut off by the window.

# 0.17.0

## GUI and functionality

- Added full stops after TOC-ordinals.
- The `HTML`-export (e.g., for printing) does not rely on `pandoc` to be present on the system anymore. In other words: `HTML`-export is now working everywhere and has no prerequisites anymore. _Attention: As we do not rely on pandoc for HTML exports anymore, this means that the HTML format is likely to suffer from some inconsistencies, as the rendering engine is way less advanced than pandoc. Yet, this should not pose a problem, as the HTML-export is intended to be for quick previews and prints only._
- Added a bunch of options for exporting files, such as:
    - Choose whether to save the exported files in the temporary directory (which is expunged on each restart of the system) or in your current working directory (meaning they are persistent across system reboots and are also accessible normally through your file explorer).
    - Strip Zettelkasten-IDs (such as `@ID:yyyymmddhhmmss`).
    - Strip tags (in the format `#tag`).
    - Completely remove internal Zettelkasten-links (e.g. `[[<link-text>]]`).
    - Only unlink internal Zettelkaten-links (i.e. transform `[[<link-text>]]` to `<link-text>`).
- Switched to the better `xelatex` engine to render PDF documents.
- Added a great number of PDF export customization options. More will be coming in the future (depending on necessities and user wishes).
- Added a feature that search results now also are shown on the scrollbar so that you know exactly where the matches reside in your document.
- Replaced the ugly find-in-file dialog with a Zettlr-style popup and added a replace-function as well. Simply press `Return` while inside the replacement-field to replace the next occurrence of your search term, or press `ALT`+`Return`, to replace *all* occurrences at once. **The search is case-insensitive**.
- Introducing a **distraction free mode**, which can be toggled by pressing `Cmd/Ctrl+J`. This makes the editor fullscreen and mutes all lines except the one in which you are currently working.
- Added option to recall up to ten recently used documents.
- Hashtags are now not rendered, when they are not preceded by a space or are at the start of a line. This prevents links with anchor-names being displayed wrongly.
- Added a shortcut for inserting footnotes: `Ctrl+Alt+F` (Windows+Linux) or `Cmd+Alt+R` (macOS).

## Under the hood

- Moved all exporting functionality to a separate class, `ZettlrExport`.
- Removed unnecessary CodeMirror plugins.
- Removed unnecessary styles and some unnecessary (b/c unused) functionality.

# 0.16.0

## GUI and functionality

- Introducing **Virtual Directories**. Now it is possible to add "ghost" directories to your directories that act as a subset of these directories. They are not actually present on disk (but are persistent with a so-called dot-file named `.ztr-virtual-directory`) and therefore can be used to create collections of files by manually adding files to them. _You can only add files to these virtual directories that are present in the containing directory. Also, you cannot move them because they are bound to their parent directories._
- Fixed a bug that threw an error every time you tried to delete a directory with no file open currently.
- Fixes to the inline commands. Now, when you press `Cmd/Ctrl+I` or `Cmd/Ctrl+B` a second time after you finished writing your strong/emphasised text, Zettlr will actually "exit" the bold/italic markings and not try to insert them a second time. (_Note that it will still insert the end-markings if the characters directly after the current cursor position are not the end-markings_).
- Fixed a bug that threw errors if you were to rename a non-opened file.
- Fixed a bug that threw errors if you were to rename a directory, while none was selected.
- Prevent arbitrary selection in the app to make it feel even more native.
- Huge performance boost on selecting directories and files.
- Translated remotely triggered file- and directory-events.
- Finally fixed the bug that the end-search button disappeared and the input field went in disarray when the window size was too small.
- Re-introduced feature that Zettlr asks the user to replace the current editor content, if the current file has been changed remotely.
- Now, if the current file is removed remotely, Zettlr automatically closes the file in the editor as well.
- On updates, the download URL to GitHub now opens on the system's browser.

## Under the hood

- Removed an excess `console.log`.
- Implemented `indentlist` plugin directly in Zettlr core.
- Continued work on virtual directories.
- Small changes to `Zettlr` and `ZettlrDir` classes.
- Small changes to the markdown shortcut plugin.
- Fixed a small error in `Zettlr` class.
- Removed a huge bottleneck in the directory selection logic (now the Zettlr main process will not send the complete `ZettlrDir`-object to the renderer, but just the hash, because the renderer has a full copy of the objects in memory).
- Removed the same, big bottleneck in the file selection logic.
- Updated all dependencies to their latest version. Thereby we've switched to Electron 2.0.3.

# 0.15.5

## GUI and functionality

- Additions to the search functionality. If you begin typing in the global search field, Zettlr will autocomplete your typings with exact name matches. This way you can directly open respective files from your searchbar by simply confirming the file to be opened with the `RETURN`-key.
- Zettlr will now automatically try to force open a file when you commence a global search, if there is a file containing the typed name somewhere in the system.
- If you click a link without the `ALT`-key now, the cursor will be automatically placed and you can edit the link exactly where you clicked without having to click the position twice.
- Fixes to the attachment pane — now opening a directory will always work.
- Now the vertical scrollbar in the editor uses the default cursor, not the text cursor.
- Fixes to the generation and placement of popups. Now a bigger margin to the edges of the window is ensured, and the popups are now a little bit wider to reduce the possibilities of ugly line-breaks.
- Small fix to the color of directory ribbons in dark mode.
- The attachment pane now refreshes on new attachments without the need to switch to another directory and then switch back. Also, after every watchdog run the renderer receives a new list of objects now in memory.

## Under the hood

- Small changes to the `_renderLinks()`-function in `ZettlrEditor`.
- Calling `_act()` in `ZettlrAttachments` even if there are no attachments to be able to still open the directory in these cases.
- Changes to `_place()` in `ZettlrPopup`.
- Changes to the `ZettlrToolbar` and `ZettlrRenderer` classes.
- Design-fixes.
- Removed an unnecessary check for the now non-existent `projectDir` option in the configuration constructor.
- Added a security check for additional `PATH`-variables in `ZettlrConfig`.
- Additional security-check in `ZettlrConfig`s `set()`-function to only add valid options. Now `set()` will return either `true` or `false` depending on whether the option was successfully set.
- Removed deprecated code from `ZettlrWindow` class.
- Added a security check in `ZettlrWindow`s `prompt()` function.
- Removed some unnecessary code from `ZettlrDir` class.
- Small changes to `ZettlrDir` constructor.
- Began first work on `ZettlrFilter` and `ZettlrVirtualDirectory`.
- Changes to `Zettlr` and `ZettlrRenderer` classes.

# 0.15.4

## GUI and functionality

- Zettlr saves a file prior to exporting to make sure you export what you see (WYSIWYE).
- Now Zettlr is more performant especially in documents containing a lot of links. Also, clicking a link _without_ the `ALT`-key pressed will now remove the link and make it editable, as intended.
- Design fix: Now the sorters in the preview pane don't alter the size of the directory field.
- Design change for Windows users: Now Zettlr on Windows uses the system's default font "Segoe UI", because as of strange font-smoothing effects, Lato is barely readable on Windows machines.
- Fixed a logical error in the script, so now Zettlr will remember where you were in a document and restore that view on every opening of a file (not persistent, i.e. if you close and re-open Zettlr itself, the positions will be reset).

## Under the hood

- Added `export` to the `CLOSING_COMMANDS`.
- Updates in `package.json`, updated dependencies.
- Fixed a wrongly placed `continue` in `_renderLinks()` in the `ZettlrEditor` class.
- Moved the saving of scrolling info from the `open()` function to the `close()` function in `ZettlrEditor`.

# 0.15.3

## GUI and functionality

- Removed some displaying of numbers during search.
- Added more file info - when you click on the word count, a small popup containing info about the characters, characters without spaces and also the selection is shown.
- Added a heatmap that shows you the relevance of the search results by adding a background color to the individual file ribbons. The more green and bright they get, the more relevant the file showed up in the results. **Important**: Files that do not match any of the selectors will be hidden as always, e.g. even grey files will at least fulfill the criteria!
- Removed directory ribbons while in search mode.
- Search mode will automatically be exited when selecting a different directory.
- Also, now when a search is done, the opened file will have all results marked in text so you can easily discern them from the rest of the text.
- Small design fixes.

## Under the hood

- Removed an unnecessary `paths-update` event.
- Augmented `getWordCount()` function to return the wordcount of any given string.
- Removed some strange artifacts from the search.
- Huge improvements to the search functionality.
- Finally implemented the new license in the files

# 0.15.2

## GUI and functionality

- Switched the directory indicator with the collapse indicator on root directories, so that the first always stays first.
- Huge performance increase in rendering the preview list.
- Small fix to the word count. Now an empty editor does not show that there's a word written.
- Removed the `Zoom` menu entry from the Window menu on macOS.
- The Reload-shortcut in debug-mode is now `F5`.
- Small fix to the Tag-recognition (now a `#` sign immediately followed by a delimiter character (e.g. spaces, line breaks or apostrophes) will not render a tag formatting).
- The Attachment pane will now scroll if there are too many attachments in it.
- Added an option to open the currently selected directory in the system's file browser (e.g. Finder on macOS or Explorer on Windows). The respective button resides next to the attachment pane's header.
- Small fix to the context menu: It will popup where the click occurred, and not where the mouse is when the menu is actually shown (noticeable especially when right-clicking a misspelled word).
- Augmented the autoclose-pairs with the default German quotes `„` and `“`.
- Changed the save function so that it does not save immediately, but gracefully implements a way to save changes any time a potentially file-closing command is issued (such as selecting another file).
- Changes to the design of the preview list.
- Removed the save-button from the toolbar and now Zettlr will not show you an indicator whether or not there are unsaved changes, because normally everything should be saved. In case changes are *not* saved under strange circumstances, Zettlr will still prompt you to save them if they would be lost.
- Fixed a small error that led Zettlr to believe that it doesn't need to reorder the opened root files and directories, although it should have, thereby having newly opened files pop up not at the top of the directories' list but at random positions somewhere in the directories.

## Under the hood

- Switched Preview-list rendering to `Clusterize.js` to keep huge lists renderable and reduce loading times.
- Removed the now unnecessary `ListView` and `ListViewItem` classes.
- Removed the unnecessary `file-revert` command handler in `ZettlrIPC`.
- Removed a `console.log` in `ZettlrPreview`.
- Added a `isModified()` function in `ZettlrRenderer`.
- Changes to `ZettlrRendererIPC` to accomodate graceful saving procedure.
- Upgraded dependencies.
- Coloured the output of the less compiler script so that it's easy to discern whether or not an error or a warning occurred.

# 0.15.1

## GUI and functionality

- **Switched license from MIT to GNU GPL v3. This also includes all prior releases!**
- Now if there is a valid URL in the clipboard it will be inserted as the URL on all images and links created, not just if there's nothing selected.
- Fixed a bug that prevented the opening of links if clicked with `Alt`-key pressed.
- Added the code indicators (backticks) to the list of auto-complete pairs.
- Fixed the rendering of internal links.
- Small changes to the design of file IDs.
- Moved the resize handles of quicklook windows completely out of the windows themselves so that they are more easy to reach and don't block the scrollbar.
- Fixed the colours of the directory sorters in dark mode.
- Translated the formattings.
- Updates to the readme.
- ID generation now also works if there is something selected.
- More generally: All CodeMirror commands (such as changing the formatting of a selection) will retain the selection you have made (i.e. they will save them, run the command and afterwards re-select what was selected previously).
- Fixed a small bug that could lead to errors while searching using the OR-operator.
- Updater now shows your current version in the update window.
- Small fixes to the styling of the update dialog.

## Under the hood

- Small change to the zkn-link regular expression (was greedy, now it is lazy) to prevent huge misrenderings in case two links were on one line.
- Removed the unnecessary `_sort()`-function in the `ZettlrDirectories`-class.

# 0.15.0

## GUI and functionality

- Fixed the button text color in popups.
- More shadow under the popups (makes them stick out more in the white mode).
- Now it is possible to open Markdown files directly with Zettlr by double clicking them or dragging them onto the app. Dropping also works for directories (#3).
- Zettlr now tells the Operating System that it is capable of handling `.md`- and `.markdown` files.
- Small fixes to the translations.
- Added an about dialog.
- Now Zettlr also converts "standalone" links (e.g. simple detected URLs without Markdown formatting around them) into clickable links. **Attention: Clicking now works with ALT instead of Shift!**
- Added a small popup to view some stats on your writing.
- Fixes to the word count (now also splits along line breaks).
- Moved all formattings to a small popup (indicated by the carriage return symbol). Also added other formatting possibilities, such as code, headings and blockquotes.
- Fixes to the formatting commands.
- Added an attachment pane (#6).
- Added an option to sort directories chronologically or according to name (#4).
- Begun adding zkn-functionality to Zettlr:
  - Now it is possible to use `@ID:<your-ID>` to give an ID to a file (generate one using the Toolbar Button or by pressing `Cmd/Ctrl+L`). If multiple IDs are defined in such a way, the first found will take precedence.
  - You can now tag your files using the Twitter-like syntax: `#hashtag`. Alt-Clicking on them will trigger a search for the tag.
  - You can now link searches in your files. If you type `[[search terms]]` this will trigger a directory-wide search for the search terms. If the link contains an ID in the format `[[@ID:<your-ID>]]`, Zettlr will try to get an exact match. If there is a file using that ID, it will be immediately opened. Also, a directory-wide search for all files referencing this ID will be conducted.

## Under the hood

- Fixed a small bug in the `ZettlrWatchdog` that prevented remotely added directories from being detected by the app.
- Given the classes `ZettlrFile` and `ZettlrDir` more authority over what happens with them. Now they're handling all events by themselves.
- Made the paths mandatory on creation of new `ZettlrFile` and `ZettlrDir` instances.
- Added `isFile()` and `isDir()` helper functions to check if paths actually denote a valid file or directory.
- Added `openPaths` configuration option to hold all opened paths and re-open them on every start.
- Small fix to the loading mechanism of the configuration to allow flexible arrays (needed for the `openPaths` option).
- Found **A LOT** of unnecessary and duplicate code in the `Zettlr` main class and removed it.
- Handle open events in `main.js` and make Zettlr definitively a single app instance.

# 0.14.3

## GUI and functionality

- Fixed a bug that prevented deletion of files and folders.
- Removed the now defunct autosave option in preferences.

## Under the hood

- Fixed a type error in `ZettlrWindow` that passed `undefined` instead of the window to the `showMessageBox` function.

# 0.14.2

## GUI and functionality

- Fixed input text color in popups (e.g., for new files and directories).
- Removed the autosave functionality. Now Zettlr automatically saves all changes "completely."

## Under the hood

- Updated `less.js` (dev-dependency) to latest version.
- Updated `chokidar` to latest version.
- Updated `electron-builder` (dev-dependency) to latest version.
- Removed all autosave-functions.
- `ZettlrWatchdog` can now add multiple paths to watch
- `ZettlrFile` can now also be root (e.g. have the `Zettlr`-object as parent)

# 0.14.1

## GUI and functionality

- Finally got rid of the horizontal scrollbar in the editor, that was visible on Windows and Linux systems
- Also, customized the scrollbar style to be more decent
- Major fixes to the User Interface (now looks way more modern and less cluttered)
- Fixed an error that did not update the snippet of a file on remote change

## Under the hood

- Added other files and directories to the ignore dirs of `chokidar`
- Fixed a small bug in the `poll()`-function

# 0.14.0

## GUI and functionality

- Now Zettlr can detect relative image paths (i.e. relative to the file in which they are referenced) and show these images successfully
- Fixed a bug that did not update the modification time of a file on save.
- Fixed the non-selection of the current file on directory selection
- Fixed a small bug that sometimes could throw an error when moving directories within the app
- Now a quicklook window can be brought to front by simply clicking its title
- Hid the textarea by default, so that on startup the editor field is clean
- Design improvements

## Under the hood

- Begun another code rewrite. This time, the focus is on two parts: First, prevent any access of object properties from other objects than `this`. Instead, use public functions (also, prevent calling of private functions from the outside). Second: Try to, again, move out some functionality from the Zettlr main class to shorten it.
- Removed unnecessary function calls in the renderer.
- Also added support for the [yarn package manager](https://yarnpkg.com/)

# 0.13.0

## GUI and functionality

- Fixed a bug that could lead to errors and misbehaviour if a huge number of directories and files was added
- Added toolbar button descriptions. Simply hover over a button with your mouse to learn about its functionality
- Added an autosave feature. Now, Zettlr keeps automatic saves of your current file.
- Added a reversion feature. With the revert button you can restore the editor content to the last saved state.
- Added an automatic check for updates. It is run on every start of Zettlr and can be called programmatically by clicking Help -> Check for Updates
- Fixed an error that disabled the end-search button in the searchbar.
- Fixed an error that did not refresh the preview list when a new file was created by saving an empty file.
- Fixed an error that did not select newly created directories in the tree view, although they were selected as could be seen in the preview pane.
- Small changes in the system integration.
- Additional check whether or not Pandoc and LaTeX are installed on the system.
- Added menu entries for downloading LaTeX and Pandoc.

## Under the hood

- Added the `ignoreDir` and `ignoreFile` helper functions to check whether or not a specific path should be excluded or not. This applies to directories and the watchdog. Ignored directory patterns (as regular expressions) reside in `source/common/data.json`.
- Ignoring the `jquery-ui.min.js` file on docs generation.
- Improved the documentation of the main classes.
- Updated to Electron 1.8.3.
- Updated Electron builder to 20.4.0.
- Forgot to update the dependencies for export last time.
- Moved the polling interval into `data.json`
- Added class `ZettlrUpdater` with barebone functionality.
- Added `additional_paths` in `source/common/data.json` to automatically append to electron's PATH as to make sure the additional fields in the preferences are no longer needed (unless in special cases).

# 0.12.0

## GUI and functionality

- *New feature*: Integrated dynamically generated **Table of Contents**! Simply click the hashtag symbol and a popup will appear that lets you quickly navigate through all headings in your file.
- *New feature*: Now **images are automatically displayed**, if they are on a single line (only the image, no other text)!
- *New feature*: Now **links are automatically rendered**! Simply shift-click on them! (closes #12)
- Improved the markdown shortcuts. Now, if nothing is selected, when you trigger the bold or italics option, the cursor will automatically be placed inside the formatting marks, so that you can start typing without having to worry about the placement of the cursor.
- Now, if there is a valid URL in the clipboard when you trigger the insert link/image commands, it will be taken automatically as the linking target, so that you only have to type in the text it should link to.
- Added Open-button to the toolbar to select a new directory (closes #2)
- Switched the icon font from fontawesome to the [WebHostingHub-Glyphs](http://www.webhostinghub.com/glyphs)
- Small UI fix in the preview listing
- Small UI fix: Now Zettlr auto-closes the following pairs of characters: `() [] {} '' "" »« “” ‘’ ** __`.

## Under the hood

- Moved supported filetypes to unified file `source/common/data.json`
- Documentation for all files added.
- `ESDoc`-support integrated for API documentation. Simply run `npm run docs:build` to generate a full documentation in `resources/docs`
- Moved the `handleEvent()` functions from the main objects to the IPC classes.
- Moved the toolbar buttons to `source/renderer/assets/toolbar/toolbar.json` as in the example of Electron Menu, to have more dynamic control over the generation of the toolbar.
- Updated dev-dependencies

# 0.11.0

## GUI and functionality

- Introducing a **pomodoro** counter! Now you can simply click on the circle at the right end of the toolbar to start a pomodoro counter. It alternates task-phases of 25 Minutes with short breaks of five minutes and, after every fourth task-phase, a longer break of twenty minutes. It also notifies you when a phase is over with a small notification and a soft sound. Head over to [the official website](https://francescocirillo.com/pages/pomodoro-technique) to get to know what this technique is about.
- Switched to default Lato font on all platforms (embedded the font in the app)
- Additional check whether or not a file/directory already exists at the target location when moving by drag'n'drop
- Some fixes to the Quicklook-windows
- Moved some development functions into a "debug" mode that can be activated in the preferences.
- Now the zoom in/out menu commands only zoom the editor itself, not the whole application
- Added a small little button to end a search (and thereby make visible again all files)
- Switched most dialogs to the smaller (and really nice) popups
- Moved the Exporting options directly to the new share button
- Now Zettlr shows default context menus for text fields
- Fixed an issue on opening new project directories that provided you with the current directory's path instead of the project directory
- Reversed direction of the changelog to display most recent changes at the top of the file.

## Under the hood

- Included jQuery and CodeMirror as npm packages for easier updating
- Added a `ZettlrPopup`-class for easy displaying of small forms and info texts, this will replace most `ZettlrDialog`-forms, because we don't need such a massive dialog box for a single text field (or something else)
- Updated electron to version `1.8.2`, updated other dependencies.
- Updated scripts section. Now the available commands are:
- `npm run start`: Start the development environment
- `npm run less`: Same command as previous, now only with more output
- `npm run build:quick`: Quick'n'dirty unpacked release for current platform
- `npm run release:this`: Build and pack the app for the current platform
- `npm run release:mac`: Build and pack for macOS x64 as DMG
- `npm run release:win`: Build and pack for Win x64 as NSIS installer
- `npm run release:linux`: Build and pack for Linux x64 both as deb and rpm

# 0.10.0

## GUI and functionality

- Fixed a small bug that did not remove the file list if the open directory was removed from the file system. Now, if the current directory is deleted, Zettlr will automatically select the parent directory.
- Small fix to the translations.
- Added a toolbar button that also triggers the export dialog.
- Fixed an issue that prevented you from autocorrecting misspelled words.
- Fixed the sorting of directories (now case insensitive)
- Fixed an error that didn't update the ID of a file on renaming
- Fixed an issue that threw errors sometimes while moving directories

## Under the hood

- Massive rewrite of the logic behind the preview pane. Now only necessary changes are actually re-rendered (and not, as was the case until now, everything), which decreases the locking-potential of the application as well as the average energy impact. Additionally, now it is possible simply to spit out one updated paths-object from main to simply trigger a (possible) re-render.
- Also massive rewrite of the logic behind the tree view. The changes have the same effects as those in the preview pane.

# 0.9.2

## GUI and functionality

- Changed paper format in the odt-template from "Letter" to "DIN A4."
- Now dialogs are correctly positioned (centered)
- Implemented notifications that can be used variously
- Watchdog now monitors changes to the file system
- Small fixes in functionality and translations

## Under the hood

- Added notification service (can be triggered by sending a `notify`-event to the renderer or call `notify()` on a body element.)

# 0.9.1

## GUI and functionality

- Fixed broken PDF export in 0.9.0
- Small improvement in the HTML export template. Now if you want to print out the HTML file, it should look way better than before.

## Under the hood

- Updated dependencies to electron 1.7.11 to react to exploit [CVE-2018-1000006](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2018-1000006). [See the electron project's blog for more information](https://electronjs.org/blog/protocol-handler-fix).

# 0.9.0

## GUI and functionality

- Fixed a bug that did not show the exact word count of 1.000 words in the toolbar.
- Translated the word counter into de_DE, en_US, en_GB and fr_FR
- The preview pane now does not scroll to its top on saving if it does not contain the current file
- Heavily improved footnote placement and removement
- Footnotes now show on hover to ease previewing.
- Fixed a small error that threw errors on deleting file with no file selected
- Fixed selection accuracy in Quicklook windows after they have been resized.
- Added modification time of files in the file preview.
- Modified the night mode and snippets toggler to display the status as checkmark (also amended the translations respectively)

## Under the hood

- Updated development dependencies
- Additional security check in the `trans()` method
- Footnote plugin now features way better RegEx recognition and works reliably.
- Also, made the footnote placements and deletions to only create one single history event (so that you don't have to press `Cmd/Ctrl+Z` twice to remove the footnote/re-add the footnote)
- Added basic watchdog functions. Not very sophisticated by now but it works.
- Now package.json does not trigger a rebuild of all modules when electron-builder is called (as we only rely on those already prebuilt)
- Again some rewrites to slimline the app
- Renamed events (now dir and file are prepended for easier identification)
- Now the renderer is completely autarc concerning configuration as darkTheme and snippets. This means the renderer can now be reloaded in dev mode without screwing up the config in main. (`afterWindowStart()` has been removed and set in the renderer)
- Wrapped the menu generation into a class (making it possible to set menu items based on configuration options)

# 0.8.1

**This is an emergency patch**. It fixes an error on Windows and Linux systems that disabled the complete main menu, making it unable to execute commands from the menu (e.g., opening a new root folder).

- Fixes a bug that rendered the whole application menu unusable
- Minor localization fixes

# 0.8.0

## GUI and functionality

- Context menu over a erroneous word now gives you suggestions on possible replacements; selecting them will replace the word.
- Fixed a small rendering bug that caused the editor not to correctly select text after hide/unhide of either the tree view or file preview pane.
- Included a toolbar and moved the global search out of the preview pane
- Fixed a small bug in which the title of the main window still showed the title of the currently opened file after it has been deleted
- Fixed a bug that made it impossible to export to PDF on Windows when Zettlr was installed to the `Program Files`-directory
- Fixed a bug that did not close the overlay if there were no dictionaries selected for spell checking
- Finally implemented the make/unmake itemized or numbered list function
- Also, finally added an easy way to insert and remove footnotes.
- - Fixed an error in which you could not save "empty" files on the fly if you just started typing into the editor without any file open.

## Under the hood (i.e.: technical stuff)

- Replaced npm package `trash` with electron internal `shell.moveItemToTrash()`
- Hardened the translation package against potential errors and accounted for also probably missing translations

# 0.7.0

- Included Spellchecking (en_US, en_GB, fr_FR, de_DE, more languages on request)
- Translated app into English, German and French.
- Introducing **Quicklook**: Right-click on any note and click "Quicklook" to open the file in a small overlay window. This enables you to keep open a file while simultaneously reading (and copying text) from different files.
- Fixed a minor error with the detection of clickable links
- Fixed an error that prevented searching for exact phrases
- Added a short check that Zettlr does not try to move a directory into a subdirectory.
- Multiple minor fixes and improvements
- Preview pane and directory tree view can now be hidden via `Cmd/Ctrl+1` and `Cmd/Ctrl+2`

# 0.6.0

- Now the file lists are automatically sorted on renaming files to immediately reflect a possibly changed order.
- The global search now also includes the name of the file
- Fixed a small error that prevented Zettlr from searching the first file in the preview pane
- Fixed an error in the inter-process communication (IPC) that led to unexpected behavior when using Shortcuts.
- Fixed an error that prevented renaming of directories if a file was selected.
- And behind the scene: We've rewritten the whole code base and made it more efficient — that's why the version has switched to 0.6.0

# 0.5.1

- Fixed a bug that disabled the creation of new directories and instead threw errors
- Fixed an error that was thrown by pandoc on each PDF export.

# 0.5.0

- Improved drag and drop of directories
- Moving files now works via drag'n'drop as well
- Fixed a bug that led to undefined errors while trying to rename directories
- Much cleaner arrow-key navigation through the preview pane — now failsafe.
- Now you can navigate to top or bottom in the preview list by holding Cmd or Ctrl while pressing the arrow key.
- Global search is now non-blocking and provides a progress indicator
- Now Shift-click on URLs opens these in external browser.
- Implemented preferences.

# 0.4.0

- Color theme unified (now less colors, more consistency)
- More generally, adaptions in design
- Included directories into preview list pane to mark where directories begin and end
- Now files and directories are automatically sorted, whenever a new gets added
- Renaming of files and directories is possible now.
- Moving of directories via drag'n'drop is now possible.
- Dark Theme configuration stays also after quit and restart.
- Minor bug fixes and improvements (especially failsafes)
- Context menu
- Auto closing of brackets and quotes

# 0.3.0

- The search dialog for the currently opened document now does not close on Enter but enables you to repeatedly press `Enter` instead of `Cmd/Ctrl-G` to `findNext`
- Added several shortcuts for comfortable editing: `Cmd/Ctrl-B` boldens a selected text (or inserts bold-markers at cursor position). Accordingly, `Cmd/Ctrl-I` emphasizes, `Cmd/Ctrl-K` converts the selection into a link and `Cmd/Ctrl-Shift-I` inserts an image.
- Added support for HTML, DOCX, ODT and PDF export using Pandoc and LaTeX

# 0.2.0

- Rewritten version with again several major code rewrites that have been done before this SVN began.

# 0.1.0

- Initial Version w/ several code rewrites that are not documented here.
