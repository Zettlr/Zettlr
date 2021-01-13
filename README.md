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
- Five **themes and dark mode support**
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

Zettlr is an [Electron](https://www.electronjs.org/)-based app, so to start developing, you'll need to have:

1. A [NodeJS](https://nodejs.org/)-stack installed on your computer. Make sure it's at least Node 12 (`lts/erbium`). To test what version you have, run `node -v`.
2. [Yarn](https://yarnpkg.com/en/) installed. Yarn is the required package manager for the project, as we do not commit `package-lock.json`-files and many commands require yarn. You can install this globally using `npm install -g yarn` or Homebrew, if you are on macOS.

Then, simply clone the repository and install the dependencies on your local computer:

```bash
$ git clone https://github.com/Zettlr/Zettlr.git
$ cd Zettlr
$ yarn install
```

You can optionally add the `--frozen-lockfile` flag to ensure yarn will stick to the versions as listed in the `yarn.lock` and not attempt to update them.

During development, hot module reloading is active so that you can edit the renderer's code easily and hit `F5` after the changes have been compiled by `electron-forge`. You can keep the developer tools open to see when HMR has finished loading your changes.

### Development Commands

This section lists all available commands that you can use during application development. These are defined within the `package.json` and can be run from the command line by prefixing them with `yarn`. Run them from within the base directory of the repository.

#### `start`

Starts `electron-forge`, which will build the application and launch it in development mode. This will use the normal settings, so if you use Zettlr on the same computer in production, it will use the same configuration files as the regular application. This means: be careful when breaking things. In that case, it's better to use `test-gui`.

#### `package`

Packages the application, but not bundle it into an installer. Without any suffix, this command will package the application for your current platform. To create specific packages (may require running on the corresponding platform), the following suffixes are available:

- `package:mac`
- `package:win`
- `package:win-arm`
- `package:linux-x32`
- `package:linux-x64`

The resulting application packages are stored in `./out`.

#### `release:{platform}`

Packages the application and then bundles it into an installer for the corresponding platform. To create such a bundle (may require running on the corresponding platform), one of the following values for `{platform}` is required:

- `release:mac`
- `release:win`
- `release:win-arm`
- `release:linux-x32`
- `release:linux-x64`
- `release:linux` (shorthand for calling `yarn release:linux-x32 && yarn release:linux-x64`)

The resulting setup bundles are stored in `./release`.

> Please note that, while you can `package` directly for your platform without any suffix, for creating a release specifying the platform is required as electron-builder would otherwise include the development-dependencies in the `app.asar`, resulting in a bloated application.

#### `lang:refresh`

This downloads the four default translations of the application from [Zettlr Translate](https://translate.zettlr.com/), with which it is shipped by default. It places the files in the `source/common/lang`-directory. Currently, the default languages are: German (Germany), English (USA), English (UK), and French (France).

> Please note, that this command is intended for an automated workflow that runs from time to time on the repository to perform this action. This means: Do **not** commit updated files to the repository. Instead, the updated files will be downloaded whenever you `git fetch`.

#### `csl:refresh`

This downloads the [Citation Style Language](https://citationstyles.org/) (CSL) files with which the application is shipped, and places them in the `source/main/assets/csl-locales`- and `source/main/assets/csl-styles`-directories respectively.

> Please note, that this command is intended for an automated workflow that runs from time to time on the repository to perform this action. This means: Do **not** commit updated files to the repository. Instead, the updated files will be downloaded whenever you `git fetch`.

#### `lint`

This simply runs [ESLint](https://eslint.org/) with the configuration and outputs a file `eslint_report.htm` into the base directory of the repository with the results. Apps such as [Atom](https://atom.io/) or [Visual Studio Code](https://code.visualstudio.com/) will automatically run ESLint in the background, but if you want to be extra-safe, make sure to run this command prior to submitting a Pull Request.

> This command will run automatically on each Pull Request to check your code for inconsistencies.

#### `reveal:build`

This re-compiles the source-files needed by the exporter for building [reveal.js](https://revealjs.com/)-presentations. Due to the nature of how [Pandoc](https://pandoc.org/) creates such presentations, Zettlr needs to modify the output by Pandoc, which is why these files need to be pre-compiled.

#### `test`

This runs the unit tests in the directory `./test`. Make sure to run this command prior to submitting a Pull Request, as this will be run every time you commit to the PR, and this way you can make sure that your changes don't break any tests, making the whole PR-process easier.

#### `test-gui`

Use this command to carefree test any changes you make to the application. This command will start the application as if you ran `yarn start`, but will provide a custom configuration and a custom directory.

**The first time you start this command**, pass the `--clean`-flag to copy a bunch of test-files to your `./resources`-directory, create a `test-config.yml` in your project root, and start the application with this clean configuration. Then, you can adapt the `test-config.yml` to your liking (so that certain settings which you would otherwise _always_ set will be pre-set without you having to open the preferences).

Whenever you want to reset the test directory to its initial state (or you removed the directory, or cloned the whole project anew), pass the flag `--clean` to the command in order to create or reset the directory. **This is also necessary if you changed something in `test-config.yml`**.

You can pass additional command-line switches such as `--clear-cache` to this command as well. They will be passed to the child process.

> Attention: Before first running the command, you **must** run it with the `--clean`-flag to create the directory in the first place!

To dive deeper into the development process, have a look at our [full development documentation](https://docs.zettlr.com/en/get-involved).

## Command-Line Switches

The Zettlr binary features a few command line switches that you can make use of for different purposes.

#### `--clear-cache`

This will direct the File System Abstraction Layer to fully clear its cache on boot. This can be used to mitigate issues regarding changes in the code base. To ensure compatibility with any changes to the information stored in the cache, the cache is also automatically cleared when the version field in your `config.json` does not match the one in the `package.json`, which means that, as long as you do not explicitly set the `version`-field in your `test-config.yml`, the cache will always be cleared on each run when you type `yarn test-gui`.

#### `--config=path`

Use this switch to temporarily override the default configuration file stored in your AppData-equivalent folder. This path should be absolute. In case you need to provide a relative path, the base for resolving the path will be: either the binary's directory name (when the app is packaged), or the repository root (when the app is not packaged). If the path contains spaces, don't forget to escape it in quotes.

## License

This software is licensed via the [GNU GPL v3-License](https://www.gnu.org/licenses/gpl-3.0.en.html).

The brand (including name, icons and everything Zettlr can be identified with) is excluded and all rights reserved. If you want to fork Zettlr to develop another app, feel free but please change name and icons. [Read about the logo usage](https://www.zettlr.com/press#usage-rights).
