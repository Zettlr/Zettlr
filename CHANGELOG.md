# 0.1.0

- Initial Version w/ several code rewrites that are not documented here.

# 0.2.0

- Rewritten version with again several major code rewrites that have been done before this SVN began.

# 0.3.0

- The search dialog for the currently opened document now does not close on Enter but enables you to repeatedly press `Enter` instead of `Cmd/Ctrl-G` to `findNext`
- Added several shortcuts for comfortable editing: `Cmd/Ctrl-B` boldens a selected text (or inserts bold-markers at cursor position). Accordingly, `Cmd/Ctrl-I` emphasizes, `Cmd/Ctrl-K` converts the selection into a link and `Cmd/Ctrl-Shift-I` inserts an image.
- Added support for HTML, DOCX, ODT and PDF export using Pandoc and LaTeX

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

# 0.5.0

- Improved drag and drop of directories
- Moving files now works via drag'n'drop as well
- Fixed a bug that led to undefined errors while trying to rename directories
- Much cleaner arrow-key navigation through the preview pane — now failsafe.
- Now you can navigate to top or bottom in the preview list by holding Cmd or Ctrl while pressing the arrow key.
- Global search is now non-blocking and provides a progress indicator
- Now Shift-click on URLs opens these in external browser.
- Implemented preferences.

# 0.5.1

- Fixed a bug that disabled the creation of new directories and instead threw errors
- Fixed an error that was thrown by pandoc on each PDF export.

# 0.6.0

- Now the file lists are automatically sorted on renaming files to immediately reflect a possibly changed order.
- The global search now also includes the name of the file
- Fixed a small error that prevented Zettlr from searching the first file in the preview pane
- Fixed an error in the inter-process communication (IPC) that led to unexpected behavior when using Shortcuts.
- Fixed an error that prevented renaming of directories if a file was selected.
- And behind the scene: We've rewritten the whole code base and made it more efficient — that's why the version has switched to 0.6.0

# 0.7.0

- Included Spellchecking (en_US, en_GB, fr_FR, de_DE, more languages on request)
- Translated app into English, German and French.
- Introducing **Quicklook**: Right-click on any note and click "Quicklook" to open the file in a small overlay window. This enables you to keep open a file while simultaneously reading (and copying text) from different files.
- Fixed a minor error with the detection of clickable links
- Fixed an error that prevented searching for exact phrases
- Added a short check that Zettlr does not try to move a directory into a subdirectory.
- Multiple minor fixes and improvements
- Preview pane and directory tree view can now be hidden via `Cmd/Ctrl+1` and `Cmd/Ctrl+2`

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

# 0.8.1

**This is an emergency patch**. It fixes an error on Windows and Linux systems that disabled the complete main menu, making it unable to execute commands from the menu (e.g., opening a new root folder).

- Fixes a bug that rendered the whole application menu unusable
- Minor localization fixes

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

# 0.9.1

## GUI and functionality

- Fixed broken PDF export in 0.9.0
- Small improvement in the HTML export template. Now if you want to print out the HTML file, it should look way better than before.

## Under the hood

- Updated dependencies to electron 1.7.11 to react to exploit [CVE-2018-1000006](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2018-1000006). [See the electron project's blog for more information](https://electronjs.org/blog/protocol-handler-fix).

# 0.9.2

## GUI and functionality

- Changed paper format in the odt-template from "Letter" to "DIN A4."
- Now dialogs are correctly positioned (centered)
- Implemented notifications that can be used variously
- Watchdog now monitors changes to the file system
- Small fixes in functionality and translations

## Under the hood

- Added notification service (can be triggered by sending a `notify`-event to the renderer or call `notify()` on a body element.)

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

# 0.11.0

## GUI and functionality

- Introducing a **pomodoro** counter! Now you can simply click on the circle at the right end of the toolbar to start a pomodoro counter. It alternates task-phases of 25 Minutes with short breaks of five minutes and, after every fourth task-phase, a longer break of twenty minutes. It also notifies you when a phase is over with a small notification and a soft sound. Head over to [the official website](https://francescocirillo.com/pages/pomodoro-technique) to get to know what this technique is about.
- Switched to default Lato font on all platforms (included the font into the app itself)

## Under the hood

- Included jQuery and CodeMirror as npm packages for easier updating
- Added a `ZettlrPopup`-class for easy displaying of small forms and info texts, this will replace most `ZettlrDialog`-forms, because we don't need such a massive dialog box for a single text field (or something else)
