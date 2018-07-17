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
