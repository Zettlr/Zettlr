---
title: "Bienvenue sur Zettlr !"
author:
  - The Zettlr Team
  - Framatophe (trad.)
date: 2020-07-04
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

> Remarque : sur certaines distributions Linux, cela peut ne pas fonctionner directement, car Zettlr dépend d'un paquet commun pour déplacer les fichiers dans la corbeille. Si vous rencontrez des problèmes pour supprimer des fichiers et des dossiers, veuillez [consulter notre FAQ](https://docs.zettlr.com/fr/faq/#jutilise-linux-et-la-suppression-de-fichiers-ne-les-met-pas-a-la-corbeille) pour vous en sortir !


Zettlr est une application destinée à fonctionner en ayant toujours chargé au moins un répertoire racine où sont stockés vos fichiers Markdown. Imaginez ces répertoires racine comme des "espaces de travail". Ils sont toujours affichés dans l'arborescence des répertoires qui est visible en ce moment. Pour afficher la liste des fichiers d'un répertoire, il suffit de cliquer sur ce répertoire.

> Notez que pour lister les fichiers, il existe trois modes que vous pouvez choisir dans les préférences. L'un affiche _soit_ l'arborescence _soit_ la liste des fichiers  (par défaut), un autre affiche les deux en même temps et le troisième mode affiche de manière combinée les fichiers et les dossiers dans l'arborescence.

Cliquez maintenant sur « Zettlr Tutorial » pour revenir à sa liste de fichiers.

## Comment utiliser le Markdown 📝

Zettlr est un éditeur Markdown, ce qui signifie qu'il fonctionne pour l'essentiel 

Zettlr est un éditeur Markdown, ce qui signifie qu'il fonctionne principalement comme des applications que vous connaissez déjà, comme Microsoft Word, LibreOffice ou OpenOffice. Mais au lieu de devoir cliquer sur une armada de boutons dans la barre d'outils, vous pouvez structurer vos éléments en utilisant uniquement des caractères, ce qui implique que vous n'avez jamais à quitter votre clavier ! C'est trop cool ! ✨

Passons rapidement en revue les aspects les plus importants :

1. Vous pouvez mettre le texte en **gras** et _italique_ en l'entourant de traits de soulignement ou d'astérisques. Le choix de l'astérisque ou du soulignement dépend entièrement de vous. Un seul caractère rend le texte en italique, deux le rendent gras et — vous l'avez deviné — trois le rendent à la fois ***gras et italique*** !
2. Les titres sont créés à la manière des hashtags —  il suffit d'écrire un croisillon « # » suivi d'une espace. Vous pouvez utiliser jusqu'à six croisillons « ### » pour créer des titres de niveau 1 à 6.
3. Les listes sont littéralement composées — il suffit d'écrire « * », « - » ou « + » sur une nouvelle ligne. Les listes numérotées sont constituées d'un nombre suivi d'un point.
4. Enfin, les blocs de citations sont écrits exactement comme on affiche le texte cité dans les courriels : il suffit de les distinguer en utilisant « > » !

Bien sûr, il y a beaucoup d'autres éléments. Les notes de bas de page par exemple — survolez celui-ci avec votre curseur[^1]. Au cours de ce tutoriel, vous apprendrez également certains éléments spéciaux que Zettlr utilise pour permettre un travail véritablement académique, ainsi que la gestion des connaissances à l'aide des Zettelkästen !

## Liens ⛓

Bien qu'ils ne soient pas très souvent utilisés dans les textes académiques, les liens constituent un outil puissant de Markdown, et Zettlr les fait passer au niveau supérieur. Zettlr agit de manière très intelligente en ce qui concerne les liens. Rapidement, créons-en un ! Sélectionnez le lien suivant vers notre compte Twitter, et copiez-le dans le presse-papiers : https://www.twitter.com/Zettlr

Maintenant, sélectionnez les mots « lien vers notre compte Twitter » et cliquez sur `Cmd/Ctrl+K` ! Zettlr voit que vous avez un lien internet valide dans votre presse-papiers et l'utilise automatiquement comme cible du lien. De plus, si vous éloignez le curseur du texte du lien, Zettlr masquera automatiquement la cible du lien et n'affichera que le texte lié afin de faciliter la lecture de votre texte. Si vous n'aimez pas certains des nombreux éléments que Zettlr interprète par défaut, vous pouvez les désactiver un par un dans les préférences « Affichage ».

Mais Zettlr ne prend pas seulement en charge les liens internet courants. Si vous vous liez un fichier qui se trouve quelque part sur votre ordinateur, Zettlr peut même ouvrir n'importe quel fichier si vous cliquez sur un tel lien ! En résumé, rappelez-vous que Zettlr vise à rendre votre expérience d'écriture aussi fluide que possible, et pas seulement en ce qui concerne les liens !

## La barre latérale 📎

Maintenant que nous vous avons présenté les bases du Markdown, il est temps de vous montrer d'autres trucs que Zettlr peut faire ! Cliquez maintenant sur l'icône du trombone dans le coin supérieur droit de la barre d'outils. Cela ouvrira la barre latérale, qui contient une section « Annexes ». Zettlr vous y montre tous les fichiers non Markdown que vous stockez dans le répertoire sélectionné. Vous pouvez aussi glisser et déposer des fichiers à partir de là vers l'éditeur pour les inclure dans vos documents.

En outre, vous pouvez voir le fichier « Pandoc and LaTeX Guide.pdf ». Vous vous demandez ce que c'est ? Voyons voir : maintenant, cliquez dessus pour ouvrir le fichier avec votre visionneuse PDF par défaut !

## Éléments intéractifs ⏯

À présent, vous avez déjà appris beaucoup de choses sur Zettlr. Pouvez-vous cocher toutes les cases ?

- [ ] travailler avec des fichiers et des répertoires,
- [ ] apprendre les bases du Markdown,
- [ ] installer Pandoc et LaTeX pour exporter mes fichiers.

Certains éléments de l'éditeur sont interactifs, tout comme les cases à cocher. Une autre chose qui est très interactive, ce sont les tableaux. Il suffit de jeter un coup d'œil au tableau suivant : survolez-le avec votre souris pour voir apparaître quelques boutons qui vous permettent d'interagir avec !



| Fichier                          | Objet                                                                         | Nom de fichier  |
|----------------------------------|-------------------------------------------------------------------------------|-----------------|
| Bienvenue sur Zettlr !           | Donne un aperçu rapide des capacités de Zettlr                                | welcome.md      |
| Travailler avec les Zettelkästen | Introduction aux différentes caractéristiques des Zettelkästen dans Zettlr    | zettelkasten.md |
| Les références avec Zettlr       | Souligne les potentialités du travail avec des bases de données de références | references.md   |

You can align columns as well as add and remove both rows and columns in the table. The table editor will always work on the column or row that is currently active. So, to remove a certain row, make sure that one cell within that row is selected. Feel free to play around a little bit with the table to get used to how it works!

Dans le tableau, vous modifier l'alignement ou ajouter et supprimer des lignes et des colonnes. L'éditeur de tableau fonctionnera toujours sur la colonne ou la ligne active. Ainsi, pour supprimer une ligne, assurez-vous qu'une cellule de cette ligne est sélectionnée. N'hésitez pas à jouer un peu avec le tableau pour vous habituer à son maniement !

## Ressources complémentaires 📚

Vous y êtes arrivé ! La première partie de l'introduction est terminée. Nous n'avons pas abordé beaucoup de sujets ici, mais vous pouvez apprendre tout ce que vous voulez sur notre [documentation](https://docs.zettlr.com/) ! Ce qui pourrait vous intéresser, c'est [le puissant gestionnaire de balises](https://docs.zettlr.com/en/reference/settings/#manage-tags), ou les [options de recherche polyvalentes](https://docs.zettlr.com/en/core/search/).

Mais maintenant que les bases sont suffisantes, nous sommes prêts à faire le grand saut ! Passons maintenant au tutoriel des Zettelkästen ! Pour y aller, il suffit de cliquer sur le lien wiki suivant : [[zettelkasten]]

[^1]: Ce texte se trouve en bas de ce fichier. Mais, en fait, vous pouvez les mettre où vous voulez. Vous connaissez le meilleur ? Si vous cliquez sur cette note de bas de page tout en maintenant la touche `Cmd/Ctrl` enfoncée, vous pouvez éditer le texte de là ! Essayez maintenant et enregistrez vos modifications en appuyant sur `Maj+Entrée`. Si vous voulez annuler vos modifications, cliquez simplement en dehors de la fenêtre popup !

