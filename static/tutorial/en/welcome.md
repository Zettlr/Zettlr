---
title: "Welcome to Zettlr!"
keywords:
  - Guide
  - Tutorial
  - Introduction
...

# Welcome to Zettlr!

 ![zettlr.png](./zettlr.png)

Hello there, and thank you for choosing Zettlr! 🎉 We’ve compiled this little interactive tutorial to Zettlr so that you can dive right into using the app without having to skim through all of the docs. However, Zettlr is capable of much more than outlined in this short introduction, so we strongly recommend you also have a look at [🔗 the extensive documentation](https://docs.zettlr.com/) (hold down `Cmd` or `Ctrl` to open the link), which is available in many different languages, in order to help you navigate through the extensive feature set. You can always open the online documentation by pressing `F1` or selecting the corresponding menu item in the Help-menu.

But, now: Let’s go!

> In this tutorial, you will see weblinks that you can follow. By default, clicking on a link is interpreted as “I want to edit this link.” If you want to open it, hold down either your `Cmd`-key, if you use macOS, or the `Ctrl`-key otherwise while clicking on the link! Whenever you stumble upon `Cmd/Ctrl`, read this as “Use `Cmd` if you are on macOS, or `Ctrl` otherwise.”

## About this tutorial 🎬

First, you may wonder what this tutorial is. Several Markdown applications make use of such an interactive tutorial for a hands-on guide to using the application. In the case of Zettlr, we have created a small directory in your documents folder, named “Zettlr Tutorial” and loaded it for you. Right now, you see the contents of that directory in the left sidebar (called the “file manager”), so let us first have a look! If you move your cursor into the top area of the file manager, a round arrow will appear. Click that now.

What you will see is that there is one directory – the tutorial – loaded. These top-level directories are called workspaces, because they are spaces in which your work lives. You can right-click the directory, and either “close” or “delete” it. When you _close_ a workspace or top-level file in Zettlr, this means that you unload it from the application, but it will remain on your computer. If you _delete_ it, this means that Zettlr will move it into the trash bin. But don’t do that right now, as there are still new things to learn! ✍🏼

> Note: On some Linux distributions, this may not work out of the box, as Zettlr depends upon a common package for moving files into the trash. If you experience problems removing files and folders, please [check our FAQ section](https://docs.zettlr.com/en/faq/#im-using-linux-and-deleting-files-doesnt-move-them-to-the-trash), which has got you covered!

Zettlr is built around the concept of workspaces. So you will have the best experience having open at least one workspace directory at all times, and do all your work in that. The workspaces are loaded automatically everytime you open the app, and are always displayed in the directory tree that’s visible right now. To view the file list of a directory, simply click the directory.

> There are three display modes available for the file manager which you can choose in the preferences; one displays either the file list _or_ the directory tree (the default), another one displays both next to each other, and the third mode displays both files and folders interleaved.

Click on “Zettlr Tutorial” now to switch back to its file list.

## How to use Markdown 📝

Zettlr is a text editor, which means that it mostly works like apps you already know, such as Microsoft Word, LibreOffice, or Apple Pages. But instead of having to click through an armada of toolbar buttons, you can apply structure to your elements using only characters, which means you never have to leave your keyboard! How cool is that?! ✨

Let’s quickly go over the most important elements:

1. You can make text **bold** and _italic_ by surrounding it with either underscores or asterisks. Which one you choose is completely up to you. One single character makes text italic, two makes it bold and — you guessed it — three make it both __*bold and italic*__!
2. Headings are created almost like hashtags — simply write a `#`-character followed by a space. You can use up to six `######`-characters to create headings from level one through six.
3. Lists are created literally — simply write `*`, `-`, or `+` on a new line. Numbered lists consist of a number followed by a dot.
4. Finally, blockquotes are written exactly as quoted text is displayed in e-mails: Simply demarcate them using `>`.

Of course, there are a lot of other elements. Footnotes for instance — hover over this one with your cursor.[^1] During this tutorial, you will also learn about some special elements that Zettlr uses to enable truly academic work, as well as knowledge management using a Zettelkasten!

## Links ⛓

While they are not used very often in academic texts, links are a powerful tool of Markdown, which Zettlr takes to the next level. Zettlr acts really cleverly when it comes to links. Let’s quickly create one! Copy the following link to the clipboard: https://www.twitter.com/Zettlr

Now, select the words “link to our Twitter account” and hit `Cmd/Ctrl+K`! Zettlr sees that you have a valid weblink in your clipboard and automatically uses this as the link target. Furthermore, if you move the text cursor away from the link, Zettlr will automatically hide the link target and only display the linked text in order to make it easier to read through your text. If you don’t like some of the many elements that Zettlr renders by default, you can turn them off one by one in the “Display” preferences.

But Zettlr doesn’t only support common weblinks. If you link to a file that is somewhere on your computer, Zettlr can open it if you click on such a link. In general, just remember that Zettlr aims to make your writing experience as frictionless as possible, not just when it comes to links.

## The Sidebar 📎

Now that we got you covered with the Markdown basics, it’s time to show you some more of the stuff Zettlr can do! Click now on the column-like icon in the top right corner of the toolbar. This will open the sidebar, which contains four tabs.

The first tab displays a dynamically-generated table of contents. You can click the headings to jump to them in the text. The second tab contains a list of references (if you have any in your current document). This is meant as a powerful way for you to check what you have cited in the document.

> Note that the references are only formatted using the built-in citation style. When you export your document, Zettlr will take care to use the citation style you chose, if you set one in the “Export”-preferences.

The third tab contains related files, that is: files for which Zettlr thinks they are related to your current file. It does so by looking at the tags as well as the internal links (more on that later) which you use within all files. On top of this list will be files that link to the file you're currently viewing. Afterwards follow files that have tags in common with the current file. The more tags a file has in common with your current file, the higher up it will be in this list.

The last tab contains all non-markdown files that reside in your currently selected directory. You will see a file "LaTeX Guide.pdf". Wondering what it is? Let’s have a look: Click on it to open the file with your default PDF viewer now!

## Interactive Elements ⏯

By now, you’ve already learned a lot about Zettlr. Can you check all the checkboxes?

- [ ] Working with files and directories
- [ ] Learned basic Markdown
- [ ] Installed LaTeX for exporting my files

Some elements in the editor are interactive, just like the checkboxes. Tables are something else that are highly interactive. Just have a look at the following table: Hover over it with your mouse to see a few buttons appear that allow you to interact with the table!

| File                        | Purpose                                                          | Filename        |
|-----------------------------|------------------------------------------------------------------|-----------------|
| Welcome to Zettlr!          | Gives a basic overview over the abilities of Zettlr              | welcome.md      |
| Working with a Zettelkasten | Introduces the various Zettelkasten-features of Zettlr           | zettelkasten.md |
| Citing with Zettlr          | Highlights the capabilities of working with references databases | citing.md       |

You can align columns as well as add and remove both rows and columns in the table. The table editor will always work on the column or row that is currently active. So, to remove a certain row, make sure that one cell within that row is selected. Feel free to play around a little bit with the table to get used to how it works!

## Further Resources 📚

You made it! The first part of the introduction is over. We did not cover a lot here, but you can learn about anything on our [documentation](https://docs.zettlr.com/)! What you might be interested in, is [the powerful tag manager](https://docs.zettlr.com/en/reference/settings/#manage-tags), or the [versatile search options](https://docs.zettlr.com/en/core/search/).

But now enough basics, we are ready to take the full dive! Let’s head over to the Zettelkasten tutorial! To go there, simply `Cmd/Ctrl`-click the following wiki-link: [[zettelkasten]]

[^1]: This text lives at the bottom of this file. But you can really put them anywhere you want. You know what the best thing is? If you click on this footnote while holding down `Cmd/Ctrl`, you can edit its text in place! Try that now and save your changes by pressing `Shift+Enter`. If you want to cancel your edits, simply click outside the popup!
