<h1 align="center">
  <a href="https://github.com/Zettlr/Zettlr">
    <img src="https://raw.githubusercontent.com/Zettlr/Zettlr/master/resources/icons/png/256x256.png" alt="Zettlr"/>
  </a>
  <br/>
  Zettlr [<em>ˈset·lər</em>]
</h1>

<p align="center"><strong>A Markdown Editor for the 21<sup>st</sup> century</strong>.</p>

<p align="center">
  <a href="https://doi.org/10.5281/zenodo.2580173">
    <img src="https://zenodo.org/badge/DOI/10.5281/zenodo.2580173.svg" alt="DOI">
  </a>
  <a href="https://www.gnu.org/licenses/gpl-3.0">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License: GNU GPL v3">
  </a>
  <a href="https://www.zettlr.com/download">
    <img alt="GitHub tag (latest by date)" src="https://img.shields.io/github/tag-date/Zettlr/Zettlr.svg?label=latest">
  </a>
  <img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/Zettlr/Zettlr/total.svg">
  <img alt="Test" src="https://github.com/Zettlr/Zettlr/workflows/Test/badge.svg?branch=master">
  <img alt="Build" src="https://github.com/Zettlr/Zettlr/workflows/Build/badge.svg">
</p>

<p align="center">
  <a href="https://www.zettlr.com/" target="_blank">Homepage</a> |
  <a href="https://www.zettlr.com/download">Download</a> |
  <a href="https://docs.zettlr.com/" target="_blank">Documentation</a> |
  <a href="https://forum.zettlr.com/" target="_blank">Discussion Forum</a> |
  <a href="#contributing">Contributing</a> |
  <a href="https://www.patreon.com/zettlr" target="_blank">Support Us</a>
</p>

![screenshot](/resources/screenshots/zettlr_view.png)

With Zettlr, writing professional texts is easy and motivating: Whether you are a college student, a researcher, a journalist, or an author — Zettlr has the right tools for you. [Watch the video](https://www.youtube.com/watch?v=BJ27r6YGpAs) or continue reading to see what they are!

[Visit our Website](https://zettlr.com/).

## Features

- Available in over a dozen languages
- Tight and ever-growing **integration with your favourite reference manager** (such as Zotero or JabRef)
- **Cite with Zettlr** using `citeproc` and your existing literature database
- Four **themes and dark mode support**
- File-agnostic writing: Enjoy **full control over your own files**
- Keep all your notes and texts **in one place** — searchable and accessible
- **Code highlighting** for many languages
- Simple and beautiful **exports** with [Pandoc](https://pandoc.org/), [LaTeX](https://www.latex-project.org/), and [Textbundle](http://textbundle.org/)
- Support for state of the art knowledge management techniques (**Zettelkasten**)
- A revolutionary **search algorithm** with integrated heatmap

… and the best is: **Zettlr is [Open Source (FOSS)](https://en.wikipedia.org/wiki/Free_and_open-source_software)!**

## Download

To install Zettlr, just [download the latest release](https://www.zettlr.com/download/) for your operating system! Currently supported are macOS, Windows, and most Linux distributions (via Debian- and Fedora-packages as well as AppImages).

All other [platforms that Electron supports](https://www.electronjs.org/docs/tutorial/support#supported-platforms) are supported as well, but you will need to build the app yourself for this to work.

**Please also consider [becoming a patron](https://www.patreon.com/zettlr) or making a [one-time donation](https://paypal.me/hendrikerz)!**

## Getting Started

If you have downloaded Zettlr, [head over to our website](https://docs.zettlr.com/) to get to know Zettlr. Refer to the [Quick Start Guide](https://docs.zettlr.com/en/5-minutes/), if you prefer to use software heads-on.

![The central window of Zettlr using the Night Theme](/resources/screenshots/zettlr_view_dark.png)

## Contributing

Zettlr is an [Electron](https://www.electronjs.org/)-based app, so to start developing, you'll need to have a [NodeJS](https://nodejs.org/)-stack on your computer installed. Make sure Node and preferably [Yarn](https://yarnpkg.com/en/) are installed, which is the recommended package manager.

Then, simply clone the repository and install the dependencies on your local computer:

```bash
$ git clone https://github.com/Zettlr/Zettlr.git
$ cd Zettlr
$ yarn install # or npm install
$ cd source
$ yarn install # or npm install
```

_(Please note the second `yarn install`/`npm install` in the source directory. This is necessary to build the app locally.)_

The `install`-scripts will automatically precompile all assets for the first time, so that you can immediately run `yarn start` after cloning the repository. However, whenever you change something of the resources, you should run these commands again. The next section will teach you everything you need to know about the commands at your disposal for developing the app.

### Development Commands

This section lists all available commands that you can use during application development. These are defined within the `package.json` and can be run from the command line by prefixing them either with `npm run` or `yarn`, depending on which package manager you use. Run them from within the base directory of the repository.

#### `build:quick`

This command builds the app locally without packing it. This means that within the `release`-directory you will find a pre-built binary, depending on your operating system.

#### `csl:refresh`

This downloads the [Citation Style Language](https://citationstyles.org/) (CSL) files with which the application is shipped, and places them in the `source/main/assets/csl-locales`- and `source/main/assets/csl-styles`-directories respectively. You can occasionally run this command to pull potential updates from the repositories. _Please note, that an automated workflow will run from time to time on the repository to do this, so in almost all cases it should suffice to pull from the develop branch from time to time._

#### `handlebars`

This re-compiles the [Handlebars.js](https://handlebarsjs.com/) template files and places the pre-compiled templates in the `source/common/assets/handlebars`-directory.

#### `lang:refresh`

This downloads the four default translations of the application from [Zettlr Translate](https://translate.zettlr.com/), with which it is shipped by default. It places the files in the `source/common/lang`-directory. Currently, the default languages are: German (Germany), English (USA), English (UK), and French (France). _Please note, that an automated workflow will run from time to time on the repository to do this, so in almost all cases it should suffice to pull from the develop branch from time to time._

#### `less`

This re-generates the CSS files from the [LESS](http://lesscss.org/)-source and places the final stylesheets in the `source/common/assets/css`-directory. You need to run this command every time you modify the LESS-source in order to see the changes reflected in the app's appearance. _Note: During heavy development, it might be easier to watch the LESS files and automatically recompile them. You can do so by running the command `watch`._

#### `lint`

This simply runs [ESLint](https://eslint.org/) with the configuration and outputs a file `eslint_report.htm` into the base directory of the repository with the results. Apps such as [Atom](https://atom.io/) or [Visual Studio Code](https://code.visualstudio.com/) will automatically run ESLint in the background, but if you want to be extra-safe, make sure to run this command prior to submitting a Pull Request.

#### `release:this`

This command is basically `build:quick`, but additionally packages it for your platform. That means, it will spit out a `.deb`, `.rpm`, `.dmg` or `.exe`-installer, depending on your operating system.

#### `release:linux`

Explicitly creates installer packages for Linux, that is: One `.deb`-package, one `.rpm`-package as well as [AppImage](https://appimage.org/) installers (both 32bit and 64bit).

#### `release:mac`

Explicitly creates a release for macOS. _Note: This command only works on macOS._

#### `release:win`

Explicitly creates an installer for Windows. The installer package is significantly bigger than the other installers, as `electron-builder` ships the installer with both 32bit and 64bit versions of the app. _Note: This command requires either a Windows-based operating system or a Linux distribution. As long as the developers of [WINE](https://www.winehq.org/) do not port their library to 64 bit, this command will fail on macOS Catalina and newer._

#### `reveal:build`

This re-compiles the source-files needed by the exporter for building [reveal.js](https://revealjs.com/)-presentations. Due to the nature of how [Pandoc](https://pandoc.org/) creates such presentations, Zettlr needs to modify the output by Pandoc, which is why these files need to be pre-compiled.

#### `start`

This command spins up Electron and runs the app. You will use this quite frequently during development.

#### `test`

This runs the unit tests in the directory `./test`. Make sure to run this command prior to submitting a Pull Request, as this will be run every time you commit to the PR, and this way you can make sure that your changes don't break any tests, making the whole PR-process easier.

#### `test-gui`

This prepares a test-directory (placed into your `./resources`-directory) and tells Zettlr to run with a modified simple configuration. This way you can test some things that might destroy files without actually touching your own files.

#### `watch`

This spins up a process that watches the LESS-source for changes. As long as this process runs, every change to a LESS-file will trigger a build so that you can immediately see your changes in a running Electron-application by pressing `F5` to refresh the GUI.

#### `wp:dev`

Compiles the [Vue.js](https://vuejs.org/)-assets from the resources-directory. This tells [Webpack](https://webpack.js.org/) to compile in development mode, which increases logging and makes debugging easier. Please make sure to run `wp:prod` if you want to create a release.

#### `wp:prod`

Compiles the Vue-assets from the resources-directory. This tells Webpack to compile in production mode, which decreases logging and makes the generated scripts run faster. It is recommended to run `wp:dev` in case you need to debug the Vue-files.

To dive deeper into the development process, have a look at our [full development documentation](https://docs.zettlr.com/en/get-involved).

## License

This software is licensed via the [GNU GPL v3-License](https://www.gnu.org/licenses/gpl-3.0.en.html).

The brand (including name, icons and everything Zettlr can be identified with) is exluded and all rights reserved. If you want to fork Zettlr to develop another app, feel free but please change name and icons. [Read about the logo usage](https://www.zettlr.com/press#usage-rights).
