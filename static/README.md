# Static Files

This directory contains static files which will be bundled with Zettlr. Most of
these directories will be updated automatically by CI-workflows that
periodically run on the repository, but there are a few where you can contribute
by improving the files!

Currently, the following files are contained:

## `csl-locales` and `csl-styles`

These directories will be updated periodically with the data from the official
CitationStyleLanguage repository. Please do not modify these in any way, but
make sure to periodically `git pull` changes introduced by the CI workflows.

## `defaults`

This directory contains defaults files that are shipped with Zettlr. These are
being passed to Pandoc whenever it runs to export or import a file and contain
default values for it to use. These must be updated manually, so feel free to
propose pull requests to improve these defaults or adapt them due to changes in
how Pandoc works with these.

## `dict`

This folder contains the Hunspell dictionaries that are by default shipped with
Zettlr. We do not ship every single dictionary to not make the resulting
application too large. Additional dictionaries can be installed by the user.
Some very common dictionaries are not contained in here, e.g. the Italian
dictionary, since the module Zettlr uses for spellchecking currently does not
work with these. So please abstain from attempting to add these as well.

## `lang`

This directory contains the available translation files. You may propose changes to the translations by opening a Pull Request; for more information see [the README](https://github.com/Zettlr/Zettlr#translating) or [the contributing guide](https://github.com/Zettlr/Zettlr/blob/develop/CONTRIBUTING.md#translation).

## `reveal-js-styles` and `template.revealjs.htm`

This directory and file contain the template for exporting files to reveal.JS.
These files will be periodically updated by a CI-workflow, so please do not
modify these files in a pull request.

## `tutorial`

This folder contains the tutorial files which will be copied into the user's
`documents` folder whenever Zettlr is installed for the first time. It contains
translations of these files within BCP-47 compatible subdirectories. Feel free
to amend these files and add new translations! This will help new users get used
to working with Zettlr.

## `export.tpl.htm`

This file is the default template being used for HTML exports.
