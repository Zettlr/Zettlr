---
title: "Anleitung: Pandoc und LaTeX"
author:
  - Das Zettlr-Team
date: 2020-10-27
...

\pagenumbering{gobble}
\hypersetup{
linkcolor=[rgb]{0.00,0.00,1.00},
urlcolor=[rgb]{0.00,0.00,1.00},
}

# Pandoc und LaTeX installieren

Zettlr arbeitet am besten mit Pandoc und LaTeX zusammen. Es handelt sich dabei um kostenfreie Programme für alle Betriebssysteme. Ohne diese Programme sind die Fähigkeiten von Zettlr zum Export stark eingeschränkt, da es Pandoc und LaTeX zum Export benötigt.

> Die Datei, welche du gerade ansiehst, wurde mit Zettlr geschrieben und mit Pandoc und LaTeX exportiert!

## LaTeX installieren

LaTeX kann ganz einfach mittels eines Installationsprogramms installiert werden. Die von uns empfohlenen Versionen für die einzelnen Plattformen sind:

* Windows: [MikTeX](https://miktex.org/download)
* macOS: [MacTex](https://www.tug.org/mactex/morepackages.html) (_Es genügt hier, Basic Tex zu installieren, anstelle der „großen“ Version!_)
* Linux: [TeX Live](https://www.tug.org/texlive/) (auf vielen Systemen kannst du das `texlive-base`-Paket installieren. Ggfs. benötigst du auch noch das `texlive-xetex`-Paket.)

## Pandoc installieren

### Windows

Auf Windows genügt es, [die entsprechende Installationsdatei](https://github.com/jgm/pandoc/releases/latest) herunterzuladen und zu installieren.

### macOS

Auf macOS wird empfohlen, Pandoc mithilfe von [Homebrew](https://brew.sh/) zu installieren. Homebrew ist ein Paketmanager, der es auch einfach macht, Pandoc aktuell zu halten. Alternativ kannst du aber auch [für macOS eine Installationsdatei](https://github.com/jgm/pandoc/releases/latest) herunterladen.

Wenn du Homebrew installiert hast, kannst du Pandoc installieren, indem du die folgenden Befehle ausführst:

```bash
$ brew install pandoc
$ brew install pandoc-citeproc
```

> `pandoc-citeproc` musst du nur separat installieren, wenn deine Pandoc-Version kleiner als 2.11 ist. Auf anderen Plattformen wird Citeproc in jedem Fall automatisch mit installiert.

### Linux

Auf Linux kannst du meist einfach den Systemeigenen Paket-Manager zur Installation von Pandoc nutzen. Aber auch hier kannst du [eine entsprechende Installationdatei](https://github.com/jgm/pandoc/releases/latest) herunterladen.

> Achtung: In manchen Datenbanken werden noch ältere Pandoc-Versionen angeboten. Zettlr benötigt mindestens Pandoc 2.0!
