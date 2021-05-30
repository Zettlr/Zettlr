---
title: "Guide Pandoc et LaTeX"
author:
  - The Zettlr Team
  - Framatophe (trad.)
date: 2020-07-04
...

\pagenumbering{gobble}

# Installer Pandoc et LaTeX

Zettlr fonctionne au mieux avec Pandoc et LaTeX. Ces derniers sont libres et disponibles sur tous les systèmes d'exploitation. Nous vous recommandons de les installer dès que possible afin de pouvoir exporter tous vos fichiers et travailler avec vos collègues. Même après être passé au Markdown, vous aurez à traiter avec des documents Word et vous aurez besoin de partager vos réflexions avec des personnes qui n'utilisent pas le Markdown.

## Installer LaTeX

LaTeX peut être déployé avec un installateur standard sur toutes les plateformes. Les distributions recommandées sont :

* Windows: [MikTeX](https://miktex.org/download)
* macOS: [MacTex](https://www.tug.org/mactex/morepackages.html) (_Il suffit d'installer BasicTeX, beaucoup plus petit que la version complète!_)
* Linux: [TeX Live](https://www.tug.org/texlive/) (installez le paquet `texlive-base`. Vosu pourrez aussi avoir besoin du paquet `texlive-xetex`)

## Installer Pandoc

### Windows

Sous Windows, installer Pandoc revient simplement à [télécharger l'installateur depuis le site officiel](https://github.com/jgm/pandoc/releases/latest) et le lancer.

### macOS

Sous macOS, il est recommandé d'installer Pandoc en utilisant Homebrew. Homebrew est un outil très pratique pour le terminal et ne nécessite que deux lignes de code pour être installé. Jetez simplement [un coup d'oeil sur leur site officiel](https://brew.sh/) pour l'installer. Dès que cela est fait, lancez les commandes suivante pour obtenir Pandoc :

```bash
$ brew install pandoc
$ brew install pandoc-citeproc
```

`pandoc-citeproc` est le moteur dont vous avez besoin pour citer vos références avec Zettlr. (Il est automatiquement installé sur les autres systèmes d'exploitation ou si vous utilisez l'installateur de paquets.)

### GNU/Linux

Sous GNU/Linux, installing Pandoc is hilariously simple. Simply use your package manager to search for, and install Pandoc. The provided packages aren't always up-to-date, but they should fit. If you want to install the newest version, you'd have to [download the Linux installer](https://github.com/jgm/pandoc/releases/latest) and follow the [install instructions](https://pandoc.org/installing.html) on the Pandoc site.

Sous GNU/Linux, l'installation de Pandoc est d'une simplicité déconcertante. Il suffit d'utiliser votre gestionnaire de paquets pour rechercher et installer Pandoc. Les paquets fournis ne sont pas toujours à jour, mais ils devraient convenir. Si vous souhaitez installer la dernière version, vous devez [télécharger l'installateur GNU/Linux](https://github.com/jgm/pandoc/releases/latest) et suivre les [instructions d'installation](https://pandoc.org/installing.html) sur le site de Pandoc.


