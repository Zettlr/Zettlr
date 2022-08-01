---
title: "Les références avec Zettlr"
author:
  - The Zettlr Team
  - Framatophe (trad.)
date: 2020-07-04
keywords:
  - Zotero
  - JabRef
  - CSL JSON
  - BibTex
  - Reference Management
...

# Les références avec Zettlr 💬

Dans ce dernier guide, nous nous plongerons dans l'art de citer des références automatiquement en utilisant Zettlr ! Si vous avez déjà utilisé le plugin Zotero pour Word (ou même le plugin Citavi), rassurez-vous : cela fonctionne presque de la même manière, vous avez simplement beaucoup plus de liberté pour adapter les références à vos besoins !

Pour commencer à citer avec Zettlr, vous devrez mettre en place une base de données de références, [que nous décrivons dans notre documentation](https://docs.zettlr.com/fr/academic/citations/). Pour les besoins de ce tutoriel, nous avons déjà préparé une petite base de données qui couvrira tout ce dont vous avez besoin de savoir ! Chargeons-la ! Dans le répertoire du tutoriel, il y a un petit fichier appelé "references.json". Il contient quelques références que Zettlr peut citer. Pour le charger, allez d'abord dans les préférences et dans l'onglet « Citations ». Une fois là, naviguez vers le fichier en utilisant le navigateur de fichiers du champ « Fichier de références bibliographqiues », et enregistrez les préférences.

## Votre première référence 🎓

Zettlr chargera immédiatement le fichier et vous pourrez utiliser les références bibliographiques. Examinons la citation suivante, qui a certainement besoin d'être référencée :

> Il y a donc ici une antinomie, droit contre droit, tous deux portent le sceau de la loi qui règle l'échange des marchandises. **Entre deux droits égaux qui décide ? La Force.** Voilà pourquoi la réglementation de la journée de travail se présente dans l'histoire de la production capitaliste comme une lutte séculaire pour les limites de la journée de travail, lutte entre le capitaliste, c'est-à-dire la classe capitaliste, et le travailleur, c'est-à-dire la classe ouvrière.

C'est la fameuse citation de Karl Marx « entre deux droits égaux, la force décide » tirée de son _Capital_, volume 1. Ajoutons maintenant cette référence. Pour ce faire, vous devez mettre votre référence entre crochets et inclure une clé de référencement. La forme minimale d'une référence est donc `[@CiteKey]`, et la forme maximale est `[Préfixe @CiteKey, Suffixe du repère]`. Pour indiquer des numéros de page, des sections, des chapitres, etc., placez-les directement après la clé de citation, par exemple `[@CiteKey, pp. 23-56]`. Au coeur de Zettlr, il y a un puissant moteur qui est capable de démêler ce que vous écrivez et d'extraire des sections communes telles que des pages (`p.` et `pp.`), des chapitres (`chapter`) et des sections (`sec.` ou `§`), et même en plusieurs langues !

Pour en revenir à notre citation, qui a encore besoin de sa référence, pouvez-vous parvenir à ajouter une référence derrière la citation qui se traduit par `(Marx 1971, 23 : 249)` ?


## Les listes de références bibliographiques 💻

Dès lors que vous écrivez des articles longs ou même des livres, vous risquez d'oublier ce que vous avez déjà cité et ce qui doit encore l'être. Zettlr est capable d'afficher la liste complète de vos références dans la barre latérale. Ouvrez-la maintenant en cliquant à nouveau sur l'icône du trombone, et jetez un coup d'œil à la section « Références ». Vous remarquerez que le livre y est visible — et au fur et à mesure que vous continuerez à inclure des références, cette liste s'allongera !

Afin d'exporter ces fichiers, assurez-vous d'avoir également installé `Pandoc-citeproc`, qui est un petit programme supplémentaire pour Pandoc qui peut interpréter de telles citations lors de l'export.

## Réflexions finales 🔥

Ceci conclut notre brève introduction à Zettlr. Vous êtes prêt-e !

Une dernière chose que nous aimerions mentionner est la grande communauté de Zettlr. Nous ne pourrions jamais maintenir un outil aussi formidable sans l'aide de dizaines de personnes très motivées, qui accueillent les nouveaux venus, répondent aux questions et suggèrent des changements à l'application elle-même. Pensez à rejoindre la communauté sur autant de plateformes que possible et faites-vous entendre ! Une chose que vous pouvez certainement vérifier, c'est si ce tutoriel que vous venez de terminer est bon ou s'il nécessite quelques modifications. Si vous avez des suggestions d'amélioration, nous serons toujours ravis de vous écouter !

Vous pouvez rejoindre notre communauté ici :

- [Sur Discord](https://discord.gg/PcfS3DM9Xj)
- [Sur notre subreddit](https://www.reddit.com/r/Zettlr/)
- [Sur GitHub](https://github.com/Zettlr/Zettlr/)

**Nous vous souhaitons un agréable travail avec Zettlr !**

![zettlr.png](./zettlr.png)
