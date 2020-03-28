# (no version assigned)

## GUI and Functionality

- If available, a title from a YAML frontmatter will be appended to the displayed file entry when linking files.
- Copying images from the Explorer/Finder/file browser now offers to insert them into the document, copying them over to the assets directory.
- The popups are now more resilient against accidental closing, just like the dialogs.
- When focus-selecting the global search bar (pressing the mouse button in the input and using it to select some text immediately) works as in other inputs now.
- Added the week-number as a variable for filenames and the Zettelkasten IDs (use `%W`).
- When the tag cloud is filtered, "Copy Tags" will only copy the filtered tags, and no longer all tags. To copy all tags, reset the filter. Furthermore tags will now be copied to clipboard including the leading hashtag.
- Re-enabled double-dollar inline equations for rendering and syntax highlighting.
- HTML-style comments (`<!-- Lorem Ipsum -->`) are now also exempt from the word counting.
- Fixed an error in the Table Editor that would assume empty rows to be header rows, leading to false behavior when trying to display a completely empty table.
- The Table Editor can now also parse and display simple and grid tables, and a wider range of pipe tables, as described in the Pandoc manual.
- Fixed a small mistake where literal blocks would be wrongly offset as the editor treated them as list items.
- Fixed artefacts with spellchecking errors. Thanks to @ryota-abe for proposing the correct selector!
- The Table Editor now remembers what the source table looked like and tries to recreate that when it applies the changes to the DOM.
- Added verbose error reporting and improved the error handling during citeproc boot. Now, Gettlr will (a) remove error-throwing CiteKeys so that the rest of the library loads just fine and (b) display the exact errors as reported by citeproc-js so that users can immediately identify the bad keys and know where to look.

## Under the Hood

- Improvements to image dragging and dropping from the attachment sidebar.
- Switched the string variable replacer from vanilla JavaScript to moment.js, which simplified the function considerably.
- Updated insecure dependencies.

# 1.6.0

**The macOS-build of Gettlr is now code-signed and notarized, which means you will be able to open it without having to explicitly add an exception in your security preferences.**

## Breaking Changes

- If you want to enable the newly added MathJax CDN support for equation rendering, make sure to add the `--mathjax`-flag to your Pandoc command. If you did not modify the Pandoc command, you can "restore" the (new) default value, which will add the MathJax support for you.

## GUI and Functionality

- **New Feature**: [Mermaid](https://mermaid-js.github.io/mermaid/#/) chart support! Now you can add code blocks with the keyword "mermaid" (i.e. "```mermaid")to your document and use the Mermaid chart language to create charts!
- **New Feature**: Gettlr is now able to open file attachments for citations in your files. Simply right-click a citation, go to "Open Attachment" and select the cite-key for which you want to open the file attachment. Got multiple? Here's how Gettlr chooses which one to open: All attachments are listed and then the PDF files are sorted on top of the list. Then, Gettlr will open whatever attachment is the first in the list.
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
- Added the necessary `cslenvironment` to Gettlr's default TeX template so that Pandoc >2.8 does not throw errors. Thanks to @frederik-elwert for implementing!
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

# 1.5.0

## GUI and Functionality

- **New Feature**: AutoCorrect! Gettlr can now automatically replace certain characters with special symbols. For instance, by default it will replace `-->` with `→`, `!=` with `≠` or perform certain default replacements, such as transforming hyphens and fullstops with their typographically correct symbols (`...` -> `…` and `--` -> `–`). You can edit the replacement table in the preferences and adapt them to your own needs. _Please note_ that this feature will only be active when you are outside of codeblocks. This is meant to prevent unintended replacements, especially with certain languages such as R, where ASCII arrows are part of assignment operations.
- **New Feature**: Magic Quotes! Together with AutoCorrect, we've implemented the ability of Gettlr to use magic quotes. That means, whenever you type `"` (double quote) or `'` (single quote), it will instead insert the typographically correct characters of your choice, for instance `„…“` for German, or `« … »` for French. Even `「…」` for Japanese are supported! _Please note_ that this feature will only be active when you are outside of codeblocks. This is meant to prevent unintended replacements, as most languages require the ASCII quotes. Note also that having this feature active will deactivate the automatic bracket matching for quotes.
- YAML Frontmatters now receive the correct syntax highlighting.
- YAML Frontmatters do now have influence on the appearance of files: If a `title` is given, Gettlr will use this instead of the filename in the file list. If an array of `keywords` is given, Gettlr will add them to the rest found within the file.
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
- Implemented a "fat" cursor for the insert mode of Windows, so that when you press the `Ins`-key to toggle between inserting and replacing, Gettlr will graphically announce that you'll now be replacing characters rather than inserting. _Please note that this will only look good for monospaced fonts -- the other themes will have characters that are bigger than the cursor._
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
- If there are untranslated strings in your language, Gettlr will now try to show you the meaningful English ones first, before falling back to the translation identifiers, making the user experience better.
- Minor design improvements.
- Fixed the sidebar toggle.
- Added a context menu item to show a file in Finder/Explorer/your file browser.
- Added a notification when opening a new root directory to announce that the process of opening a directory may take some time. Gettlr will notify you once the new root directory has been fully loaded.
- When you close a root directory which also happened to be the currently selected one, Gettlr will try to select the previous or next root directory before actually closing the directory so that you will always have one directory selected.
- Fixed a small error that would count italics at the beginning of a line as a list item when applying a block-formatting style.

## Under the Hood

- Made sure the default languages do not appear twice in the preferences.
- Gettlr will now detect files it can open case-insensitively (so: `.md` === `.MD`).
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

- **New Feature**: Table management has just become easier. With the new table helper plugin, Gettlr enables you to circumvent manually having to edit Markdown tables. All you need to do now is keep the table helper active in the settings and just edit your tables as you would do in any other application. The table helper offers the following keyboard navigation shortcuts:
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
- You can now tell Gettlr to count characters instead of words (e.g. for Chinese).
- Custom CSS is now also rendered in the QuickLook windows.
- The preview image colour is now adapted to the active theme.
- You can now choose the formatting characters that should be used by the formatting commands.
- You can now change the pattern used for generating new file names, and omit being asked for filenames in general.
- Gettlr now tries to escape the input you provide for options that are directly passed into LaTeX documents.
- When you have open two or more root files with the same filename, Gettlr will display the containing directory's name as well.
- French-style guillemets are now supported for auto closing.
- Image display in HTML exports fixed.
- The About dialog contributors' tab now displays the date when the translation was last updated at.
- The dates and times all across the app are now correctly localised.
- When initiating a replace command with a regular expression search, you can now use variables in your replacement value so that you can re-use capturing groups from the search regular expression:
  - `$1` in the replacement value will be replaced with the first capturing group
  - `$2` with the second capturing group
  - ... and so forth.
- Gettlr now automatically downloads updates to the translations, if available.
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
- If there are two or more root directories open with the same name, Gettlr will now display the containing directory just like with root files.
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
- Moved all Gettlr CodeMirror modes to their respective files.
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
- Removed `GettlrWindow::setTitle()`.
- ESLint is now added to the `devDependencies` so that everyone can use the same code style.
- Add activation for opening external links on macOS.
- Switched to `Electron 6`.

# 1.3.0

## GUI and Functionality

**Attention, this update breaks three shortcuts: To view the file list, the tree view, and the attachment sidebar, you need to use `Cmd/Ctrl+!` (for toggling the sidebar), and `Cmd/Ctrl+?` for toggling the attachments. The shortcuts for `Cmd/Ctrl+[number]` are now reserved for recent documents!**

**Attention: Due to changes in the configuration, this update resets your setting concerning text snippets. They are now called "file information" and the corresponding setting will be set to "Show", regardless of your current setting.**

- **New Feature**: Gettlr can now automatically switch between light and dark mode either based on a fixed schedule or, if you are using macOS or Windows, based on the appearance of the operating system.
- **New Feature**: Add words to the user defined dictionary. You can remove words by removing them in the "Editor" tab in the preferences.
- **New Feature**: You can now provide a default path for images that you paste onto the editor in the preferences. If you provide a relative path, it'll be relative to the file.
- **New Feature**: In the preferences you can now switch between the three themes of the app:
  - _Berlin_: A modern sans-serif theme, the default.
  - _Frankfurt_: A clean serif-based theme with royal blue highlights.
  - _Bielefeld_: For Markdown purists, this theme features creme colours and a monospaced font.
- **New Feature**: Rearrange sections in your documents by dragging the headings in the Table of Contents popup around (_Note: Only works with ATX-Style headings!_). Please note that the last section will always count until the very last line, therefore including footnotes and references.
- **New Feature**: You can now also load BibTex files into Gettlr.
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
- Now, if trying to follow a link without a protocol (e.g. `www.google.com` instead of `https://www.google.com`), Gettlr will automatically assume `https` as the protocol to make sure it can be opened by the web browser. Correctly configured servers should automatically redirect you to `http`, if applicable.
- Gettlr now highlights the full link when you right-click it to give visual feedback that the context menu options "Copy Link" or "Open Link" will indeed use the full link, and not just a part of it.
- The dictionary selection is now more compact than before.
- The editor automatically selects the word under cursor on requesting a context menu, making both the code more clean and enabling you to simply right-click a word to make it, for instance, bold.
- Now you can comment out selections of text using the new shortcut `Cmd/Ctrl+Shift+C`.
- You can now also link to files on your local filesystem from within Markdown files. Gettlr will try to open them. The following algorithm is applied internally: First, try to open the link just like that. Second, try to open the current file's folder plus the link. Third, try to open https://\<link\>. If all three methods don't yield a result, Gettlr will show you a notification.
- The GUI is not locked anymore while a popup is shown.
- The tag preferences have been updated.
- CodeMirror by default sets the cursor to the beginning or end of a whole line (with line wrapping). You can now change that behaviour, so that the `Home` and `End` buttons bring you to the beginning and end of the _visible_ lines, not the logical lines.
- The image path of pictures pasted from clipboard will now always be relative.
- You can now drag & drop attachments onto the editor.
- The full path to an attachment will now be shown on mouse over.
- You can now turn off the dialog asking you to load remote changes into the editor by checking the corresponding checkbox in the preferences or in the dialog.
- The file list now shows the full filename after a 1 second delay if you keep your mouse over the name of a file.

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
- On rare occasions, Gettlr instances run on Windows can enter a zombie state where the main process is still running albeit the main window has been closed. Trying to run Gettlr anew will fail with an error due to the (now non-existing) window being accessed during the `on-second-instance` event. This fix makes sure a window will be opened in any case if there is none prior to restoring Gettlr.
- Fixed the placement of the popups, so they should now be visible.
- Fixed the context menu on files that have visible tags.
- Fixed wrong citation suggestions after a change of the library file.
- Fixed a bug causing the attachment extensions to be checked case-sensitive, instead of case-insensitive.
- Fixed the search not saving the strings you were searching for after re-showing the popup.

## Under the Hood

- Re-throw errors during command run in Gettlr main class.
- Moved the dictionary to its own dedicated provider for more versatility and improved upon its functionality.
- Created an appearance provider which takes care of switching the Gettlr theming based upon user choices.
- Switched from the `build`-property `electron-build` toolchain to the API.
- Switched to `Electron 5.0.0`.
- Some CSS cleanup, again.
- Changed the way popups are closed from an invisible barrier div to a simple click detection handler.
- Added Table and Strikethrough support to the copy & paste operations.
- Moved the Table-of-Contents-popup to the GettlrBody class.
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
- Switched to the Gettlr API for update checks to avoid hitting the GitHub rate limits.

# 1.2.1

## GUI and Functionality

- Removed the Quicklook overlay windows. Quicklooks now directly become standalone windows.
- General improvements to the default PDF template.
- On Windows and macOS, Gettlr now also fills up the recent document list in the Taskbar/Dock.
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
- Fixed an error that prevented Gettlr from being able to automatically import language files.
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

- **New Feature**: Gettlr can now import and export both `textbundle` and `textpack` files. Refer to [textbundle.org](http://textbundle.org/) for more information.
- Removed the Speech submenu from Windows and Linux, as it is only used on macOS.
- **Attention**: The recent documents submenu is now to be found in the `File` menu! It resides no longer in the toolbar.
- Added an "Inspect Element" context menu item if the debug mode is enabled.
- The context menu doesn't show up on directory items in the file list anymore, which it wasn't supposed to anyway.
- Fixes in the math rendering. Now the app will correctly render all equations, be they inline or multiline.
- Added a flag to let the app know if you want to receive beta release notifications. If you tick the checkbox, Gettlr will also present you with beta releases, so that you can stay up to date.
- When importing files, the "All Files" filter is now at the top and should be selected by default.
- Fixed a small bug that would render exporting of standalone files impossible.
- Rendered Markdown links now retain the outer formatting (e.g., if you wrapped the whole link inside bold or emphasis).
- The Gettlr default `tex`-template now doesn't break checkbox exports by including the `amsmath` and `amssymb`-packages.
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
- Fixed a small bug that would throw errors on Windows and Linux if you would open a file in Gettlr by double-clicking it in the file browser while Gettlr was already running.
- Links are now correctly detected by the preview algorithm.
- Fixed a bug that would make it impossible to export Markdown files with strikethrough text using the Gettlr default template.

## Under the Hood

- Fixed a small logical error in the menu buildup process.
- The context menu in the `GettlrBody` class is now always instantiated anew.
- Rewrote the logic of detecting and rendering mathematical equations.
- Updated the `KaTeX.css` stylesheet to the newest version and removed some errors (thanks to @Wieke for doing this).
- Rewrote the complete command structure of the app and branched it out into standalone files. Thereby the system becomes extremely modular and new commands can be written with ease. Additionally, it becomes possible to create shortcuts for certain commands.
- Fixed a small possibility of running into an error while performing a global search.
- Exchanged the variables for usage in `TeX`-templates with Pandoc-Style $-variables. Additionally, now all occurrences will be replaced with the correct value.
- Moved the JavaScript bits out of the Handlebars templates and added them to the Dialog handler classes.
- Code cleanup.
- Removed the complete KaTeX dist files from the Gettlr source and switched to using the shipped files provided by the KaTeX module, reducing the binary sizes, maintenance effort and code clutter at once.
- The Custom CSS is now a service provider.
- The configuration is now a service provider.
- The tags handler class is now a service provider.
- Removed the superfluous `getLocale`-functions from `GettlrBody` and `GettlrRenderer`.
- Pulled in the URL regular expression from the GFM CodeMirror mode so that the pre-rendered links by the command are the same as those detected by the GFM mode.
- Added the `ulem`-package to enable export of strikethrough and underline text.

# 1.1.0

## GUI and Functionality

- **Attention!** Installing this update will reset the application language to the detected system locale and reset all spellcheck choices (i.e. you will have to re-select the dictionaries using the preferences window). The reason for this is that Gettlr is now compliant with the regulations for language codes as laid out in the Best Current Practices No. 47 ([BCP 47](https://tools.ietf.org/html/bcp47)). To achieve this, all mechanisms of finding and loading translation files and dictionary files had to be modified.
- **New Feature: Paste Images**. From now on it is possible to copy images directly to the clipboard, then press `Cmd/Ctrl+V` in the editor and Gettlr will ask how to proceed. By pressing `Return` the default action will be taken: The image will be saved into the currently selected directory using either the original filename or a simple hash (for instance if you took a screenshot and there's no associated URL available), and it will be inserted at the current cursor position as a standard Markdown image tag, using the filename as title. If you don't press `Return` directly, you can adapt some options, such as the file size and the filename, and also choose a custom directory alternatively.
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
- You can now easily search for a file to link with the newly implemented autocompletion list that will pop up if you begin writing an internal link (i.e. type `[[`). After accepting an autocomplete suggestion, Gettlr will either put the ID between the brackets, or the filename, if there is no ID.
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
- The `GettlrDictionary`-class is now an `EventEmitter` and emits `update`-events whenever the composition of the loaded dictionaries changes.
- Renamed the default theme to its correct name: **Berlin**.
- Small changes to enable on-the-fly theme CSS replacement.
- Better escaping of some feedback strings in the preferences template.
- **The app is now BCP 47 compatible. This means that it should be possible to load every translation file and every dictionary folder using the correct language tag, instead of having to fall back to the crude xx_XX-type Gettlr used until now.**
- Moved the editor-specific `getWordCount` function out as a helper function.
- Added an `updateFile` method to the `global.ipc` to enable files to update themselves silently if something changed.
- Moved the calculating functionality of the `GettlrStatsView` class to the main process's `GettlrStats` class.
- Removed the `GettlrStatsView` class and moved the triggering functionality to the `GettlrBody` class accordingly with the other popups/dialogs.
- Branched out the `GettlrDialog` class so that all functionality is now provided by specialised dialog classes that inherit from the base class.
- Rearranged the options within the "Advanced" tab in the preferences dialog.
- Moved out all CodeMirror `require()` to a new file called `autoload.js` in the assets directory to save space in the main `GettlrEditor` class.
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
- Removed the customised word processor templates. Gettlr now uses the default reference docs provided by Pandoc.
- Projects can now also be exported to odt, docx, and HTML.
- Added tag autocomplete. Now when you start typing a `#`-character, you are presented with a list of tags you already use inside your files, so you don't use similar (but not same) tags in different files.
- Added `citeproc-js` integration: Now you can point Gettlr to a JSON CSL-file (ideally generated by Zotero) and it will automatically enable you to put `@BibTex-ID`s or even complex Pandoc citations in your text, which will not only be automatically replaced by a correct citation (only Chicago supported, because it is only a preview), but also renders a preview bibliography! Additionally, if you point Gettlr to a CSL Style file in the settings of a project, it will use this file to generate your citations!
- Added an option to change the `sansfont` property of `LaTeX`-documents, used mainly for headings.
- The Pomodoro timer now remembers your settings on a per-session basis.
- Added an additional check to see whether or not a huge number of words has been pasted into the editor. If so, the word counter won't count these towards the overall counter. So if you need to paste in whole documents, this won't raise your word counter absurdly high.
- Fixed a bug that rendered unwanted Math previews.
- Added file-open buttons. Now, whenever you are required to select a normal file, Gettlr provides you with a button that lets you choose the file comfortably.
- Gettlr now features an additional "Display" preferences tab, which lets you control all things that define Gettlr's appearance.
- You can now constrain the maximum size of images in the editor, separated by maximum width and maximum height.
- Updated the about dialog to now feature a tabbed interface containing main projects with licenses for the four big projects Gettlr use (Electron, Node.js, CodeMirror, and CitationStyleLanguage), all complementary projects, and the license of Gettlr itself.
- Now only escaping characters are formatted, not the characters following them.
- Fixed a bug that would prevent you from being able to modify an already loaded image without restarting Gettlr, because it would cache the image and not reload the modified version of it.
- Updated the styling of form elements: Now ranges and radio buttons are also displayed in the Gettlr design.
- Added an option to set a custom TeX template for PDF exports both in the general PDF preferences as well as on a per-project setting.
- Restored the functionality to quickly navigate the files in the preview container using the arrow keys `Up` and `Down`. Also you can once again jump to the end of the list by pressing an arrow key while holding `Cmd/Ctrl`.
- Gettlr now sorts your files based on a natural sorting order. You can restore the ASCII-sorting (the sorting as it has been until now) in the settings.
- Tags can now be escaped with a backslash (`\`) to make sure they won't show up in the tag dropdown list and also won't render as tags.
- Keyboard navigation is much more reliable.
- Fixed creation of new files while writing in the editor with no file open.
- The search functionality in both editor and Quicklook windows has been enhanced. It is now faster and you have to explicitly request a regular expression search by typing it literally. This means: Searching for `/\w/` will select all words inside the editor, while `\w` will literally search for that string.
- Gettlr now supports internal links. If you place a pandoc-compatible identifier inside a markdown link, it will try to jump to the respective line. E.g., the identifier `#tangos-photography-and-film` will match the heading `# Tangos, Photography, and Film`. Simply use a standard Markdown link: `[Go to Tangos, Photography, and Film](#tangos-photography-and-film)`.
- Gettlr keeps some margin between the cursor where you are writing and the window edges, i.e. it won't touch the window edges anymore, but keep a nice distance.
- Quicklook windows can now be "popped out" so that they are no longer bound to the main window but can be dragged onto different displays, etc.
- Windows and Linux windows now follow macOS in having no native window frame, but instead they employ the same strategy as macOS: The toolbar is the top element inside the main window of Gettlr, featuring window controls and, additionally, a button to open the application menu from the toolbar.
- Gettlr correctly selects words containing apostrophs so that you can correct them adequately without the app "forgetting" the l' or 'll-part (or similar) of the word.
- There's now an option to copy a file's ID to clipboard, if the file has one.
- We've updated the Gettlr icon! It now matches the brand colour and has a modern look.
- The image size constrainers look nicer and more intuitive now.
- Added controls to determine which elements are rendered inside Markdown documents.
- Simplified the attachment file handling and enabled dragging the paths of the files into the editor (e.g., to insert images).
- Now the ID- and tag-search is case-insensitive.
- Changes to the ID generation: Now if you press `Cmd/Ctrl+L`, the generated ID will be pasted wherever your cursor is currently (e.g. inside all text fields). Gettlr tries to back up your clipboard's contents and restore them afterwards.
- Gettlr recognises IDs inside the name of a file. **If the ID pattern returns a match in the file name, this ID takes precedence over any ID that may be in the file's content!**
- Added context menu entry to open link in the browser.
- Images can now be dragged from the attachment pane onto the editor and will automatically be converted into valid Markdown links.
- The tooltip that displays footnote texts when you hover over footnote references now displays formatted text, and not raw Markdown.
- The zoom level of the editor's text is not lost on toggling the distraction-free mode anymore.
- Update to the citeproc search. If you type an `@` and begin searching for a work to cite, you can now also search through the title and don't necessarily have to know the ID anymore!
- Added basic tag cloud functionality. You have now a new button in your toolbar that shows you all the tags that you've used somewhere in your files. You can also copy the full list into the clipboard!
- Updates to the search functionality: Now the AND operator works as a requirement again (until now files have also reported search results if one or two of the search terms have matched, even if they were all required). Additionally, the tag search within files now accounts for a hashtag in front of the search term.

## Under the hood

- Documentation update in `GettlrValidation`.
- Updated the `.dmg`-installer file with a better background image.
- Consolidated the `package.json` build fields.
- **Warning: The app ID has changed from `com.Gettlr.www` to `com.Gettlr.app`.** [For the implications please check this link](https://www.electron.build/configuration/nsis#guid-vs-application-name) -- the change only affects Windows users.
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
- `GettlrFile` objects won't forcefully try to move a file to trash while handling watchdog events anymore.
- `GettlrRendererIPC` and `GettlrIPC` now access the `ipc`-modules consistent with all other classes.
- Generalised the `askFile()` function in `GettlrWindow` for further purposes.
- The `GettlrConfig` now acts as an event emitter and emits `update`-events, whenever the configuration object changes. It can be subscribed to using `global.config.on` (to unsubscribe use `global.config.off`).
- Added a `global.ipc.notify`-function to easily send notifications to the renderer.
- Added a "cachebreaker" to the preview images in Gettlr.
- Moved a lot of files around: The CSS, Fonts, JavaScript and the template files are now in the `common` directory, so that it makes sense that there can be multiple windows that share those files.
- **ATTENTION: We've stopped committing the compiled Handlebars templates and CSS files to the repository, so even if you don't develop styles or templates, you now need to run `yarn/npm less` and `yarn/npm handlebars` before you run the application!**
- Removed a bunch of superfluous pass-through functions from the `GettlrRenderer` class.
- Bugfixes in the `GettlrExport` class.
- Switched to documentation.js for generating the API documentation.

# 0.20.0

## GUI and functionality

- Fixed a bug during import that resulted in crashing the app if no Pandoc was found.
- Updated the styling of the app to make it feel more modern.
- To open a file directly by typing its name into the search bar you don't have to get the capitalisation correct anymore.
- It is now possible to traverse the file tree directly by clicking on the directories inside the preview pane. Use a single click to make that directory your current one, or use an `Alt`-click to traverse back up to its parent directory.
- Now the "Save changes before quitting?"-Dialog won't appear — all your files will be saved immediately before quitting.
- Gettlr now remembers your last opened file and the last selected directory and restores them on each restart (if they still exist).
- Images can now also have pandoc attributes assigned (in curly brackets after the image tag) and will both render correctly inside Gettlr and work as intended on export.
- The app will now remember its size and position on screen and restore it after a restart.
- Changes to the design of the dark mode. It's now a little bit blue-ish and the colours are finally adapted to the brand.
- The directory list is now way less cluttered and looks way better than before.
- Dropping images onto the app is now possible!
- Added the long-commented-out blockquote command to the context menu.
- iframes will now be rendered as well (such as the embed codes by YouTube or Vimeo). Note that only `<iframe>`-tags will be rendered, so Twitter embed won't work, for example.
- Removed a small bug that would use the text selection cursor over directories after you've dragged a file.
- Gettlr now remembers the last directories you were in when you successfully imported a file or opened a directory.
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
- On smaller displays, Gettlr now has smaller margins and paddings so that each display size's space is used best.
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

- Implemented the try/catch construct around `GettlrImport` to actually catch the errors that were thrown by this function.
- Added globally accessible config getters and setters so that the `GettlrConfig`-object is now reachable from within all classes in the app.
- Changes to `GettlrWindow` to create windows using programmatical boundaries.
- Updated the image finding regex again.
- Reorganised the font families in the less resources.
- The popup is now much simpler to call.
- Removed instantiation from both GettlrImport and GettlrExport.
- All Gettlr installations now receive a unique UUID.
- Using `global.config.get` it is now possible in the renderer to access the configuration programmatically without the need to send events.
- Replaced all renderer configuration requests with the new, faster and synchronous method.
- Fixed a missing dependency in `GettlrAttachment`.
- Updated to `electron` 3.
- Changed `app.makeSingleInstance` to `app.requestSingleInstanceLock` as recommended by the docs.
- Updated dependencies to the newest versions.
- Image preview rendering is now independent of `path`.
- Refactored the complete configuration setting process.
- Explicitly set `defaultId` on confirmation dialogs.
- `detach()` is now called only after the move operation of a `GettlrDir` has been completed to remove the `parent`-pointer.

# 0.19.0

## GUI and functionality

- **Import functionality**: Now you can import from nearly all file types pandoc supports into Gettlr. Simply select the desired target directory and select File -> Import files!
- Added a lot of **exporting** options. More are still to come!
- **Export Markdown files as reveal.js presentations**: From 0.19.0 on, Gettlr will support the export of reveal.js-presentations. Also, there's theme support built in!
- If you insert a footnote, the cursor is not moved throughout the document so that the writing flow is more immersive.
- The text field used to edit a footnote reference text is now automatically focused.
- The editor will now directly mute lines when in full screen as soon as you change the preference setting for this. You don't have to move the cursor anymore for this.
- Fixed a bug that showed a dedicated _file_ menu when right-clicking directory ribbons and then threw errors if you clicked on anything in the menu.
- Fixed the strange behaviour of Gettlr telling you there are no suggestions for a word, although you did not right-click a wrongly spelled word.
- Inline links rendered inside headers are now always the correct size.
- Email-addresses are now correctly identified and will be rendered as clickable links as well. If you `Alt`-click on them, they will open the default email option (i.e. they are the same as clicking on any website's email addresses).
- Fixes to the project feature.
- Made the dictionaries finally independent from the four default translations.
- Added about 70 languages to the four default translations. This means: If you now include a custom dictionary or a custom translation, chances are high that it will be detected and translated automatically!
- Added a bunch of dictionaries that now come shipped with the app.
- Finally found & fixed the bug that kept detecting whole swathes of text as links and inserted them on link insert or didn't detect any link at all.
- Transferred the download page in the updater to the new download landing page at Gettlr.com/download.
- Clicking on marked tags in the preview list will now trigger a search for these tags.
- Added support for `TeX`-files. So in case you want to export something to PDF, you can add custom `LaTeX` statements in their respective file to amend the styling Gettlr applies.
- You can now rest assured that on export of projects with nested files all images, even relative ones, will successfully be rendered in your PDF output.
- Changes to the HTML exporting template. Now, images should always fit on screen.
- You can now create `LaTeX` files by using the extension `.tex` when creating new files.
- Better Pomodoro counter.

## Under the hood

- Changes to the `runCommand` method in `GettlrEditor`.
- Changes to the `insertFootnote` command.
- Changes to the `_editFootnote()` method in `GettlrEditor`.
- Changed the event type the editor is listening to when you finished editing a footnote from `keyup` to `keydown`.
- Moved the inline and block element rendering functions to their own commands to reduce the file size of `GettlrEditor`.
- Fixed the task recognition regex to prevent ugly errors logged to the console if you entered on an empty line a task list item directly followed by braces (such as `- [ ](some text)`).
- Additional security checks while building the context menu.
- Amended the regex for rendering links. Also provided a callback option for CodeMirror to be able to port the plugin fully externally and integrate it into other instances.
- Added `GettlrImport` class for handling file imports.
- Removed the unnecessary PDF exporting LaTeX template from the pandoc directory.
- Added another newline character when gluing Markdown files together on project exports.
- Fixed a bug that would not read in a saved project config on restart.
- Huge changes to the selection and retrieval of dictionaries for the spellchecking algorithm.
- Made the regular expression detecting links in the clipboard non-global and limited it to only detecting single links in the clipboard.
- The download page will now count all updates by users to keep track of how many users are using the app (only the click is counted, no personal information is collected). To avoid detection of you updating, simply visit Gettlr.com/download manually.
- Amended `GettlrRenderer` by a function to programmatically trigger global searches.
- Added `.tex` to the list of supported file types. Added a mode switch to `GettlrEditor`s `open()` method.
- Small fix to the toolbar CSS for not having a hover effect on the Pomodoro button in dark mode.
- Change to the `less.js` script. It now minimises the CSS output to further optimise the styling.
- Spell checking is now off by default in fresh installations to speed up the first start.
- Amendments to `GettlrProject`, `GettlrFile` and `GettlrExport` to ensure relative image paths are accurately converted into absolute ones on exporting them.
- Streamlined setting the `GettlrWindow` title. `Gettlrwindow::setTitle()` is now deprecated.

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
- Changes to the `_gen()` and `select()` methods in `GettlrPreview`.

# 0.18.2

## GUI and functionality

- Minor fix to the style of `code`-blocks in modals.
- Fixed a bug that prevented you from immediately re-selecting the previous file by simply clicking it again, after you opened an external markdown file in Gettlr, which then was selected automatically.
- Fixed an error thrown if a root file was removed remotely.
- Fixed Gettlr always asking to replace a file although it hasn't been modified remotely.
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
- Moved the `tippy()` function from the `GettlrRenderer` to the correct classes (`GettlrToolbar` and `GettlrPreview`).
- Changes to the link detection regex in `GettlrEditor`.
- Changes to the `export.tex` LaTeX export template. It now provides the `Shaded`-environment Pandoc requires on exporting files containing fenced code blocks.
- Added some amount of `HTML` syntax highlighting.
- Added a multiplex mode that can highlight fenced code blocks.
- Changed signature documentation of `GettlrRenderer`'s `setCurrentFile` method to reflect the actual process (it is being passed a hash, not a file object).
- Changes to the `_tags`-array in `GettlrPreview`. Now, the array is never completely regenerated, but resized according to the actual `_data`-array. The changes have affected the functionality of the functions `_gen()` and `refresh()` in this class.
- Added a `remove()` method to `Gettlr` for root files wanting to delete themselves.

# 0.18.1

## GUI and functionality

- Now it's possible to download and install custom translations for Gettlr! If you want to use a translation that is not (yet) officially bundled with the app, simply import the translation JSON-file into Gettlr using the respective option. It will immediately be available for selection within your preferences (but a restart to apply the change is still necessary). The language file must be in the format `aaa_AAA.json` so that the app can detect the language by looking at the file name.
- Numbers are now localised with the correct delimiters.
- Gettlr now automatically indents text using four spaces to better work with other Markdown parsers.
- Changed resizing constraints: Editor can now have 90 percent width at maximum.
- Fixed a small bug that lets you open non-markdown files as roots.
- You can now copy selected Markdown text as HTML! Just press `Cmd/Ctrl+Alt+C` instead of `Cmd/Ctrl+C`.
- Added an online-check. From now on, if you are offline, Gettlr won't show you ugly error messages, but a simple notification that you are, in fact, offline and Gettlr can't check for updates.
- Improved footnote placement.
- Improved the placement of images in exported PDF files.
- Increased search speed and fixed internal errors in displaying search results.

## Under the hood

- Changes to `getSupportedLangs()`: The function now returns a dynamically generated array of all available translations. This also includes language files that are placed inside the app's data directory (in the subdirectory `lang`).
- Changes to `i18n.js` to reflect the fact that a language could also be located inside the application data directory (it now first tries to load the file from within the app, and if this fails searches for the file in the app data directory).
- Gettlr now preserves the linefeeds of a file on saving.
- Refactored the app's LESS and style handling.
- Simplified the theme toggling.
- Consolidated CSS styles.
- Updated dependencies. Switched to Electron `2.0.6`.
- Removed `package-lock.json`, because nobody uses them anyway and yarn `1.9.2` just complained about them.
- Changed resizing constraints: Editor can now have 90 percent width at maximum.
- Fixed a logical error in `GettlrConfig` that allowed non-markdown-files to be opened as root files.
- Buffered the update check with an online-check. Renamed the original `check()` to `_fetchReleases()`.
- Fixes to the footnote placement.
- Removed an unused function from `GettlrEditor`.
- Removed excess `console.log` from `GettlrBody`.
- Added an additional security check before marking results in the editor instance.

# 0.18.0

## GUI and functionality

- Added the project feature: Now you can convert directories into "projects" (via context menu). A project is simply the possibility for you to adjust PDF options for a set of files differently than in your general PDF settings and tweak the generation a little bit more. It is thought especially for exporting many files into a single PDF file, and has options to generate a table of contents or a title page. _All files in the project directory and all of its sub-directories are concatenated in the same way as the preview list does it. Directories themselves are ignored. Then all these files are simply glued together and exported using the special settings you've given the project._
- Included tag preferences. These allow you to assign colours to specific tags, so that you can see in the preview list directly which files contain specific tags (such as, e.g., `#todo` or `#in-progress`) to have an overview over the work you need to do or categorise your files.
- Now the editor should correctly resize itself if the window itself changes its size.
- Now, if you use the combined view, Gettlr recognises a second click on an already selected directory and switches to the preview list instead. If you do so while the expanded mode is active, nothing will happen.
- I finally found the bug that was showing `NaN` instead of real numbers in the stats view. Now it should work on all systems just fine. (It only happened when there were less than thirty days of recorded statistical history available.)
- Adjusted the placement of the dialogs. Now they should definitely be placed in the center, if they are smaller than the window and should never result in a scrollable window.
- The dialog windows should pop up much faster now.
- Changed the styles of all dialog windows, and made pretty especially the PDF preferences windows.
- Replaced the system default's title popups with nicer looking popups.
- Changed image preview rendering. Now, images smaller than the viewport will not scale up to fill the full width, but remain smaller than the viewport width.
- Added a preview rendering of task items with checkboxes.
- Now Gettlr will directly react to you clicking with your mouse into the window and doesn't require you to click a second time after the app has been focused again.
- Snippets are now off by default.
- Fixed a small error that led to the editor behaving strange after resizing the sidebar.
- There is now no lag anymore on saving files. As a side effect, the global search is not exited when you change a little bit and then save the file.
- Changed PDF export.
- Small fix to the ZKN tag detection.
- Added additional error handling in the updater (so you know _why_ Gettlr couldn't tell you why no update check is possible).
- Renaming files is now faster.
- If you now begin to drag a file, after you have stopped dragging the file (i.e. either you dropped it onto a directory or you dropped it somewhere else to cancel the move), the preview pane will be shown again.
- Now it is possible to drag out Markdown files from Gettlr into other apps.
- Clicking on the "No open files or folders"-notification when there are no open folders or files in the directory tree will automatically show the open-dialog.
- Fixed the theming in the QuickLook windows. Now they will be the same theme as the app itself.

## Under the hood

- Finally renamed the `strong` element in the file tiles in the preview list to a simple `p` to re-gain semantic correctness there.
- Lots of LESS-code added, several other files have been changed.
- Added an event listener to Window resizes to change the editor's width accordingly with the `resizable` activated.
- Changes to `requestDir()` function in `GettlrRenderer`.
- Changes to the Statistics viewer.
- Changes to `GettlrDialog`.
- Changes to `GettlrRenderer`. Now the translation strings will be copied into the memory of the renderer process directly. This results in better overall performance, especially in dialogs, for which a lot of such strings are needed.
- Updated development dependencies: `electron` is now `2.0.4`, `electron-builder` is now `20.19.2` and `less.js` is now `3.5.3`.
- Changes to `GettlrBody`-proceed function.
- Added `tippy.js` to the list of dependencies; replaced standard system titles with Tippy titles.
- Added the `acceptFirstMouse` option to the creation of new `BrowserWindow`s.
- Now refreshing the editor instance after dragstop of the divider between combiner and the editor.
- Removed an unnecessary if-statement in `GettlrToolbar`.
- Added a method to only update the current file in the renderer process, which speeds up saving *a lot*.
- Additional check in `GettlrVirtualDirectory`.
- Changes to the `LaTeX` export template.
- Replaced the complicated and unreliable tag recognition to a much simpler regular expression.
- Error handling in `GettlrUpdater`.
- Changes to the process of renaming files. Now the renaming process should be reflected quicker in the renderer, because we don't send a complete new path object, but only the specific, renamed file.
- Fixes and changes to the dragging behaviour in the renderer.
- Added a dragging event, so that the main process automatically enables dragging out of the app.
- Added the `getRenderer()`-function to `GettlrDirectories`, so that the `EmptyPaths`-object can send the respective event to the main process.
- Combined the `setContent()` and `save()`-functions in `GettlrFile`, because there was simply no need to have them separated. Also, removed the `modified`-flag from the file.

# 0.17.1

## GUI and functionality

- **Combined preview and directory pane**. Now only one of both is visible, never both, but also never none. Pressing `Cmd/Ctrl+1` and `Cmd/Ctrl+2` will still toggle visibility of both preview and directory pane, but not in parallel anymore. So hiding the preview pane will automatically show the directory pane and vice versa. Also, if you are on the preview pane, moving with your mouse to the top of the pane will show an arrow that lets you enter the directory pane again. Gettlr will automatically switch to the preview pane in a number of cases: Selection of a directory, searches, and renaming of files.
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
- Added another check for popup height in `GettlrPopup` to ensure popups can be displayed on screen and don't end up being cut off by the window.

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
- Replaced the ugly find-in-file dialog with a Gettlr-style popup and added a replace-function as well. Simply press `Return` while inside the replacement-field to replace the next occurrence of your search term, or press `ALT`+`Return`, to replace *all* occurrences at once. **The search is case-insensitive**.
- Introducing a **distraction free mode**, which can be toggled by pressing `Cmd/Ctrl+J`. This makes the editor fullscreen and mutes all lines except the one in which you are currently working.
- Added option to recall up to ten recently used documents.
- Hashtags are now not rendered, when they are not preceded by a space or are at the start of a line. This prevents links with anchor-names being displayed wrongly.
- Added a shortcut for inserting footnotes: `Ctrl+Alt+F` (Windows+Linux) or `Cmd+Alt+R` (macOS).

## Under the hood

- Moved all exporting functionality to a separate class, `GettlrExport`.
- Removed unnecessary CodeMirror plugins.
- Removed unnecessary styles and some unnecessary (b/c unused) functionality.

# 0.16.0

## GUI and functionality

- Introducing **Virtual Directories**. Now it is possible to add "ghost" directories to your directories that act as a subset of these directories. They are not actually present on disk (but are persistent with a so-called dot-file named `.ztr-virtual-directory`) and therefore can be used to create collections of files by manually adding files to them. _You can only add files to these virtual directories that are present in the containing directory. Also, you cannot move them because they are bound to their parent directories._
- Fixed a bug that threw an error every time you tried to delete a directory with no file open currently.
- Fixes to the inline commands. Now, when you press `Cmd/Ctrl+I` or `Cmd/Ctrl+B` a second time after you finished writing your strong/emphasised text, Gettlr will actually "exit" the bold/italic markings and not try to insert them a second time. (_Note that it will still insert the end-markings if the characters directly after the current cursor position are not the end-markings_).
- Fixed a bug that threw errors if you were to rename a non-opened file.
- Fixed a bug that threw errors if you were to rename a directory, while none was selected.
- Prevent arbitrary selection in the app to make it feel even more native.
- Huge performance boost on selecting directories and files.
- Translated remotely triggered file- and directory-events.
- Finally fixed the bug that the end-search button disappeared and the input field went in disarray when the window size was too small.
- Re-introduced feature that Gettlr asks the user to replace the current editor content, if the current file has been changed remotely.
- Now, if the current file is removed remotely, Gettlr automatically closes the file in the editor as well.
- On updates, the download URL to GitHub now opens on the system's browser.

## Under the hood

- Removed an excess `console.log`.
- Implemented `indentlist` plugin directly in Gettlr core.
- Continued work on virtual directories.
- Small changes to `Gettlr` and `GettlrDir` classes.
- Small changes to the markdown shortcut plugin.
- Fixed a small error in `Gettlr` class.
- Removed a huge bottleneck in the directory selection logic (now the Gettlr main process will not send the complete `GettlrDir`-object to the renderer, but just the hash, because the renderer has a full copy of the objects in memory).
- Removed the same, big bottleneck in the file selection logic.
- Updated all dependencies to their latest version. Thereby we've switched to Electron 2.0.3.

# 0.15.5

## GUI and functionality

- Additions to the search functionality. If you begin typing in the global search field, Gettlr will autocomplete your typings with exact name matches. This way you can directly open respective files from your searchbar by simply confirming the file to be opened with the `RETURN`-key.
- Gettlr will now automatically try to force open a file when you commence a global search, if there is a file containing the typed name somewhere in the system.
- If you click a link without the `ALT`-key now, the cursor will be automatically placed and you can edit the link exactly where you clicked without having to click the position twice.
- Fixes to the attachment pane — now opening a directory will always work.
- Now the vertical scrollbar in the editor uses the default cursor, not the text cursor.
- Fixes to the generation and placement of popups. Now a bigger margin to the edges of the window is ensured, and the popups are now a little bit wider to reduce the possibilities of ugly line-breaks.
- Small fix to the color of directory ribbons in dark mode.
- The attachment pane now refreshes on new attachments without the need to switch to another directory and then switch back. Also, after every watchdog run the renderer receives a new list of objects now in memory.

## Under the hood

- Small changes to the `_renderLinks()`-function in `GettlrEditor`.
- Calling `_act()` in `GettlrAttachments` even if there are no attachments to be able to still open the directory in these cases.
- Changes to `_place()` in `GettlrPopup`.
- Changes to the `GettlrToolbar` and `GettlrRenderer` classes.
- Design-fixes.
- Removed an unnecessary check for the now non-existent `projectDir` option in the configuration constructor.
- Added a security check for additional `PATH`-variables in `GettlrConfig`.
- Additional security-check in `GettlrConfig`s `set()`-function to only add valid options. Now `set()` will return either `true` or `false` depending on whether the option was successfully set.
- Removed deprecated code from `GettlrWindow` class.
- Added a security check in `GettlrWindow`s `prompt()` function.
- Removed some unnecessary code from `GettlrDir` class.
- Small changes to `GettlrDir` constructor.
- Began first work on `GettlrFilter` and `GettlrVirtualDirectory`.
- Changes to `Gettlr` and `GettlrRenderer` classes.

# 0.15.4

## GUI and functionality

- Gettlr saves a file prior to exporting to make sure you export what you see (WYSIWYE).
- Now Gettlr is more performant especially in documents containing a lot of links. Also, clicking a link _without_ the `ALT`-key pressed will now remove the link and make it editable, as intended.
- Design fix: Now the sorters in the preview pane don't alter the size of the directory field.
- Design change for Windows users: Now Gettlr on Windows uses the system's default font "Segoe UI", because as of strange font-smoothing effects, Lato is barely readable on Windows machines.
- Fixed a logical error in the script, so now Gettlr will remember where you were in a document and restore that view on every opening of a file (not persistent, i.e. if you close and re-open Gettlr itself, the positions will be reset).

## Under the hood

- Added `export` to the `CLOSING_COMMANDS`.
- Updates in `package.json`, updated dependencies.
- Fixed a wrongly placed `continue` in `_renderLinks()` in the `GettlrEditor` class.
- Moved the saving of scrolling info from the `open()` function to the `close()` function in `GettlrEditor`.

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
- Removed the save-button from the toolbar and now Gettlr will not show you an indicator whether or not there are unsaved changes, because normally everything should be saved. In case changes are *not* saved under strange circumstances, Gettlr will still prompt you to save them if they would be lost.
- Fixed a small error that led Gettlr to believe that it doesn't need to reorder the opened root files and directories, although it should have, thereby having newly opened files pop up not at the top of the directories' list but at random positions somewhere in the directories.

## Under the hood

- Switched Preview-list rendering to `Clusterize.js` to keep huge lists renderable and reduce loading times.
- Removed the now unnecessary `ListView` and `ListViewItem` classes.
- Removed the unnecessary `file-revert` command handler in `GettlrIPC`.
- Removed a `console.log` in `GettlrPreview`.
- Added a `isModified()` function in `GettlrRenderer`.
- Changes to `GettlrRendererIPC` to accomodate graceful saving procedure.
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
- Removed the unnecessary `_sort()`-function in the `GettlrDirectories`-class.

# 0.15.0

## GUI and functionality

- Fixed the button text color in popups.
- More shadow under the popups (makes them stick out more in the white mode).
- Now it is possible to open Markdown files directly with Gettlr by double clicking them or dragging them onto the app. Dropping also works for directories (#3).
- Gettlr now tells the Operating System that it is capable of handling `.md`- and `.markdown` files.
- Small fixes to the translations.
- Added an about dialog.
- Now Gettlr also converts "standalone" links (e.g. simple detected URLs without Markdown formatting around them) into clickable links. **Attention: Clicking now works with ALT instead of Shift!**
- Added a small popup to view some stats on your writing.
- Fixes to the word count (now also splits along line breaks).
- Moved all formattings to a small popup (indicated by the carriage return symbol). Also added other formatting possibilities, such as code, headings and blockquotes.
- Fixes to the formatting commands.
- Added an attachment pane (#6).
- Added an option to sort directories chronologically or according to name (#4).
- Begun adding zkn-functionality to Gettlr:
  - Now it is possible to use `@ID:<your-ID>` to give an ID to a file (generate one using the Toolbar Button or by pressing `Cmd/Ctrl+L`). If multiple IDs are defined in such a way, the first found will take precedence.
  - You can now tag your files using the Twitter-like syntax: `#hashtag`. Alt-Clicking on them will trigger a search for the tag.
  - You can now link searches in your files. If you type `[[search terms]]` this will trigger a directory-wide search for the search terms. If the link contains an ID in the format `[[@ID:<your-ID>]]`, Gettlr will try to get an exact match. If there is a file using that ID, it will be immediately opened. Also, a directory-wide search for all files referencing this ID will be conducted.

## Under the hood

- Fixed a small bug in the `GettlrWatchdog` that prevented remotely added directories from being detected by the app.
- Given the classes `GettlrFile` and `GettlrDir` more authority over what happens with them. Now they're handling all events by themselves.
- Made the paths mandatory on creation of new `GettlrFile` and `GettlrDir` instances.
- Added `isFile()` and `isDir()` helper functions to check if paths actually denote a valid file or directory.
- Added `openPaths` configuration option to hold all opened paths and re-open them on every start.
- Small fix to the loading mechanism of the configuration to allow flexible arrays (needed for the `openPaths` option).
- Found **A LOT** of unnecessary and duplicate code in the `Gettlr` main class and removed it.
- Handle open events in `main.js` and make Gettlr definitively a single app instance.

# 0.14.3

## GUI and functionality

- Fixed a bug that prevented deletion of files and folders.
- Removed the now defunct autosave option in preferences.

## Under the hood

- Fixed a type error in `GettlrWindow` that passed `undefined` instead of the window to the `showMessageBox` function.

# 0.14.2

## GUI and functionality

- Fixed input text color in popups (e.g., for new files and directories).
- Removed the autosave functionality. Now Gettlr automatically saves all changes "completely."

## Under the hood

- Updated `less.js` (dev-dependency) to latest version.
- Updated `chokidar` to latest version.
- Updated `electron-builder` (dev-dependency) to latest version.
- Removed all autosave-functions.
- `GettlrWatchdog` can now add multiple paths to watch
- `GettlrFile` can now also be root (e.g. have the `Gettlr`-object as parent)

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

- Now Gettlr can detect relative image paths (i.e. relative to the file in which they are referenced) and show these images successfully
- Fixed a bug that did not update the modification time of a file on save.
- Fixed the non-selection of the current file on directory selection
- Fixed a small bug that sometimes could throw an error when moving directories within the app
- Now a quicklook window can be brought to front by simply clicking its title
- Hid the textarea by default, so that on startup the editor field is clean
- Design improvements

## Under the hood

- Begun another code rewrite. This time, the focus is on two parts: First, prevent any access of object properties from other objects than `this`. Instead, use public functions (also, prevent calling of private functions from the outside). Second: Try to, again, move out some functionality from the Gettlr main class to shorten it.
- Removed unnecessary function calls in the renderer.
- Also added support for the [yarn package manager](https://yarnpkg.com/)

# 0.13.0

## GUI and functionality

- Fixed a bug that could lead to errors and misbehaviour if a huge number of directories and files was added
- Added toolbar button descriptions. Simply hover over a button with your mouse to learn about its functionality
- Added an autosave feature. Now, Gettlr keeps automatic saves of your current file.
- Added a reversion feature. With the revert button you can restore the editor content to the last saved state.
- Added an automatic check for updates. It is run on every start of Gettlr and can be called programmatically by clicking Help -> Check for Updates
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
- Added class `GettlrUpdater` with barebone functionality.
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
- Small UI fix: Now Gettlr auto-closes the following pairs of characters: `() [] {} '' "" »« “” ‘’ ** __`.

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
- Now Gettlr shows default context menus for text fields
- Fixed an issue on opening new project directories that provided you with the current directory's path instead of the project directory
- Reversed direction of the changelog to display most recent changes at the top of the file.

## Under the hood

- Included jQuery and CodeMirror as npm packages for easier updating
- Added a `GettlrPopup`-class for easy displaying of small forms and info texts, this will replace most `GettlrDialog`-forms, because we don't need such a massive dialog box for a single text field (or something else)
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

- Fixed a small bug that did not remove the file list if the open directory was removed from the file system. Now, if the current directory is deleted, Gettlr will automatically select the parent directory.
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
- Fixed a bug that made it impossible to export to PDF on Windows when Gettlr was installed to the `Program Files`-directory
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
- Added a short check that Gettlr does not try to move a directory into a subdirectory.
- Multiple minor fixes and improvements
- Preview pane and directory tree view can now be hidden via `Cmd/Ctrl+1` and `Cmd/Ctrl+2`

# 0.6.0

- Now the file lists are automatically sorted on renaming files to immediately reflect a possibly changed order.
- The global search now also includes the name of the file
- Fixed a small error that prevented Gettlr from searching the first file in the preview pane
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
