---
title: "Pandoc and LaTeX Guide"
author:
  - The Zettlr Team
date: 2020-06-23
...

\pagenumbering{gobble}

# Installing Pandoc and LaTeX

Zettlr works best with Pandoc and LaTeX. Both are free to use and work on all operating systems. We recommend you install them as soon as possible in order to be able to export all your files and work better with your colleagues. Even after switching to Markdown, you will have to deal with Word-documents and need to share your thoughts with people who do not use Markdown.

## Installing LaTeX

LaTeX can be installed using a standard installer on all platforms. The recommended distributions are:

* Windows: [MikTeX](https://miktex.org/download)
* macOS: [MacTex](https://www.tug.org/mactex/morepackages.html) (_It suffices to install the Basic Tex, which is much smaller than the full version!_)
* Linux: [TeX Live](https://www.tug.org/texlive/) (install the `texlive-base` package. You may also need to install the `texlive-xetex`-package)

## Install Pandoc

### Windows

On Windows, installing Pandoc is as easy as [downloading the installer from the official website](https://github.com/jgm/pandoc/releases/latest) and running it.

### macOS

On macOS, it is recommended to install Pandoc using Homebrew. Homebrew is a useful tool for the terminal that requires two lines of code to install. Just [head over to their official website](https://brew.sh/) to install it. Once you’ve done this, run the following command to get Pandoc:

```bash
$ brew install pandoc
$ brew install pandoc-citeproc
```

`pandoc-citeproc` is the engine that you need to cite your references with Zettlr. (It is automatically installed on other operating systems, or if you use the package installer.)

### Linux

On Linux, installing Pandoc is hilariously simple. Simply use your package manager to search for, and install Pandoc. The provided packages aren't always up-to-date, but they should fit. If you want to install the newest version, you'd have to [download the Linux installer](https://github.com/jgm/pandoc/releases/latest) and follow the [install instructions](https://pandoc.org/installing.html) on the Pandoc site.