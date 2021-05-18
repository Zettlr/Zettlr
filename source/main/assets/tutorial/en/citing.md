---
title: "Citing with Zettlr"
keywords:
  - Zotero
  - JabRef
  - CSL JSON
  - BibTex
  - Reference Management
...

# Citing with Zettlr 💬

In this final guide, we will dive into how you can automatically cite using Zettlr! If you have been using the Zotero plugin for Word before (or even the Citavi plugin), rest assured: It works almost the same, you only have much more freedom to adapt the citations to your needs!

To begin citing with Zettlr, you’ll need to set up a references database, [which we describe in our documentation](https://docs.zettlr.com/en/academic/citations/). For the purposes of this tutorial, we have already prepared a small database which’ll cover everything you need to know! Let’s load it! In the tutorial directory, there is a small file called “references.json”. It contains some references that Zettlr can cite. To load it, first head over into the preferences and into the tab “Export.” Once there, navigate to the file using the file browser of the references database-field, and save the preferences.

## Your First Citation 🎓

Zettlr will immediately load the file and you’re able to cite. Let’s have a look at the following blockquote, which certainly needs a citation:

> Es findet hier also ein Widerstreit statt, Recht wider Recht, beide gleichmäßig durch das Gesetz des Warenaustauschs besiegelt. **Zwischen gleichen Rechten entscheidet die Gewalt.** Und so stellt sich in der Geschichte der kapitalistischen Produktion die Normierung des Arbeitstags als Kampf um die Schranken des Arbeitstags dar — ein Kampf zwischen dem Gesamtkapitalisten, d.h. der Klasse der Kapitalisten, und dem Gesamtarbeiter, oder der Arbeiterklasse.

This is the famous “between equal rights, force decides”-quote from Karl Marx in his _Capital_, volume 1. Let’s now add this citation. To cite, you need to encapsulate your citation in square brackets and include a citation-key as well as optional prefixes and suffixes. The minimal form of a citation hence is `[@CiteKey]`, and the maximal form is `[Prefix @CiteKey, Locator Suffix]`. To indicate page numbers, sections, chapters, etc., place them directly after the citation-key, e.g.: `[@CiteKey, pp. 23-56]`. At the core of Zettlr, there is a mighty engine that is capable of untangling what you write and extract common sections such as pages (`p.` and `pp.`), chapters (`chapter`) and sections (`sec.` or `§`), even in multiple languages!

Getting back to our citation, which still needs its reference, can you manage to add a citation behind the blockquote that renders as `(Marx 1962, 23: 249)`?

## The References List 💻

As soon as you write longer papers and even books, you may lose oversight over what you’ve already quoted, and which things still need to find their way into your paper. Zettlr is capable of displaying the full list of your references in the sidebar. Open it now by clicking the paper clip icon again, and have a look at the “References”-section. You will notice that the book is visible there — and as you continue to include references, this list will grow!

In order to export these files, make sure to also have `pandoc-citeproc` installed, which is a small extra-program for Pandoc that can parse such citations during export.

> Note that from Pandoc version 2.11 on, citeproc comes bundled with Pandoc, so you don't need to install it in an extra step.

## Final Thoughts 🔥

This concludes our short introduction to Zettlr. You’re good to go!

One last thing we’d like to mention is the great Zettlr community. We could never maintain such a great tool without the help of dozens of highly motivated people who welcome new people, help with questions and suggest changes to the app itself. Please consider joining the community on as many platforms as possible and make your voice heard! One thing you can certainly estimate is whether or not this tutorial that you just completed is good or needs some changes. If you have improvement suggestions, we are always happy to hear you out!

You can join our community over here:

- [On the forum](https://forum.zettlr.com/)
- [On our subreddit](https://www.reddit.com/r/Zettlr/)
- [On GitHub](https://github.com/Zettlr/Zettlr/)

**Enjoy working with Zettlr!**

![zettlr.png](./zettlr.png)
