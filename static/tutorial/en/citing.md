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

In this final guide, we will dive into how you can automatically cite using Zettlr! If you have been using the Zotero plugin for Word before (or even the Citavi plugin), rest assured: It works almost the same, but you have much more freedom to adapt the citations to your needs.

To begin citing with Zettlr, you’ll need to set up a references database, [which we describe in our documentation](https://docs.zettlr.com/en/core/citations/). For the purposes of this tutorial, we have already prepared a small database which’ll cover everything you need to know. Let’s load it! In the tutorial directory, there is a small file called “references.json”. It contains some references that Zettlr can cite. To load it, first head over into the preferences and into the tab “Citations”. Once there, navigate to the file using the file browser of the references database-field.

## Your First Citation 🎓

Zettlr will immediately load the file and you’re able to cite. Let’s have a look at the following blockquote, which certainly needs a citation:

> Es findet hier also ein Widerstreit statt, Recht wider Recht, beide gleichmäßig durch das Gesetz des Warenaustauschs besiegelt. **Zwischen gleichen Rechten entscheidet die Gewalt.** Und so stellt sich in der Geschichte der kapitalistischen Produktion die Normierung des Arbeitstags als Kampf um die Schranken des Arbeitstags dar — ein Kampf zwischen dem Gesamtkapitalisten, d.h. der Klasse der Kapitalisten, und dem Gesamtarbeiter, oder der Arbeiterklasse.

This is the famous “between equal rights, force decides”-quote from Karl Marx in his _Capital_, volume 1. Let’s now add this citation. To do so, simply type an `@` symbol where you want to add a citation. There are three ways to form citations:

* Citing with the author's name in-text: `@CiteKey`, which will become `Author (Year)`
* Citing with the author's name in-text and an additional locator: `@CiteKey [p. 123]`, which will become `Author (Year, p. 123)`
* A "full" citation: `[@Citekey, p. 123]`, which will become `(Author Year, p. 123)`

Getting back to our citation, which still needs its reference, can you manage to add a citation behind the blockquote that renders as `(Marx 1962, 23: 249)`?

> You can choose how Zettlr autocompletes your citation depending on your needs. If you regularly cite using footnotes, choosing the square-bracket citation should be your default. If you frequently name the author's surname in the text, the simple citekey-autocompletion works well. If you additionally need page numbers or other information, the citekey-autocompletion `@CiteKey []` works well. If you use a footnote citation style, it will put everything that is rendered in braces into a footnote — so while using `@CiteKey` only the citation will be placed in a footnote, whereas the author's surname will remain within the text.

At the core of Zettlr, there is a mighty engine that is capable of untangling what you write and extract common sections such as pages (`p.` and `pp.`), chapters (`chapter`) and sections (`sec.` or `§`), even in multiple languages!

## The References List 💻

As soon as you write longer papers and even books, you may lose oversight over what you’ve already quoted, and which things still need to find their way into your paper. Zettlr is capable of displaying the full list of your references in the sidebar. Open it now by clicking the sidebar icon again, and have a look at the “References”-section. After saving the file, you will notice that the book is visible there — and as you continue to include references, this list will grow!

> If you export a file using Zettlr, it will automatically add a list of references below the file's contents. You can prevent it from doing so using a [YAML frontmatter](https://docs.zettlr.com/en/advanced/yaml-frontmatter/). Just add the property `suppress-bibliography: true`. You can also [customize this list of references](https://docs.zettlr.com/en/core/citations/#customizing-the-list-of-references).

## Final Thoughts 🔥

This concludes our short introduction to Zettlr. You’re good to go!

One last thing we’d like to mention is the great Zettlr community. We could never maintain such a great tool without the help of dozens of highly motivated people who welcome new people, help with questions and suggest changes to the app itself. Please consider joining the community on as many platforms as possible and make your voice heard! One thing you can certainly estimate is whether or not this tutorial that you just completed is good or needs some changes. If you have improvement suggestions, we are always happy to hear you out!

You can join our community over here:

- [On Discord](https://discord.gg/PcfS3DM9Xj)
- [On our subreddit](https://www.reddit.com/r/Zettlr/)
- [On GitHub](https://github.com/Zettlr/Zettlr/)

Finally, if you want to, you can also support Zettlr on [Patreon](https://www.patreon.com/zettlr) or via [PayPal](https://www.paypal.me/hendrikerz)!

But now we're done with this little introduction: **Enjoy working with Zettlr!**

![zettlr.png](./zettlr.png)
