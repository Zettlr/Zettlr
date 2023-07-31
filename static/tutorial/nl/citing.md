---
title: "Citeren met Zettlr"
keywords:
  - Zotero
  - JabRef
  - CSL JSON
  - BibTex
  - Referentiebeheer
...

# Citeren met Zettlr 💬

In dit laatste deel van de tutorial tonen we je hoe je automatisch verwijzingen kan invoegen met Zettlr! Als je eerder al met de Zotero plugin voor Word (of zelfs met de Citavi plugin) hebt gewerkt, hoef je je geen zorgen te maken: het werkt bijna op dezelfde manier, maar je hebt veel meer vrijheid om citaten aan je eigen noden aan te passen.

Om te kunnen citeren in Zettlr moet je eerst een referentiedatabase instellen, [zoals beschreven in onze gebruikershandleiding](https://docs.zettlr.com/en/academic/citations/). Voor deze tutorial hebben we al een kleine database voorbereid om je alles te tonen wat je moet weten. Laten we die laden! In de map "Zettlr Tutorial" is er een klein bestand met de naam "references.json". Het bevat enkele referenties die Zettlr kan citeren. Om het te laden open je de voorkeuren en ga je naar het tabblad "Citations". Daar selecteer je het bestand met behulp van de bestandsbeheerder in het veld "Citaten database (CSL JSON of BibTeX)".

## Je eerste verwijzing 🎓

Zettlr zal het bestand meteen laden zodat je er nu uit kan citeren. Hieronder zie je een blokcitaat dat zeker een verwijzing nodig heeft:

> Es findet hier also ein Widerstreit statt, Recht wider Recht, beide gleichmäßig durch das Gesetz des Warenaustauschs besiegelt. **Zwischen gleichen Rechten entscheidet die Gewalt.** Und so stellt sich in der Geschichte der kapitalistischen Produktion die Normierung des Arbeitstags als Kampf um die Schranken des Arbeitstags dar — ein Kampf zwischen dem Gesamtkapitalisten, d.h. der Klasse der Kapitalisten, und dem Gesamtarbeiter, oder der Arbeiterklasse.

Dit is het beroemde citaat "tussen gelijke rechten beslist de macht" van Karl Marx in het eerste volume van zijn _Kapitaal_. Laten we hieraan nu een verwijzing toevoegen. Typ daarvoor gewoon een apenstaartje (`@`) op de plaats waar je de verwijzing wilt invoegen. Er zijn drie manieren om verwijzingen vorm te geven:

* Citeren met de naam van de auteur in de tekst: `@CiteKey`, dat wordt dan `Auteur (jaartal)`
* Citeren met de naam van de auteur in de tekst en een paginanummer: `@CiteKey [p. 123]`, dat wordt dan `Auteur (jaartal, p. 123)`
* Een "volledige" verwijzing: `[@CiteKey, p. 123]`, dat wordt dan `(Auteur jaartal, p. 123)`

Komen we nu terug op het citaat hierboven: dat heeft nog een verwijzing nodig. Kan je achter het blokcitaat een verwijzing toevoegen die op de volgende manier wordt weergegeven: `(Marx 1962, 23: 249)`?

> Je kan zelf kiezen hoe Zettlr een verwijzing automatisch invoegt. Als je meestal in voetnoten citeert, kies je best voor de verwijzing in rechte haakjes als standaard. Als je dikwijls de familienaam van de auteur noemt in de tekst, dan werkt de simpele _citekey-autocompletion_ goed. Wanneer je paginanummers of andere informatie wilt toevoegen werkt `@CiteKey []` goed. Als je een citeerstijl met voetnoten gebruikt, zal alles tussen rechte haakjes (na export) in een voetnoot worden weergegeven, dus wanneer je `@CiteKey []` gebruikt zal alleen de locatie in voetnoot worden gezet, terwijl de familienaam van de auteur in de tekst blijft.

Zettlr heeft een kern van krachtige functies die ontrafelen wat je schrijft en bepaalde veelvoorkomende elementen zoals pagina's (`p.`en `pp.`), hoofdstukken (`chapter`) en secties (`sec.` of `§`) in meerdere talen kunnen extraheren en weergeven wanneer je een bestand exporteert!

## De lijst met referenties 💻

Wanneer je langere papers of zelfs boeken schrijft, zou je het overzicht kunnen verliezen over wat je al hebt geciteerd en wat je nog in je paper moet verwerken. Zettlr kan je volledige lijst met referenties in de (rechter)zijbalk tonen. Klik opnieuw op het zijbalksymbool en navigeer naar de "Referenties"-sectie. Je zal zien dat het boek hier wordt getoond. Deze lijst zal groeien naargelang je meer verwijzingen invoegt!

> Als je met Zettlr een bestand exporteert, zal het automatisch een referentielijst (bibliografie) onderaan het bestand toevoegen. Je kan dit voorkomen door een [YAML frontmatter](https://docs.zettlr.com/en/core/yaml-frontmatter/) te gebruiken, waarin je de regel `suppress-bibliography: true` toevoegt. Je kan [deze lijst met referenties ook aanpassen](https://docs.zettlr.com/en/academic/citations/#customizing-the-list-of-references).

## Slotgedachten 🔥

Zo zijn we klaar met onze korte introductie. Je kan nu aan de slag met Zettlr!

Tot slot zouden we graag de fantastische Zettlr gemeenschap vermelden. We zouden zo'n goeie toepassing nooit in stand kunnen houden zonder de hulp van talrijke gemotiveerde mensen die nieuwe gebruikers verwelkomen, hulp bieden bij vragen en veranderingen voor de toepassing voorstellen. Overweeg alsjeblieft of je deel van de gemeenschap wilt worden en je stem wilt laten horen op zoveel mogelijk platformen! Je kan zeker inschatten of je deze tutorial goed vond of er liever iets aan zou veranderen. Al je verbeteringsvoorstellen zijn welkom!

Hier kan je lid worden van de gemeenschap:

- [Op Discord](https://discord.gg/PcfS3DM9Xj)
- [Op onze subreddit](https://www.reddit.com/r/Zettlr/)
- [Op GitHub](https://github.com/Zettlr/Zettlr/)

Als je wilt, kan je Zettlr ook ondersteunen op [Patreon](https://www.patreon.com/zettlr) of via [PayPal](https://www.paypal.me/hendrikerz)!

De tutorial is voorbij: **geniet van je werk met Zettlr!**

![Zettlr logo](zettlr.png)

