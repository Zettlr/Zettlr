---
title: "Welcome to Zettlr!"
keywords:
  - Guide
  - Tutorial
  - Introduction
...

# Bienvenue sur Zettlr !

 ![zettlr.png](./zettlr.png)


Bonjour, et merci d'avoir choisi Zettlr ! 🎉 Nous avons préparé ce petit tutoriel interactif sur Zettlr afin que vous puissiez vous plonger dans l'utilisation de l'application sans avoir à éplucher toute la documentation. Néanmoins, Zettlr est capable de bien davantage que ce qui est décrit dans cette courte introduction, c'est pourquoi nous vous recommandons vivement de consulter [🔗 la documentation complète](https://docs.zettlr.com/) (maintenez la touche `Cmd` ou `Ctrl` enfoncée pour ouvrir le lien), qui est disponible dans de nombreuses langues, afin de vous aider à naviguer dans le vaste ensemble de fonctionnalités. Vous pouvez toujours ouvrir la documentation en ligne en appuyant sur la touche `F1` ou en sélectionnant l'élément de menu correspondant dans le menu Aide.

Mais, maintenant : Allons-y !

> Dans ce tutoriel, vous verrez des liens web que vous pouvez suivre. Par défaut, cliquer sur un lien est interprété comme « Je veux modifier ce lien ». Si vous voulez l'ouvrir, maintenez enfoncée la touche `Cmd` (si vous utilisez MacOS), ou la touche `Ctrl`, tout en cliquant sur le lien ! Chaque fois que vous tombez sur `Cmd/Ctrl`, cela veut dire « Utilisez `Cmd` si vous êtes sous macOS, ou `Ctrl` dans les autres cas ».

## À propos de ce tutoriel 🎬

Tout d'abord, vous vous demandez peut-être en quoi consiste ce tutoriel. Certaines applications Markdown utilisent un tel tutoriel interactif en guise de guide pratique pour l'utilisateur. Dans le cas de Zettlr, nous avons créé un petit répertoire dans vos documents, appelé « Zettlr Tutorial » et l'avons chargé pour vous. Pour l'instant, vous voyez le contenu de ce répertoire dans la barre latérale gauche (appelée « liste de fichiers »), alors jetons d'abord un coup d'œil à l'arborescence des fichiers ! Si vous déplacez votre curseur dans la partie supérieure de la barre latérale gauche de Zettlr, une flèche entourée d'un cercle apparaîtra. Cliquez dessus maintenant.

Ce que vous constaterez, c'est qu'un répertoire — le tutoriel — est chargé. Vous pouvez cliquer avec le bouton droit de la souris sur ce répertoire, et le « fermer » ou le « supprimer ». Lorsque vous _fermez_ un répertoire racine ou un fichier dans Zettlr, cela signifie que vous le retirez de l'application, mais il restera sur votre ordinateur. Si vous le _supprimez_, cela signifie que Zettlr le déplacera dans la corbeille. Mais ne faites pas cela maintenant, car il y a encore de nouvelles choses à apprendre ! ✍🏼

> Remarque : sur certaines distributions Linux, cela peut ne pas fonctionner directement, car Zettlr dépend d'un paquet commun pour déplacer les fichiers dans la corbeille. Si vous rencontrez des problèmes pour supprimer des fichiers et des dossiers, veuillez [consulter notre FAQ] (https://docs.zettlr.com/fr/faq/#jutilise-linux-et-la-suppression-de-fichiers-ne-les-met-pas-a-la-corbeille) pour vous en sortir !


Zettlr est une application destinée à fonctionner en ayant toujours chargé au moins un répertoire racine où sont stockés vos fichiers Markdown. Imaginez ces répertoires racine comme des "espaces de travail". Ils sont toujours affichés dans l'arborescence des répertoires qui est visible en ce moment. Pour afficher la liste des fichiers d'un répertoire, il suffit de cliquer sur ce répertoire.

> Notez que pour lister les fichiers, il existe trois modes que vous pouvez choisir dans les préférences. L'un affiche _soit_ l'arborescence _soit_ la liste des fichiers  (par défaut), un autre affiche les deux en même temps et le troisième mode affiche de manière combinée les fichiers et les dossiers dans l'arborescence.

Cliquez maintenant sur « Zettlr Tutorial » pour revenir à sa liste de fichiers.

## How to use Markdown 📝

Zettlr is a Markdown editor, which means that it mostly works like apps you already know, such as Microsoft Word, LibreOffice, or OpenOffice. But instead of having to click through an armada of toolbar buttons, you can apply structure to your elements using only characters, which means you never have to leave your keyboard! How cool is that?! ✨

Let’s quickly go over the most important elements:

1. You can make text **bold** and _italic_ by surrounding it with either underscores or asterisks. Which one you choose is completely up to you. One single character makes text italic, two makes it bold and — you guessed it — three make it both __*bold and italic*__!
2. Headings are created almost like hashtags — simply write a `#`-character followed by a space. You can use up to six `######`-characters to create headings from level one through six.
3. Lists are created literally — simply write `*`, `-`, or `+` on a new line. Numbered lists consist of a number followed by a dot.
4. Finally, blockquotes are written exactly as quoted text is displayed in e-mails: Simply demarcate them using `>`!

Of course, there are a lot of other elements. Footnotes for instance — hover over this one with your cursor.[^1] During this tutorial, you will also learn about some special elements that Zettlr uses to enable truly academic work, as well as knowledge management using a Zettelkasten!

## Links ⛓

While they are not used very often in academic texts, links are a powerful tool of Markdown, which Zettlr takes to the next level. Zettlr acts really cleverly when it comes to links. Let’s quickly create one! Select the following link to our Twitter account, and copy it to the clipboard: https://www.twitter.com/Zettlr

Now, select the words “link to our Twitter account” and hit `Cmd/Ctrl+K`! Zettlr sees that you have a valid weblink in your clipboard and automatically uses this as the link target. Furthermore, if you move the text cursor away from the link, Zettlr will automatically hide the link target and only display the linked text in order to make it easier to read through your text. If you don’t like some of the many elements that Zettlr renders by default, you can turn them off one by one in the “Display” preferences.

But Zettlr doesn’t only support common weblinks. If you link to a file that is somewhere on your computer, Zettlr can even open any file if you click on such a link! In general, just remember that Zettlr aims to make your writing experience as frictionless as possible, not just when it comes to links!

## The Sidebar 📎

Now that we got you covered with the Markdown basics, it’s time to show you some more of the stuff Zettlr can do! Click now on the paper clip icon in the top right corner of the toolbar. This will open the sidebar, which contains a section “Attachments.” In there Zettlr shows you all non-Markdown files that you store in the currently selected directory. You can also drag and drop files from there onto the editor to include them in your files.

You can also see the file “Pandoc and LaTeX Guide.pdf”. Wondering what it is? Let’s have a look: Click on it to open the file with your default PDF viewer now!

## Interactive Elements ⏯

By now, you’ve already learned a lot about Zettlr. Can you check all the checkboxes?

- [ ] Working with files and directories
- [ ] Learned basic Markdown
- [ ] Installed Pandoc and LaTeX for exporting my files

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

[^1]: This text rests at the bottom of this file. But you can really put them anywhere you want. You know what the best thing is? If you click on this footnote while holding down `Cmd/Ctrl`, you can edit its text in place! Try that now and save your changes by pressing `Shift+Enter`. If you want to cancel your edits, simply click outside the popup!
