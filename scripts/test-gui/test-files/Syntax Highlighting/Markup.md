# Markup Languages Syntax Highlighting

This file includes the markup file language syntax highlighting supported by Zettlr.

## HTML

```html
<!DOCTYPE html>
<title>Title</title>

<style>body {width: 500px;}</style>

<script type="application/javascript">
  function $init() {return true;}
</script>

<body>
  <p checked class="title" id='title'>Title</p>
  <!-- here goes the rest of the page -->
</body>
```

## XML

```xml
<!-- Jats4r example -->
<contrib-group>
  <contrib contrib-type="editor">
    <name>
       <surname>Robichaud</surname>
       <given-names>Monique</given-names>
     </name>
    <aff>Simon Fraser University</aff>
  </contrib>
</contrib-group>
<contrib-group>
  <contrib contrib-type="author">
    <name>
      <surname>Juretschko</surname>
      <given-names>Stefan</given-names>
    </name>
    <xref ref-type="aff" rid="aff1"><sup>a</sup></xref>
  </contrib>
  <aff id="aff1"><label>a</label>Northwell Health Laboratories, Pathology and
  Laboratory Medicine, Lake Success, New York, USA</aff>
</contrib-group>
```

## Markdown

```md
# hello world

you can write text [with links](http://example.com) inline or [link references][1].

* one _thing_ has *em*phasis
* two __things__ are **bold**

[1]: http://example.com

---

hello world
===========

<this_is inline="xml"></this_is>

> markdown is so cool

    so are code segments

1. one thing (yeah!)
2. two thing `i can write code`, and `more` wipee!
```

## LaTeX

```latex
\documentclass{article}
\usepackage[koi8-r]{inputenc}
\hoffset=0pt
\voffset=.3em
\tolerance=400
\newcommand{\eTiX}{\TeX}
\begin{document}
\section*{Highlight.js}
\begin{table}[c|c]
$\frac 12\, + \, \frac 1{x^3}\text{Hello \! world}$ & \textbf{Goodbye\~ world} \\\eTiX $ \pi=400 $
\end{table}
Ch\'erie, \c{c}a ne me pla\^\i t pas! % comment \b
G\"otterd\"ammerung~45\%=34.
$$
    \int\limits_{0}^{\pi}\frac{4}{x-7}=3
$$
\end{document}
```
