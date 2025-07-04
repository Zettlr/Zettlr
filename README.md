<h1 align="center">
  <a href="https://github.com/Zettlr/Zettlr">
    <img src="https://raw.githubusercontent.com/Zettlr/Zettlr/master/resources/icons/png/256x256.png" alt="Zettlr"/>
  </a>
  <br/>
  Zettlr [<em>ˈset·lər</em>]
</h1>

<p align="center"><strong>Your One-Stop Publication Workbench</strong>.</p>

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
  <img alt="Unit Tests / Lint" src="https://github.com/Zettlr/Zettlr/actions/workflows/check.yml/badge.svg">
  <img alt="Build" src="https://github.com/Zettlr/Zettlr/workflows/Build/badge.svg">
</p>

<p align="center">
  <a href="https://www.zettlr.com/" target="_blank">Homepage</a> |
  <a href="https://www.zettlr.com/download">Download</a> |
  <a href="https://docs.zettlr.com/" target="_blank">Documentation</a> |
  <a href="https://forum.zettlr.com/" target="_blank">Community Forum</a> |
  <a href="https://go.zettlr.com/discord" target="_blank">Discord</a> |
  <a href="#contributing">Contributing</a> |
  <a href="https://zettlr.com/supporters" target="_blank">Support Us</a> |
  <a rel="me" href="https://fosstodon.org/@zettlr" target="_blank">Mastodon</a>
</p>

![screenshot](/resources/screenshots/zettlr_view.png)

Zettlr brings simplicity back to your texts. Open-minded writing that adapts to your style. Fast information retrieval that finds what matters to you. Versatile exporting that enables you to adapt to whatever publication pipeline your employer or school uses.

Focus on what matters to you.

**Publish, not perish.**

> [Learn more on our website](https://zettlr.com/).

## Features

- Your Notes are your notes: Zettlr is **privacy-first**
- **Citations** made easy: Tight and ever-growing integration with your favourite reference manager (Zotero, JabRef, and many others)
- Available in over a **dozen languages**
- Draft your publications in a professional environment, with **LaTeX and Word template support**
- Simple and beautiful exports with [Pandoc](https://pandoc.org/), [LaTeX](https://www.latex-project.org/), and [Textbundle](http://textbundle.org/)
- **Snippets** allow you to automate insertion of boilerplate code
- Themes, dark modes, and full flexibility with **custom CSS**
- **Code highlighting** for many languages
- Support for state of the art knowledge management techniques (**Zettelkasten**)
- A powerful **full text search** that helps you find anything, anywhere

… and the best is: **Zettlr is [Free and Open Source Software (FOSS)](https://en.wikipedia.org/wiki/Free_and_open-source_software)!**

## Installation

To install Zettlr, just [download the latest release](https://www.zettlr.com/download/) for your operating system. Currently supported are macOS, Windows, and most Linux distributions (via Debian- and Fedora-packages as well as AppImages).

On our website and here on GitHub, we provide a set of installers for the most common use-cases. We provide both 64-bit installers as well as installers for ARM systems (called "Apple Silicon" in the macOS ecosystem). 32-bit is not supported. We offer the following binaries directly:

* macOS (Intel and Apple Silicon)
* Windows (x64)
* Debian/Ubuntu (x64 and ARM) 
* Fedora/Red Hat (x64 and ARM)
* AppImage (x64 and ARM)

Thanks to our community, we can also offer you a variety of other installation opportunities:

* [Homebrew (macOS)](https://formulae.brew.sh/cask/zettlr)
* [Aptitude (Ubuntu/Debian)](https://apt.zettlr.com)
* [Flathub (Linux)](https://flathub.org/apps/details/com.zettlr.Zettlr)
* [Chocolatey (Windows)](https://community.chocolatey.org/packages/zettlr/)
* [Arch Linux](https://wiki.archlinux.org/title/Zettlr)

All other [platforms that Electron supports](https://www.electronjs.org/docs/latest/development/build-instructions-gn#platform-prerequisites) are supported as well, but you will need to build the app yourself for this to work.

**Please also consider [becoming a patron](https://www.patreon.com/zettlr) or making a [one-time donation](https://paypal.me/hendrikerz)!**

## Getting Started

After you have installed Zettlr, [head over to our documentation](https://docs.zettlr.com/) to get to know Zettlr. Refer to the [Quick Start Guide](https://docs.zettlr.com/en/5-minutes/), if you prefer to use software heads-on.

![The central window of Zettlr using the dark theme](/resources/screenshots/zettlr_view_dark.png)

## Contributing

As an Open Source application, Zettlr always welcomes contributions from the community. **You do not need to know how to write code to help!** A full overview over all the areas where you can help can be found in our [contributing guide](./CONTRIBUTING.md). Here, we introduce you to the two biggest areas where we welcome help: translations and contributing code.

### Translating

The development team maintains the English and German translations, but lacks adequate knowledge of other languages. All the other available translations have been created by our community.

Zettlr's translations utilize the [gettext system](https://www.gnu.org/software/gettext/). This means that the translations are kept in PO-files within the [`static/lang` directory](./static/lang).

To update a translation, simply download the corresponding language file and edit it. You can edit PO-files with a simple text editor, but if you prefer a more comfortable graphical editor, there are many out there. One good option is the Open Source editor [POedit](https://poedit.net/).

As soon as you are happy with your changes, open a Pull Request here that updates the corresponding file. GitHub has created a great [guide on how to open Pull Requests](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files#editing-files-in-another-users-repository).

### Contributing Code

Zettlr is an [Electron](https://www.electronjs.org/)-based app, so to start developing, you'll need to have the following installed on your computer:

1. [NodeJS](https://nodejs.org/). Make sure it's at least Node 22 (`lts/jod`). To test what version you have, run `node -v`.
2. [Yarn](https://yarnpkg.com/en/). This is the package manager for the project, as we do not commit `package-lock.json`-files and many commands require yarn. You can install this globally using `npm install -g yarn` or Homebrew, if you are on macOS.
3. On Windows, we recommend to [install the Windows Subsystem for Linux (WSL)](https://learn.microsoft.com/en-us/windows/wsl/install), which will make many of the next steps easier.
4. A few command-line utilities that various scripts require for running the development builds:
    * [`cURL`](https://curl.se/download.html) (required by the Pandoc download script)
    * `unzip` (required by the Pandoc download script)
    * [`jq`](https://jqlang.github.io/jq/) (required by the i18n script)
5. An appropriate build toolchain for your operating system, since Zettlr requires a few native C++-modules that must be compiled before running the app:
    * **macOS**: On macOS, installing the XCode command-line tools via `xcode-select --install` suffices
    * **Windows**: On Windows, you'll need the [free Visual Studio development tools](https://visualstudio.microsoft.com/free-developer-offers/) that include the required tools
    * **Linux**: On Linux, there are a variety of compatible toolchains available, sometimes they are already preinstalled. Refer to your distribution's manual for more information.

Then, simply clone the repository and install the dependencies on your local computer:

```bash
$ git clone https://github.com/Zettlr/Zettlr.git
$ cd Zettlr
$ yarn install --immutable
```

The `--immutable` flag ensures that yarn will stick to the versions as listed in the `yarn.lock` and not attempt to update them.

During development, hot module reloading (HMR) is active so that you can edit the renderer's code easily and hit `F5` after the changes have been compiled by `electron-forge`. You can keep the developer tools open to see when HMR has finished loading your changes.

### What Should I Know To Contribute Code?

In order to provide code, you should have basic familiarity with the following topics and/or manuals (ordered by descending importance):

* [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) (especially asynchronous code) and [TypeScript](https://www.typescriptlang.org/docs/)
* [Node.js](https://nodejs.org/api/)
* [Electron](https://www.electronjs.org/docs)
* [Vue.js 3.x](https://vuejs.org/guide/introduction.html) and [Pinia](https://pinia.vuejs.org/)
* [CodeMirror 6.x](https://codemirror.net/docs/)
* [ESLint](https://eslint.org/)
* [LESS](https://lesscss.org/#)
* [Webpack 5.x](https://webpack.js.org/concepts/)
* [Electron forge](https://www.electronforge.io/)
* [Electron builder](https://www.electron.build/)

> [!TIP]
> See the "Directory Structure" section below to get an idea of how Zettlr specifically works.

### Development Commands

This section lists all available commands that you can use during application development. These are defined within the `package.json` and can be run from the command line by prefixing them with `yarn`. Run them from within the base directory of the repository.

#### `start`

Use this command to carefree test any changes you make to the application. This command will start the application, but will provide a custom configuration and a custom directory. Thus, it will not touch any files that a regular Zettlr installation will use.

**The first time you start this command**, pass the `--clean`-flag to copy a bunch of test-files to your `./resources`-directory, create a `test-config.yml` in your project root, and start the application with this clean configuration. Then, you can adapt the `test-config.yml` to your liking (so that certain settings which you would otherwise _always_ set will be pre-set without you having to open the preferences).

Whenever you want to reset the test directory to its initial state (or you removed the directory, or cloned the whole project anew), pass the flag `--clean` to the command in order to create or reset the directory. **This is also necessary if you changed something in `test-config.yml`**.

If you want to prevent a config-file from being created (e.g., to simulate the first start experience), you can pass the flag `--no-config` to this command.

You can pass additional command-line switches such as `--clear-cache` to this command as well. They will be passed to the child process.

> [!WARNING]
> Attention: Before first running the command, you **must** run it with the `--clean`-flag to create the directory in the first place!

Additionally, have a look at our [full development documentation](https://docs.zettlr.com/en/get-involved).

#### `package`

Packages the application, but not bundle it into an installer. Without any suffix, this command will package the application for your current platform and architecture. To create specific packages (may require running on the corresponding platform), the following suffixes are available:

- `package:mac-x64` (Intel-based Macs)
- `package:mac-arm` (Apple Silicon-based Macs)
- `package:win-x64` (Intel-based Windows)
- `package:linux-x64` (Intel-based Linux)
- `package:linux-arm` (ARM-based Linux)

The resulting application packages are stored in `./out`.

> [!IMPORTANT]
> This command will skip typechecking to speed up builds, so we recommend running `lint` before packaging to ensure that there are no errors.

#### `release:{platform-arch}`

Packages the application and then bundles it into an installer for the corresponding platform and architecture. To create such a bundle (may require running on the corresponding platform), one of the following values for `{platform-arch}` is required:

- `release:mac-x64` (Intel-based Macs)
- `release:mac-arm` (Apple Silicon-based Macs)
- `release:win-x64` (Intel-based Windows)
- `release:linux-x64` (Intel-based Linux)
- `release:linux-arm` (ARM-based Linux)

The resulting setup bundles are stored in `./release`.

> [!NOTE]
> While you can `package` directly for your platform without any suffix, you need to specify the platform and architecture when creating a release bundle, since electron-builder would otherwise include the development-dependencies in the `app.asar`, resulting in a bloated application.

#### `csl:refresh`

This downloads the [Citation Style Language](https://citationstyles.org/) (CSL) files with which the application is shipped, and places them in the `static/csl-locales`- and `static/csl-styles`-directories respectively.

> [!NOTE]
> This command is intended for an automated workflow that runs from time to time on the repository to perform this action. **Do not commit updated files to the repository**. Instead, the updated files will be downloaded whenever you `git fetch`.

#### `lint:code`

Runs [ESLint](https://eslint.org/) over the codebase. Apps such as [Visual Studio Code](https://code.visualstudio.com/) will automatically run ESLint in the background on your open files. This command runs it across the entire code base.

> [!TIP]
> Usually, you will want to run the `lint` command instead.

#### `lint:types`

Runs TypeScript's type checker via [`vue-tsc`](https://www.npmjs.com/package/vue-tsc) over the codebase. Apps such as [Visual Studio Code](https://code.visualstudio.com/) will automatically check types for your open files in the background. This command checks the entire code base.

> [!TIP]
> Usually, you will want to run the `lint` command instead.

#### `lint`

Runs both `lint:code` and `lint:types` in one go. This ensures that any code you add conforms to stylistic rules and can run without obvious errors. Make sure to run this command prior to submitting a Pull Request.

> [!NOTE]
> This command will run automatically on each Pull Request to check your code for inconsistencies.

#### `lint:po`

This command ensures all translation files in the directory `static/lang` can be parsed by the app. It does so by parsing them with the `gettext` parser that ships with Zettlr. This command does not require the `gettext` system itself to be installed on the machine, as it only uses the Node module.

> [!NOTE]
> This command will run automatically on pull requests that touch `*.po`-files.

#### `shortcut:install`

Creates a `.desktop`-file into your applications which enables you to quickly start an app that you have compiled from source. This requires Linux. To use new changes, simple sync the repository, run `package` again, and you're good to go.

> [!WARNING]
> We provide this command as a convenience. Unless you know what you are doing, you should not run code directly compiled from the HEAD commit of the develop branch. This command *can* be useful, however, in a few instances where you know what may go wrong and can take appropriate precautions.

### `shortcut:uninstall`

Removes the `.desktop`-file created by `shortcut:install`.

> [!NOTE]
> You don't have to uninstall and reinstall the shortcut whenever you compile the binary anew. Just make sure that Zettlr is closed before you recompile it. You should only have to reinstall the shortcut if the template (in `scripts/assets/zettlr-dev.desktop`) has changed.

#### `test`

This runs the unit tests in the directory `./test`. Make sure to run this command prior to submitting a Pull Request, as this will be run every time you commit to the PR, and this way you can make sure that your changes don't break any tests, making the whole PR-process easier.

#### `test-gui`

See `start`.

> [!IMPORTANT]
> This command is deprecated and only an alias for `start`. Use `start` instead.

### Directory Structure

Zettlr is a mature app that has amassed hundreds of directories over the course of its development. Since it is hard to contribute to an application without any guidance, we have compiled a short description of the directories with how they interrelate.

<!-- File tree generated with `tree -d -L 4 -I node_modules .` in root -->

```
.
├── out                         # Contains unpackaged binaries after running any `package` command
├── release                     # Contains distributables after running any `release` command
├── resources                   # General resource files
│   ├── NSIS                    # Windows installer bitmaps
│   ├── icons                   # Various icon formats
│   ├── screenshots             # Contains the main screenshots
├── scripts                     # Scripts used during the build process and CI pipeline 
│   ├── assets                  # Assets for the script files
│   └── test-gui                # A full file tree used with the `test-gui` command
├── source                      # This is the actual source filetree
│   ├── app                     # Main process components
│   │   ├── service-providers   # Service providers that handle most of the business logic
│   │   └── util                # Utility functions for the main process
│   ├── common                  # Shared files between various renderer processes
│   │   ├── img                 # Images used in various places
│   │   ├── modules             # Shared modules
│   │   │   ├── markdown-editor # Main Markdown editor
│   │   │   ├── markdown-utils  # MD Utilities such as md2html converter
│   │   │   ├── preload         # Electron preload files
│   │   │   └── window-register # Run by every renderer during setup
│   │   ├── util                # General utility functions
│   │   └── vue                 # Shared Vue components
│   ├── pinia                   # Renderer state management
│   ├── types                   # Types-only directory; deprecated
│   ├── win-about               # About dialog window
│   ├── win-assets              # Assets Manager
│   ├── win-error               # Error window
│   ├── win-log-viewer          # Log Viewer
│   ├── win-main                # Main window
│   ├── win-paste-image         # Paste-Image-dialog
│   ├── win-preferences         # Preferences window
│   ├── win-print               # Print preview
│   ├── win-project-properties  # Project properties
│   ├── win-splash-screen       # The splash screen
│   ├── win-stats               # Statistics window
│   ├── win-tag-manager         # Tag manager
│   └── win-update              # Updater
├── static                      # Contains static resources
│   ├── csl-locales             # CSL locale files
│   ├── csl-styles              # CSL styles
│   ├── defaults                # Default defaults/Pandoc profiles
│   ├── dict                    # Dictionaries that ship with the app
│   ├── fonts                   # Fonts that ship with the app
│   ├── lang                    # Language and i18n-related files
│   ├── lua-filter              # Default Lua-filters
│   └── tutorial                # Tutorial files in various languages
└── test                        # Unit tests
```

### On the Distinction between Modules and Service Providers

You'll notice that Zettlr contains both "modules" and "service providers". The difference between the two is simple: Service providers run in the main process and are completely autonomous while providing functionality to the app as a whole. Modules, on the other hand, provide functionality that must be triggered by user actions (e.g. the exporter and the importer).

### The Application Lifecycle

Whenever you run Zettlr, the following steps will be executed:

0. Execute `source/main.ts`
1. Environment check (`source/app/lifecycle.ts::bootApplication`)
2. Boot service providers (`source/app/lifecycle.ts::bootApplication`)
3. Boot main application (`source/main/zettlr.ts`)
4. Load the file tree and the documents
5. Show the main window

And when you shut down the app, the following steps will run:

1. Close all windows except the main window
2. Attempt to close the main window
3. Shutdown the main application (`source/main/zettlr.ts::shutdown`)
4. Shutdown the service providers (`source/app/lifecycle.ts::shutdownApplication`)
5. Exit the application

During development of the app (`yarn start` and `yarn test-gui`), the following steps will run:

1. Electron forge will compile the code for the main process and each renderer process separately (since these are separate processes), using TypeScript and webpack to compile and transpile.
2. Electron forge will put that code into the directory `.webpack`, replacing the constants you can find in the "create"-methods of the window manager with the appropriate entry points.
3. Electron forge will start a few development servers to provide hot module reloading (HMR) and then actually start the application.

Whenever the app is built, the following steps will run:

1. Electron forge will perform steps 1 and 2 above, but instead of running the app, it will package the resulting code into a functional app package.
2. Electron builder will then take these pre-built packages and wrap them in a platform-specific installer (DMG-files, Windows installer, or Linux packages).

Electron forge will put the packaged applications into the directory `./out` while Electron builder will put the installers into the directory `./release`.

## Command-Line Switches

The Zettlr binary features a few command line switches that you can make use of for different purposes.

#### `--launch-minimized`

This CLI flag will instruct Zettlr not to show the main window on start. This is useful to create autostart entries. In that case, launching Zettlr with this flag at system boot will make sure that you will only see its icon in the tray.

Since this implies the need to have the app running in the tray bar or notification area when starting the app like this, it will automatically set the corresponding setting `system.leaveAppRunning` to true.

> [!NOTE]
> This flag will not have any effect on Linux systems which do not support displaying an icon in a tray bar or notification area.

#### `--clear-cache`

This will direct the File System Abstraction Layer to fully clear its cache on boot. This can be used to mitigate issues regarding changes in the code base. To ensure compatibility with any changes to the information stored in the cache, the cache is also automatically cleared when the version field in your `config.json` does not match the one in the `package.json`, which means that, as long as you do not explicitly set the `version`-field in your `test-config.yml`, the cache will always be cleared on each run when you type `yarn test-gui`.

> [!TIP]
> If you just want to casually clear the cache for troubleshooting, you can also clear the cache by selecting the appropriate menu item in the "Help" menu, which saves you from having to dabble with anything technical.

#### `--data-dir=path`

Use this switch to specify a custom data directory, which holds your configuration files. Without this switch, the data directory defaults to `%AppData%/Zettlr` (on Windows 10 and newer), `~/.config/Zettlr` (on Linux), or `~/Library/Application Support/Zettlr` (on macOS). The path can be absolute or relative. Basis for the relative path will be either the binary's directory (when running a packaged app) or the repository root (when running an app that is not packaged). Remember to escape spaces or quote the path, if necessary. The `~` character to denote the home directory is not expanded in this case, so make sure to pass the entire path to your home directory if necessary. Due to a minor bug in Electron, an empty `Dictionaries` subdirectory is created in the default data directory, but it does not impact functionality.

#### `--disable-hardware-acceleration`

This switch causes Zettlr to disable hardware acceleration, which could be necessary in certain setups. For more information on why this flag was added, see issue [#2127](https://github.com/Zettlr/Zettlr/issues/2127).

## VSCode Extension Recommendations

This repository makes use of Visual Studio Code's [recommended extensions feature](https://go.microsoft.com/fwlink/?LinkId=827846). This means: If you use VS Code and open the repository for the first time, VS Code will tell you that the repository recommends to install a handful of extensions. These extensions are recommended if you work with Zettlr and will make contributing much easier. The recommendations are specified in the file `.vscode/extensions.json`.

Since installing extensions is sometimes a matter of taste, we have added short descriptions for each recommended extension within that file to explain why we recommend it. This way you can make your own decision whether or not you want to install any of these extensions (for example, the SVG extension is not necessary if you do not work with the SVG files provided in the repository).

If you choose not to install all of the recommended extensions at once (which we recommend), VS Code will show you the recommendations in the extensions sidebar so you can first decide which of the ones you'd like to install and then manually install those you'd like to have.

> [!TIP]
> Using the same extensions as the core developer team will make the code generally more consistent since you will have the same visual feedback.

## License

This software is licensed via the [GNU GPL v3-License](https://www.gnu.org/licenses/gpl-3.0.en.html).

The brand (including name, icons and everything Zettlr can be identified with) is excluded and all rights reserved. If you want to fork Zettlr to develop another app, feel free but please change name and icons. [Read about the logo usage](https://www.zettlr.com/press#usage-rights).
