# Zettlr [_ˈset·lər_]
<a href="https://doi.org/10.5281/zenodo.2580173"><img src="https://zenodo.org/badge/DOI/10.5281/zenodo.2580173.svg" alt="DOI"></a> <a href="https://www.gnu.org/licenses/gpl-3.0"><img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License: GNU GPL v3"></a> <img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/Zettlr/Zettlr/total.svg"> <a href="https://www.zettlr.com/download"><img alt="GitHub tag (latest by date)" src="https://img.shields.io/github/tag-date/Zettlr/Zettlr.svg?label=latest"></a>

![The central window of Zettlr](/resources/screenshots/zettlr_view.png)

With Zettlr, writing professional texts is easy and motivating: Whether you are a college student, a researcher, a journalist, or an author — Zettlr has the right tools for you. [Watch the video](https://www.youtube.com/watch?v=BJ27r6YGpAs) or continue reading to see what they are!

[Visit the Website.](https://zettlr.com/)

## Features

- File-agnostic writing: Enjoy **full control over your own files**
- Keep all your notes and texts **in one place** — searchable and accessible
- **Night Mode** support
- **Cite with Zettlr** using `citeproc` and your existing literature database
- **Code highlighting** for most contemporary programming languages
- Simple and beautiful **exports** with [Pandoc](https://pandoc.org/), [LaTeX](https://www.latex-project.org/), and [Textbundle](http://textbundle.org/)
- Support for state of the art knowledge management techniques (**Zettelkasten**)
- A revolutionary **search algorithm** with integrated heatmap

… and the best is: **Zettlr is [Open Source](https://en.wikipedia.org/wiki/Free_and_open-source_software)!**

## Get Zettlr

To install Zettlr, just [download the latest release](https://www.zettlr.com/download/) for your operating system! Currently supported are macOS, Windows, and Debian- and Fedora-based Linux systems. (And every other system _electron_ runs on, if you build the app yourself).

**Please also consider a [donation](https://paypal.me/hendrikerz)!**

## What next?

If you have downloaded Zettlr, [head over to our website](https://zettlr.com/docs) to get to know Zettlr. Refer to the [Quick Start Guide](https://zettlr.com/docs/quick-start), if you prefer to use software heads-on.

![The central window of Zettlr using the Night Theme](/resources/screenshots/zettlr_view_dark.png)

## Developing

To start developing, simply `git clone` and `npm install` the app on your local computer:

`$ git clone https://github.com/Zettlr/Zettlr.git`\
`$ cd Zettlr`\
`$ yarn install`\
`$ cd source`\
`$ yarn install`

_(Please note the second `yarn install` in the source directory. This is necessary if you want to build the app locally.)_

If you use `npm`, this is also supported.

To explore the functionality and inner workings of the app, [head over to our development documentation!](http://dev.zettlr.com/api/)

**Before your first `yarn start`** and everytime you've made changes to either the `LESS`-files or the templates, you need to run:

`$ yarn less`\
`$ yarn handlebars`

to compile both the style sheets and the precompiled `handlebars.js` templates.

## License

This software is licenced via the GNU GPL v3-License.

The brand (including name, icons and everything Zettlr can be identified with) is exluded and all rights reserved. If you want to fork Zettlr to develop another app, feel free but please change name and icons.
