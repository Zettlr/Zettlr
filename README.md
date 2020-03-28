<h1 align="center">
  <a href="https://github.com/Gettlr/Gettlr">
    <img src="https://raw.githubusercontent.com/Gettlr/Gettlr/master/resources/icons/png/256x256.png" alt="Gettlr"/>
  </a>
  <br/>
  Gettlr [_ˈset·lər_]
</h1>

<p align="center"><strong>A Markdown Editor for the 21<sup>st</sup> century</strong>.</p>

<p align="center">
  <a href="https://doi.org/10.5281/zenodo.2580173">
    <img src="https://zenodo.org/badge/DOI/10.5281/zenodo.2580173.svg" alt="DOI">
  </a>
  <a href="https://www.gnu.org/licenses/gpl-3.0">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License: GNU GPL v3">
  </a>
  <a href="https://www.Gettlr.com/download">
    <img alt="GitHub tag (latest by date)" src="https://img.shields.io/github/tag-date/Gettlr/Gettlr.svg?label=latest">
  </a>
  <img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/Gettlr/Gettlr/total.svg">
  <img alt="Test" src="https://github.com/Gettlr/Gettlr/workflows/Test/badge.svg?branch=master">
  <img alt="Build" src="https://github.com/Gettlr/Gettlr/workflows/Build/badge.svg">
</p>

<p align="center">
  <a href="https://www.Gettlr.com/" target="_blank">Homepage</a> |
  <a href="https://www.Gettlr.com/download">Download</a> |
  <a href="https://docs.Gettlr.com/" target="_blank">Documentation</a> |
  <a href="https://forum.Gettlr.com/" target="_blank">Discussion Forum</a> |
  <a href="#contributing">Contributing</a> |
  <a href="https://www.patreon.com/Gettlr" target="_blank">Support Us</a>
</p>

![screenshot](/resources/screenshots/Gettlr_view.png)

With Gettlr, writing professional texts is easy and motivating: Whether you are a college student, a researcher, a journalist, or an author — Gettlr has the right tools for you. [Watch the video](https://www.youtube.com/watch?v=BJ27r6YGpAs) or continue reading to see what they are!

[Visit the Website.](https://Gettlr.com/)

## Features

- Available in over a dozen languages
- Tight and ever-growing **integration with your favourite reference manager** (Zotero, JabRef)
- **Cite with Gettlr** using `citeproc` and your existing literature database
- Four **themes and dark mode support**
- File-agnostic writing: Enjoy **full control over your own files**
- Keep all your notes and texts **in one place** — searchable and accessible
- **Code highlighting** for many languages
- Simple and beautiful **exports** with [Pandoc](https://pandoc.org/), [LaTeX](https://www.latex-project.org/), and [Textbundle](http://textbundle.org/)
- Support for state of the art knowledge management techniques (**Zettelkasten**)
- A revolutionary **search algorithm** with integrated heatmap

… and the best is: **Gettlr is [Open Source (FOSS)](https://en.wikipedia.org/wiki/Free_and_open-source_software)!**

## Get Gettlr

To install Gettlr, just [download the latest release](https://www.Gettlr.com/download/) for your operating system! Currently supported are macOS, Windows, and most Linux distributions (via Debian- and Fedora-packages as well as AppImages).

Every other system _electron_ runs on is supported as well, if you build the app yourself.

**Please also consider [becoming a patron](https://www.patreon.com/Gettlr) or making a [one-time donation](https://paypal.me/hendrikerz)!**

## What next?

If you have downloaded Gettlr, [head over to our website](https://Gettlr.com/docs) to get to know Gettlr. Refer to the [Quick Start Guide](https://Gettlr.com/docs/quick-start), if you prefer to use software heads-on.

![The central window of Gettlr using the Night Theme](/resources/screenshots/Gettlr_view_dark.png)

## Contributing

Gettlr is an electron-based app, so to start developing, you'll need to have a [NodeJS](https://nodejs.org/)-stack on your computer installed. Make sure node and preferably [Yarn](https://yarnpkg.com/en/) are installed, which is the recommended package manager.

Then, simply clone the repository and install the dependencies on your local computer:

```bash
$ git clone https://github.com/Gettlr/Gettlr.git
$ cd Gettlr
$ yarn install # Or npm install
$ cd source
$ yarn install # Or npm install
```

_(Please note the second `yarn install`/`npm install` in the source directory. This is necessary to build the app locally.)_

There are four types of templates shipped with the app that need a rebuild once you change them: The stylesheets, which are written in [LESS](http://lesscss.org/), the HTML templates, written in [Handlebars.js](https://handlebarsjs.com/), and some components, written in [Vue.js](https://vuejs.org/). Additionally, the template for the [reveal.js](https://revealjs.com/)-presentations needs to be built prior to running the app. Whenever you make changes to any of these resources, you'll need to recompile them using an appropriate command:

```bash
$ yarn less # Or npm run less, this recompiles the stylesheets
$ yarn handlebars # Or npm run handlebars, this recompiles the templates
$ yarn wp:dev # Or npm run wp:dev, this recompiles the Vue components
$ yarn reveal:build # Or npm run reveal:build, needs to be run once
```

To dive deeper into the development process, have a look at our [full development documentation](https://docs.Gettlr.com/en/get-involved).

## License

This software is licensed via the GNU GPL v3-License.

The brand (including name, icons and everything Gettlr can be identified with) is exluded and all rights reserved. If you want to fork Gettlr to develop another app, feel free but please change name and icons.
