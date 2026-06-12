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

Zettlr brings simplicity back to your texts. Open-minded writing that adapts to
your style. Fast information retrieval that finds what matters to you. Versatile
exporting that enables you to adapt to whatever publication pipeline your
employer or school uses.

Focus on what matters to you.

**Publish, not perish.**

> [Learn more on our website](https://zettlr.com/).

***

**Table of Contents**

- [Features](#features)
- [Getting Started](#getting-started)
- [Building from Source](#building-from-source)
- [Contributing](#contributing)
  - [Getting Started](#getting-started-1)
  - [Tech Stack](#tech-stack)
  - [Debugging](#debugging)
  - [Architecture Overview](#architecture-overview)
  - [Development Commands](#development-commands)
  - [Build Flags](#build-flags)
  - [Directory Structure](#directory-structure)
- [Command-Line Switches](#command-line-switches)
- [VSCode Extension Recommendations](#vscode-extension-recommendations)
- [License](#license)

## Features

- Your Notes are your notes: Zettlr is **privacy-first**
- **Citations** made easy: Tight and ever-growing integration with your
  favorite reference manager (Zotero, JabRef, and many others)
- Available in over a **dozen languages**
- Draft your publications in a professional environment, with
  **LaTeX and Word template support**
- Simple and beautiful exports with [Pandoc](https://pandoc.org/),
  [LaTeX](https://www.latex-project.org/), and [Textbundle](http://textbundle.org/)
- **Snippets** allow you to automate insertion of boilerplate code
- Themes, dark modes, and full flexibility with **custom CSS**
- **Code highlighting** for many languages
- Support for state of the art knowledge management techniques (**Zettelkasten**)
- A powerful **full text search** that helps you find anything, anywhere

… and the best is: **Zettlr is [Free and Open Source Software (FOSS)](https://en.wikipedia.org/wiki/Free_and_open-source_software)!**

## Getting Started

[Download the latest release](https://www.zettlr.com/download/) and install it
as you would any other app. Currently supported are macOS, Windows, and most
Linux distributions.

On our website and here on GitHub, we provide a set of installers for the most
common use-cases. We provide both 64-bit installers as well as installers for
ARM systems (called "Apple Silicon" in the macOS ecosystem). 32-bit is not
supported. We offer the following binaries directly:

* macOS (Intel and Apple Silicon)
* Windows (x64)
* Debian/Ubuntu (x64 and ARM) 
* Fedora/Red Hat (x64 and ARM)
* AppImage (x64 and ARM)

Thanks to our community, we can also offer you a variety of other setup
opportunities via package managers:

* [Homebrew (macOS)](https://formulae.brew.sh/cask/zettlr)
* [Aptitude (Ubuntu/Debian)](https://apt.zettlr.com)
* [Flathub (Linux)](https://flathub.org/apps/details/com.zettlr.Zettlr)
* [Chocolatey (Windows)](https://community.chocolatey.org/packages/zettlr/)
* [Arch Linux](https://wiki.archlinux.org/title/Zettlr)

All other [platforms that Electron supports](https://www.electronjs.org/docs/latest/development/build-instructions-gn#platform-prerequisites)
are supported as well, but you will need to build the app yourself.

> [!TIP]
> Zettlr is fully supported by community donations. You can donate once, or
> monthly. [Learn more on our website](https://www.zettlr.com/supporters).
> Thank you!

After you have installed Zettlr, [head over to our documentation](https://docs.zettlr.com/)
to get to know Zettlr. The app ships with a small tutorial which covers the basics.

If you are new to Zettlr, refer to our
[first time users guide](https://docs.zettlr.com/en/first-time-users/first-steps/).
You might also want to consider
[installing LaTeX](https://docs.zettlr.com/en/getting-started/installing-latex/)
to unlock all export profiles of the app.

![The central window of Zettlr using the dark theme](/resources/screenshots/zettlr_view_dark.png)

## Building from Source

You can compile the app for yourself, if you prefer. To do so, refer to our
development guide below to ensure you have all required dependencies installed.
Then, you can build the app for your computer using the command `yarn package`.

## Contributing

As an Open Source application, Zettlr always welcomes contributions from the
community. **You do not need to know how to write code to help!** A full
overview over all the areas where you can help can be found in our
[contributing guide](./CONTRIBUTING.md). In the following, we introduce you to
setting up the Zettlr source code locally.

### Getting Started

Zettlr is an [Electron](https://www.electronjs.org/)-based app. To start
developing, you'll need to have the following installed on your computer:

1. [NodeJS](https://nodejs.org/). Make sure it's at least Node 22 (`lts/jod`).
   To test what version you have, run `node -v`.
2. [Yarn](https://yarnpkg.com/en/). This is the package manager for the project,
   as we do not commit `package-lock.json`-files and many commands require yarn.
   You can install this globally using `npm install -g yarn` or Homebrew, if you
   are on macOS.
3. On Windows, we recommend to
   [install the Windows Subsystem for Linux (WSL)](https://learn.microsoft.com/en-us/windows/wsl/install),
   which will make many of the next steps easier.
4. A few command-line utilities that various scripts require for running the
   development builds:
    * [`cURL`](https://curl.se/download.html) (required by the Pandoc download
      script)
    * `unzip` (required by the Pandoc download script)
    * [`jq`](https://jqlang.github.io/jq/) (required by the i18n script)
5. An appropriate build toolchain for your operating system, since Zettlr
   requires a few native C++-modules that must be compiled before running the
   app:
    * **macOS**: On macOS, installing the XCode command-line tools via
      `xcode-select --install` suffices
    * **Windows**: On Windows, you'll need the
      [free Visual Studio development tools](https://visualstudio.microsoft.com/free-developer-offers/)
      that include the required tools
    * **Linux**: On Linux, there are a variety of compatible toolchains
      available, sometimes they are already preinstalled. Refer to your
      distribution's manual for more information.

Then, simply clone the repository and install the dependencies on your local
computer:

```bash
git clone https://github.com/Zettlr/Zettlr.git
cd Zettlr
yarn install --immutable
```

> [!CAUTION]
> Ensure you run `yarn install` with the `--immutable` flag. This ensures that
> yarn will stick to the versions as listed in the `yarn.lock` and not attempt
> to update them. This can prevent supply-chain attacks that could infect your
> computer.

During development, hot module reloading (HMR) is active so that you can edit
the renderer's code easily and hit `F5` after the changes have been compiled by
`electron-forge`. You can keep the developer tools open to see when HMR has
finished loading your changes.

### Tech Stack

Zettlr relies on three tech stacks: Electron, Node.js, and Vue for the frontend.
In order to provide code, you should have basic familiarity with the following
topics and/or manuals (ordered by descending importance):

* [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  (especially asynchronous code) and
  [TypeScript](https://www.typescriptlang.org/docs/)
* [Node.js](https://nodejs.org/api/)
* [Electron](https://www.electronjs.org/docs)
* [Vue.js 3.x](https://vuejs.org/guide/introduction.html) and
  [Pinia](https://pinia.vuejs.org/)
* [CodeMirror 6.x](https://codemirror.net/docs/)
* [ESLint](https://eslint.org/)
* [Webpack 5.x](https://webpack.js.org/concepts/)
* [Electron forge](https://www.electronforge.io/)
* [Electron builder](https://www.electron.build/)

### Debugging

Zettlr offers full debugging-support within VS Code, powered by configurations
in `.vscode/launch.json`. You can start a debugging session directly from the
debugging sidebar. You can debug either the main process or attach the debugger
to an individual renderer process.

> [!TIP]
> To learn more about debugging in VS Code,
> [read the official guide](https://code.visualstudio.com/docs/debugtest/debugging).

### Architecture Overview

As an Electron-app, Zettlr inherits its distinction into one main process and
several renderer processes, the latter of which correspond to the individual
windows. On top of this, Zettlr implements a relatively classical
server/single-page-application pattern. Here, the main process functions as a
server that orchestrates the application windows (think of each as its own,
individual, SPA) and enables a bridge between them and the operating system.

All main process code resides in the `source/app` directory, which includes
three parts:

1. The `lifecycle.ts` module that performs pre-boot environment checks and
   facilitates start and shutdown of the app.
2. The `app-service-container.ts` file which includes the primary application
   service container.
3. The various service providers in the folder `service-providers`, which are
   all classes implemented as singletons.

During boot, the lifecycle module will perform an environment check and then
continue to load the application service container, which in turn loads all the
service provider singletons. Those will remain active and running throughout the
lifetime of the app. They serve requests from the renderer processes
(implemented via Electron's IPC module) and monitor the operating system, e.g.,
for theme or file changes.

The individual renderer processes, or windows, are managed by the
`WindowManager`, which is a service provider. Upon request, it will instantiate
a new `BrowserWindow` and load the correct entry point for the SPA that serves
as the corresponding window.

The renderers are fully functional SPAs with three notable differences compared
to normal SPAs:

1. Instead of communicating with an API using `fetch`, they communicate with the
   main process via the IPC module. This works essentially akin to websockets,
   except we do not have to instantiate a connection first.
2. The IPC communication is injected into every window using the same preload
   script (`source/common/modules/preload`).
3. They are implemented in a more desktop-oriented way with Vue modules that are
   ordered according to desktop design principles, rather than website layouts.

### Development Commands

This section lists all available commands that you can use during application
development. These are defined within the `package.json` and can be run from the
command line by prefixing them with `yarn`. Run them from within the base
directory of the repository.

#### `start`

Use this command to carefree test any changes you make to the application. This
command will start the application, but will provide a custom configuration and
a custom directory. Thus, it will not touch any files that a regular Zettlr
installation will use.

> [!CAUTION]
> **The first time you start this command**, pass the `--clean`-flag to copy a
> bunch of test-files to your `./resources`-directory, create a
> `test-config.yml` in your project root, and start the application with this
> clean configuration. Then, you can adapt the `test-config.yml` to your liking
> (so that certain settings which you would otherwise *always* set will be
> pre-set without you having to open the preferences).

Whenever you want to reset the test directory to its initial state (or you
removed the directory, or cloned the whole project anew), pass the flag
`--clean` to the command in order to create or reset the directory.
**This is also necessary if you changed something in `test-config.yml`**.

If you want to prevent a config-file from being created (e.g., to simulate the
first start experience), pass the flag `--no-config` to this command.

You can pass additional [command-line switches](#command-line-switches) such as
`--clear-cache` as well. They will be passed to the child process.

Additionally, have a look at our
[full development documentation](https://docs.zettlr.com/en/getting-started/get-involved/).

#### `package`

Packages the application, but not bundle it into an installer. Without any
suffix, this command will package the application for your current platform and
architecture. To create specific packages (may require running on the
corresponding platform), the following suffixes are available:

- `package:mac-x64` (Intel-based Macs)
- `package:mac-arm` (Apple Silicon-based Macs)
- `package:win-x64` (Intel-based Windows)
- `package:linux-x64` (Intel-based Linux)
- `package:linux-arm` (ARM-based Linux)

The resulting application packages are stored in `./out`.

> [!IMPORTANT]
> This command will skip typechecking to speed up builds, so we recommend
> running `lint` before packaging to ensure that there are no errors.

#### `release:{platform-arch}`

Packages the application and then bundles it into an installer for the
corresponding platform and architecture. To create such a bundle (may require
running on the corresponding platform), one of the following values for
`{platform-arch}` is required:

- `release:mac-x64` (Intel-based Macs)
- `release:mac-arm` (Apple Silicon-based Macs)
- `release:win-x64` (Intel-based Windows)
- `release:linux-x64` (Intel-based Linux)
- `release:linux-arm` (ARM-based Linux)

The resulting setup bundles are stored in `./release`.

> [!NOTE]
> While you can `package` directly for your platform without any suffix, you
> need to specify the platform and architecture when creating a release bundle,
> since electron-builder would otherwise include the development-dependencies in
> the `app.asar`, resulting in a bloated application.

#### `csl:refresh`

This downloads the [Citation Style Language](https://citationstyles.org/) (CSL)
files with which the application is shipped, and places them in the
`static/csl-locales`- and `static/csl-styles`-directories respectively.

> [!NOTE]
> This command is intended for an automated workflow that runs from time to time
> on the repository to perform this action.
> **Do not commit updated files to the repository**. Instead, the updated files
> will be downloaded whenever you `git fetch`.

#### `lint`

Runs both `lint:code` and `lint:types` in one go. This ensures that any code you
add conforms to stylistic rules and can run without obvious errors. Make sure to
run this command prior to submitting a Pull Request.

> [!NOTE]
> This command will run automatically on each Pull Request to check your code
> for inconsistencies.

#### `lint:code`

Runs [ESLint](https://eslint.org/) over the codebase. Apps such as
[Visual Studio Code](https://code.visualstudio.com/) will automatically run
ESLint in the background on your open files. This command runs it across the
entire code base.

> [!TIP]
> Usually, you will want to run the `lint` command instead.

#### `lint:types`

Runs TypeScript's type checker via
[`vue-tsc`](https://www.npmjs.com/package/vue-tsc) over the codebase. Apps such
as [Visual Studio Code](https://code.visualstudio.com/) will automatically check
types for your open files in the background. This command checks the entire code
base.

> [!TIP]
> Usually, you will want to run the `lint` command instead.

#### `lint:po`

This command ensures all translation files in the directory `static/lang` can be
parsed by the app. It does so by parsing them with the `gettext` parser that
ships with Zettlr. This command does not require the `gettext` system itself to
be installed on the machine, as it only uses the Node module.

> [!NOTE]
> This command will run automatically on pull requests that touch `*.po`-files.

#### `shortcut:install`

Creates a `.desktop`-file into your applications which enables you to quickly
start an app that you have compiled from source. This requires Linux. To use new
changes, simple sync the repository, run `package` again, and you're good to go.

> [!WARNING]
> We provide this command as a convenience. Unless you know what you are doing,
> you should not run code directly compiled from the HEAD commit of the develop
> branch. This command *can* be useful, however, in a few instances where you
> know what may go wrong and can take appropriate precautions.

#### `shortcut:uninstall`

Removes the `.desktop`-file created by `shortcut:install`.

> [!NOTE]
> You don't have to uninstall and reinstall the shortcut whenever you compile
> the binary anew. Just make sure that Zettlr is closed before you recompile it.
> You should only have to reinstall the shortcut if the template (in
> `scripts/assets/zettlr-dev.desktop`) has changed.

#### `test`

This runs the unit tests in the directory `./test`. Make sure to run this
command prior to submitting a Pull Request, as this will be run every time you
commit to the PR, and this way you can make sure that your changes don't break
any tests, making the whole PR-process easier.

#### `test-gui`

See `start`.

> [!IMPORTANT]
> This command is deprecated and only an alias for `start`. Use `start` instead.

### Build Flags

The build process of Zettlr supports build flags that you can use to hardwire
certain behaviors into the final binary. These usually come as environment
variables. If they are present, Zettlr will produce a different binary.

#### `ZETTLR_DISABLE_UPDATE_CHECK`

If this environment variable is present during build, this will cause the
resulting binary to have its built-in update-checking mechanism disabled. This
is useful if you are repackaging the app for distribution through a package
manager. The build script will emit a warning that the binary will not have
update checks enabled.

To disable the update check at build time, simply make sure that this
environment variable is present. The build script only checks for its presence,
not the actual value. To ensure you are including the update check mechanism,
make sure this environment variable is *not* set, e.g., by running
`unset ZETTLR_DISABLE_UPDATE_CHECK` before running the build script.

> [!CAUTION]
> By creating and distributing a version of Zettlr with update checks disabled,
> you are responsible for ensuring that users will receive updates for Zettlr
> through a different mechanism. You acknowledge that you are responsible for
> ensuring that your update mechanism works reliably at all times. If – for any
> reasons – your update mechanism is disrupted – even temporarily – and Zettlr
> users cannot receive new updates, you are **required** to immediately notify
> us of this by opening a GitHub Issue, via Discord, or via Email.
> **Failure to comply with these added requirements will result in our immediate termination of the implicit consent for you to distribute modified Zettlr versions.**
> If we receive notice of a version of Zettlr being publicly distributed without
> a working update mechanism and you fail to communicate this directly to us, we
> will immediately warn users publicly about your Zettlr package and withdraw
> our implicit consent for you to distribute Zettlr. Thus, you will forfeit your
> allowance to distribute Zettlr indefinitely. In short: Only use this build
> flag if you know *exactly* what you're doing, and, if something goes wrong,
> communicate proactively. Then, all is good.

#### `BUNDLE_PANDOC`

If this environment variable is present during build, this will cause the build
script to **not** bundle the correct Pandoc binary into the final application
bundle. This is useful if you are repackaging the app for distribution through a
package manager and ensure that Pandoc gets installed as a dependency of Zettlr.
The build script will emit a warning that the binary will not be bundled with
Pandoc.

To disable bundling of Pandoc, you need to set the environment variable to `0`,
e.g.: `export BUNDLE_PANDOC=0`. This will cause the build script to neither
download nor bundle Pandoc. (This also absolves your build environment from the
specific requirements for the Pandoc download script identified above.)

> [!CAUTION]
> Zettlr users expect Pandoc to be present, since otherwise they will not be
> able to import or export files. Every version of Zettlr that is publicly
> distributed must therefore either come bundled with Pandoc, or ensure through
> another mechanism that Pandoc is installed on the computer. If you use this
> build flag while repackaging the app and distribute it via some package
> manager, you are **required** to ensure that Pandoc will be installed
> alongside Zettlr via some other means (e.g., by marking Pandoc as a dependency
> of Zettlr). We do not want users to start complaining that some Zettlr version
> has non-functioning exports or imports.
> **Failure to comply with these added requirements will result in our immediate termination of the implicit consent for you to distribute modified Zettlr versions.**
> Thus, you will forfeit your allowance to distribute Zettlr indefinitely. In
> short: Only use this build flag if you know *exactly* what you're doing. Then,
> all is good.

### Directory Structure

Zettlr is a mature app that has amassed hundreds of directories over the course
of its development. Since it is hard to contribute to an application without any
guidance, we have compiled a short description of the directories with how they
interrelate.

<!-- File tree generated with `tree -d -L 4 -I node_modules .` in root -->

```
.
├── out                                   # Contains packaged apps (without the installer)
├── release                               # Contains packaged apps with the installer
├── resources                             # Resources for the app
│   ├── icons                             # Icons for the app in various sizes
│   ├── liquid-glass                      # The macOS Liquid Glass icon
│   ├── NSIS                              # NSIS installer pictures
│   ├── screenshots                       # The screenshots you can see in this file
├── scripts                               # Various scripts; should be called via `yarn`
├── source                                # Contains all source files
│   ├── app                               # Main process code
│   │   └── service-providers             # Service providers (singletons)
│   │       ├── appearance                # Appearance-related functionality
│   │       ├── assets                    # Assets (export profiles, custom CSS, etc.)
│   │       ├── citeproc                  # Citation management
│   │       ├── commands                  # Various commands that the user can execute
│   │       ├── config                    # The main configuration
│   │       ├── css                       # Custom CSS provider
│   │       ├── dictionary                # Hunspell provider
│   │       ├── documents                 # Main document editing hub
│   │       ├── fsal                      # File-System Abstraction Layer
│   │       ├── links                     # Zettelkasten-Link and interlinking management
│   │       ├── log                       # Logging
│   │       ├── long-running-tasks        # Long-Running Task indication management
│   │       ├── menu                      # Application menus
│   │       ├── recent-docs               # Recent documents
│   │       ├── search                    # Full-text search
│   │       ├── stats                     # Writing statistics
│   │       ├── tags                      # Tagging management
│   │       ├── targets                   # Writing targets
│   │       ├── tray                      # Tray icon management
│   │       ├── updates                   # Checks for updates
│   │       └── windows                   # Manages all application windows
│   ├── common                            # Shared modules
│   │   ├── modules                       # Various renderer modules
│   │   │   ├── markdown-editor           # The primary Markdown editor
│   │   │   ├── markdown-utils            # Markdown converters and AST
│   │   │   ├── persistent-data-container # Data structure used in the main process
│   │   │   ├── preload                   # Shared renderer process hooks
│   │   │   ├── trusted-types             # Trusted Types
│   │   │   └── window-register           # Shared initialization function for the SPAs
│   │   ├── pandoc-util                   # Various utilities for running Pandoc
│   │   ├── util                          # Utility functions
│   │   └── vue                           # Shared Vue components
│   │       ├── form                      # Form builder
│   │       ├── iris-indicator-utils      # Shader code for the Iris Indicator
│   │       └── window                    # Window Chrome
│   ├── pinia                             # SPA State management
│   ├── types                             # Shared types (deprecated)
│   ├── win-about                         # "About" window
│   ├── win-assets                        # Assets manager
│   ├── win-error                         # Custom error modal
│   ├── win-log-viewer                    # Log viewer
│   ├── win-main                          # Primary application window
│   ├── win-onboarding                    # Onboarding dialog
│   ├── win-paste-image                   # Paste-image modal
│   ├── win-preferences                   # Settings window
│   ├── win-print                         # Print preview
│   ├── win-project-properties            # Project properties dialog
│   ├── win-splash-screen                 # Splash screen
│   ├── win-stats                         # Statistics window with graph view
│   ├── win-tag-manager                   # Tag manager
│   └── win-update                        # Update dialog
├── static                                # Static files that are included in the application during build
│   ├── csl-locales                       # CSL translations
│   ├── csl-styles                        # CSL styles
│   ├── defaults                          # export profiles
│   ├── dict                              # A selection of hunspell dictionaries
│   ├── fonts                             # Fonts
│   ├── lang                              # App translations
│   ├── lua-filter                        # Lua filters for exports
│   └── tutorial                          # Tutorial files, sorted by language
└── test                                  # Unit tests
```

## Command-Line Switches

Both during development and for release builds, the Zettlr binary features a few
command line switches that you can make use of for different purposes.

#### `--launch-minimized`

This CLI flag will instruct Zettlr not to show the main window on start. This is
useful to create autostart entries. In that case, launching Zettlr with this
flag at system boot will make sure that you will only see its icon in the tray.

Since this implies the need to have the app running in the tray bar or
notification area when starting the app like this, it will automatically set the
corresponding setting `system.leaveAppRunning` to true.

> [!NOTE]
> This flag will not have any effect on Linux systems which do not support
> displaying an icon in a tray bar or notification area.

#### `--clear-cache`

This will direct the File System Abstraction Layer to fully clear its cache on
boot. This can be used to mitigate issues regarding changes in the code base. To
ensure compatibility with any changes to the information stored in the cache,
the cache is also automatically cleared when the version field in your
`config.json` does not match the one in the `package.json`, which means that, as
long as you do not explicitly set the `version`-field in your `test-config.yml`,
the cache will always be cleared on each run when you type `yarn start`.

> [!TIP]
> By selecting the appropriate item from the "Help" menu and restarting Zettlr,
> it will automatically start with this flag passed, meaning that it will clean
> the cache for non-technical users.

#### `--data-dir=path`

Use this switch to specify a custom data directory, which holds your
configuration files. Without this switch, the data directory defaults to
`%AppData%/Zettlr` (on Windows 10 and newer), `~/.config/Zettlr` (on Linux), or
`~/Library/Application Support/Zettlr` (on macOS). The path can be absolute or
relative. Basis for the relative path will be either the binary's directory
(when running a packaged app) or the repository root (when running an app that
is not packaged). Remember to escape spaces or quote the path, if necessary. The
`~` character to denote the home directory is not expanded in this case, so make
sure to pass the entire path to your home directory if necessary. Due to a minor
bug in Electron, an empty `Dictionaries` subdirectory is created in the default
data directory, but it does not impact functionality.

#### `--disable-hardware-acceleration`

This switch causes Zettlr to disable hardware acceleration, which could be
necessary in certain setups. For more information on why this flag was added,
see issue [#2127](https://github.com/Zettlr/Zettlr/issues/2127).

## VSCode Extension Recommendations

This repository makes use of Visual Studio Code's
[recommended extensions feature](https://go.microsoft.com/fwlink/?LinkId=827846).
This means: If you use VS Code and open the repository for the first time, VS
Code will tell you that the repository recommends to install a handful of
extensions. These extensions are recommended if you work with Zettlr and will
make contributing much easier. The recommendations are specified in the file
`.vscode/extensions.json`.

Since installing extensions is sometimes a matter of taste, we have added short
descriptions for each recommended extension within that file to explain why we
recommend it. This way you can make your own decision whether or not you want to
install any of these extensions (for example, the SVG extension is not necessary
if you do not work with the SVG files provided in the repository).

If you choose not to install all of the recommended extensions at once (which we
recommend), VS Code will show you the recommendations in the extensions sidebar
so you can first decide which of the ones you'd like to install and then
manually install those you'd like to have.

> [!TIP]
> Using the same extensions as the core developer team will make the code
> generally more consistent since you will have the same visual feedback.

## License

This software is licensed via the
[GNU GPL v3-License](https://www.gnu.org/licenses/gpl-3.0.en.html).

The brand (including name, icons and everything Zettlr can be identified with)
is excluded and all rights reserved. If you want to fork Zettlr to develop
another app, feel free but please change name and icons.
[Read about the logo usage](https://www.zettlr.com/press#usage-rights).
