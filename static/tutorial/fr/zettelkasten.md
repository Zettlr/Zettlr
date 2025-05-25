---
title: "Les Zettelkästen avec Zettlr"
author:
  - The Zettlr Team
  - Framatophe (trad.)
date: 2020-07-04
keywords:
  - Zettelkasten
  - Zettel
  - Knowledge Management
  - Niklas Luhmann
...

# Les Zettelkästen avec Zettlr 🗂

Re-bonjour ! Vous venez de cliquer sur ce que nous appelons un « lien interne »  cela ressemble beaucoup à des liens wiki mais en fait c'est une fonctionnalité qui aide Zettlr à reconnaître comment vous organisez vos connaissances. Voyons d'abord ce qui vient de se passer après que vous ayez cliqué sur ce lien.

Chaque fois que vous cliquez sur un lien interne, Zettlr fait deux choses : il lance une recherche globale sur le contenu du lien et essaie d'ouvrir le fichier correspondant. Comme vous pouvez le voir, la barre latérale de gauche ne vous montre plus les fichiers, et à la place elle vous montre les résultats de la recherche. De même, vous êtes en train de regarder ce fichier !

Pour passer au navigateur de fichier ou à la recherche globale, vous pouvez utiliser le commutateur à trois voies situé dans le coin supérieur gauche de la barre d'outils

> Dans les préférence Zettelkästen, vous pouvez personnaliser ce que doit faire Zettlr lorsque vous suivez un tel lien interne.

## Lier les fichiers 🗄

Il existe deux manières de faire des références croisées entre les fichiers dans votre Zettelkasten : soit en utilisant un ID, soit en utilisant le nom de fichier (sans extension). Ainsi, si vous avez un fichier appelé « zettelkasten.md », vous pouvez le lier en écrivant `[[zettelkasten]]`. Zettlr essaiera de trouver un fichier avec ce nom de fichier et l'ouvrira.

Mais que se passe-t-il si vous changez le nom du fichier ? Dans ce cas, il est évident que le lien ne fonctionnera plus ! Pour contourner cette limitation, vous pouvez utiliser des ID. Les ID sont simplement des chaînes de chiffres que vous pouvez utiliser pour identifier vos fichiers de manière unique. Vous pouvez ensuite les utiliser pour établir des liens entre vos fichiers. Créons-en un maintenant ! Placez le curseur derrière les deux points et appuyez sur `Cmd/Ctrl+L` :

Désormais, ce fichier a un identifiant que vous pouvez utiliser ! Essayez-le — retournez à l'onglet avec le guide « Bienvenue sur Zettlr ! », et tapez `[[` quelque part. Dans la fenêtre d'autocomplétion, choisissez ce fichier et confirmez votre sélection. Ensuite, `Cmd/Ctrl`, cliquez sur ce même lien pour revenir à ce fichier. Vous remarquerez que Zettlr a lancé une nouvelle recherche, mais surtout : vous pouvez voir les résultats de la recherche en surbrillance ! Ceci est utile pour les liens croisés Zettelkasten, mais sera bien sûr également utile lorsque vous ferez des recherches globales.

## Utiliser les mots-clés (tags) 🏷

Cela dit, faire des liens n'est pas le seul moyen de créer des relations entre les notes. Vous pouvez également utiliser des mots-clés pour cela. Les mots-clés fonctionnent exactement comme les hashtags sur Twitter, donc vous pouvez #créer #des hashtags #comme #vous #voulez ! En cliquant sur `Cmd/Ctrl`, vous lancerez également une recherche et mettrez en évidence tous les fichiers qui contiennent tel ou tel mot-clé.

Il y a aussi un nuage de mots-clés auquel vous pouvez accéder en cliquant sur l'icône « Mots-clés » dans la barre d'outils. Il énumérera tous vos mots-clés et indiquera le nombre de fichiers qui les utilisent. Vous pouvez filtrer et gérer vos tags à partir de là. Alors que les liens Zettelkasten créent des connexions « dures » entre les fichiers, les tags sont une sorte de connexion « floue » entre des contenus connexes et peuvent vous convenir davantage.

## Réflexions finales 💭

Nous ne passerons pas en revue toutes les méthodes de travail dans un Zettelkasten, car il existe de nombreux tutoriels qui vous aideront à démarrer. En voici une liste utile :

- [Une première introduction peut être trouvée dans notre documentation](https://docs.zettlr.com/fr/academic/zkn-method/)
- [Sur le concept du Zettelkasten, lire notre blog](https://zettlr.com/post/what-is-a-zettelkasten)
- [La page zettelkasten.de (en anglais) contient de nombreux articles sur les Zettelkästen](https://zettelkasten.de/)
- [Reddit dispose d'un subreddit consacré exclusivement à l'art du Zettelkasten](https://www.reddit.com/r/Zettelkasten)

Ces tutoriels constitueront d'excellents points de départ pour votre cheminement dans l'art mystérieux de la création d'un Zettelkasten !

Une dernière chose encore : comme la méthode de travail des Zettelkästen n'est pas très standardisée, et qu'il existe de nombreuses manières correctes de le faire, Zettlr vous permet de personnaliser entièrement chaque aspect de la méthode des Zettelkästen. Pour commencer, jetez un coup d'œil à [notre documentation sur la façon dont cela fonctionne](https://docs.zettlr.com/fr/reference/settings/#zettelkasten) !

**Vous en voulez plus ?** Alors consultez notre guide sur les [[references]] avec Zettlr !


