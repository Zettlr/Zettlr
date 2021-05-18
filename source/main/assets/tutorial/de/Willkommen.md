---
title: "Willkommen!"
keywords:
  - Anleitung
  - Tutorial
  - Einführung
...

# Willkommen bei Zettlr!

 ![zettlr.png](./zettlr.png)

Vielen Dank, dass du dich für Zettlr entschieden hast! Wir haben diese kleine, interaktive Einführung für Zettlr für dich vorbereitet, damit du direkt einsteigen kannst, ohne das gesamte Online-Handbuch gelesen zu haben. Nichtsdestotrotz ist Zettlr weitaus mächtiger, als es diese kurze Einführung suggeriert, also empfehlen wir dir, bei Fragen zunächst [🔗 das ausführliche Handbuch](https://docs.zettlr.com/) zu konsultieren, welches in mehreren Sprachen zur Verfügung steht. Das Handbuch kannst du aus der App heraus jederzeit mittels der Taste `F1` oder über den entsprechenden Eintrag im Hilfe-Menü öffnen.

Doch nun: Los geht's!

> In dieser Einführung wirst du viele Weblinks finden. Wenn du einfach nur auf sie klickst, interpretiert Zettlr dies zunächst als Wunsch, den Link zu editieren. Wenn du allerdings `Cmd` oder `Strg` gedrückt hälst, während du auf den Link klickst, öffnet Zettlr ihn. Immer, wenn wir von `Cmd/Strg` sprechen, meinen wir übrigens, dass du auf macOS die `Cmd`-Taste benutzt, auf anderen Computern die `Strg`-Taste.

## Über diese Einführung 🎬

Viele Markdown-Editoren nutzen solche interaktiven Tutorials, um einen schnellen Einstieg in die Benutzung zu liefern. Im Fall von Zettlr haben wir dir ein Verzeichnis in deinen „Dokumente“-Ordner kopiert und ihn für dich geöffnet. Im Moment siehst du in der linken Seitenleiste den Inhalt dieses Ordners, und eines der darin enthaltenen Dokumente – Willkommen.md – liest du gerade durch. Wenn du mit der Maus in den oberen Bereich der linken Seitenleiste bewegst, erscheint ein kleiner Pfeil, mit welchem du zu den Arbeitsbereichen wechseln kannst. Klicke diesen nun.

Wie du sehen kannst, ist derzeit genau ein Ordner – nämlich das Tutorial - geladen. Solche Top-Level-Verzeichnisse heißen bei Zettlr „Arbeitsbereiche“ (engl. „Workspaces“). Zettlr ist um das Konzept solcher Arbeitsbereiche herum entwickelt worden, sodass du das beste Erlebnis erhältst, wenn du ein oder mehrere solcher Ordner verwendest, um deine Dokumente zu verwalten. Diese Arbeitsbereiche werden bei jedem Start der App wieder geladen, sodass du direkt dort weiter arbeiten kannst, wo du aufgehört hast.

Solche Arbeitsbereiche (sowie alleinstehende Dateien, welche, sobald du sie öffnest, über den Arbeitsbereichen angezeigt werden) kannst du sowohl schließen als auch löschen, indem du mit der rechten Maustaste auf sie klickst. Wenn du sie schließt, heißt das, dass sie aus der App entfernt werden, aber weiterhin auf deinem Computer bleiben. Löschen bedeutet (wie im Übrigen bei allen anderen Dateien und Ordnern ebenfalls), dass sie in den Papierkorb verschoben werden.

Die Dateiliste, welche du zunächst gesehen hast, und den Verzeichnisbaum, der dir jetzt gerade angezeigt wird, heißen zusammen übrigens Dateimanager. In den Einstellungen kannst du zwischen drei verschiedenen Modi wählen: Entweder zeigt dir der Dateimanager entweder nur die Dateiliste _oder_ den Verzeichnisbaum an; oder er zeigt dir beide nebeneinander an; oder er zeigt sowohl Dateien wie auch Verzeichnisse ineinander verwoben an.

> Auf einigen Linux-Distributionen kann es passieren, dass das Löschen nicht direkt funktioniert. Das liegt daran, dass Zettlr dazu auf Linux-Betriebssystemen eine bestimmte Bibliothek benötigt, die nicht immer installiert ist. Weitere Informationen findest du [in unseren häufig gestellten Fragen](https://docs.zettlr.com/en/faq/#im-using-linux-and-deleting-files-doesnt-move-them-to-the-trash).

Klicke nun aber wieder auf den Arbeitsbereich, um die Dateiliste wieder anzuzeigen.

## Wie du Markdown nutzt 📝

Zettlr ist zunächst ein einfacher Text-Editor, was bedeutet, dass er im Großen und Ganzen wie Microsoft Word, LibreOffice oder Apple Pages funktioniert. Doch anstatt, dass du dich durch hunderte Buttons klicken musst, kannst du Markdown-Dokumente mithilfe einfacher Zeichen strukturieren. Das heißt, um ein vollständiges Markdown-Dokument zu verfassen, musst du theoretisch nie die Hand von der Tastatur nehmen!

Zunächst die allerwichtigsten Elemente:

1. Du kannst Text **fett** und _kursiv_ darstellen, indem du ihn mit Sternchen oder Unterstrichen umgibst. Ob du Sternchen oder Unterstriche verwendest, ist dir selbst überlassen, wichtig ist nur: Ein Zeichen macht den Text kursiv, während zwei den Text fett darstellen. Drei Zeichen übrigens machen Text __*sowohl fett als auch kursiv*__.
2. Überschriften werden mithilfe des Raute-Zeichens (`#`) dargestellt. Die Anzahl der Raute-Zeichen steht dabei für die Überschriften-Ebene. Insgesamt gibt es sechs Ebenen von Haupt-Überschriften (`#`) bis zu kleinen Abschnittsüberschriften (`######`).
3. Listen erstellst du so, wie du sie in Messengerdiensten bestimmt schon erstellt hast: Stelle dazu jeder Zeile, die ein Listeneintrag werden soll, ein Sternchen `*`, Minus `-` oder Plus `+` voran. Nummerierte Listen erstellst du mit einer Zahl gefolgt von einem Punkt.
4. Zuletzt gibt es noch Blockzitate (mehrzeilige, meist eingerückte Absätze). Diese erstellst du so, wie dein Email-Programm bei einer Antwort auch die Ursprungs-Mail einrückt: Mit Größer-als-Zeichen (`>`).

Natürlich gibt es noch viele weitere Elemente – Fußnoten, zum Beispiel. Bewege deine Maus über die folgende Fußnote: [^1]. Während dieser Einführung wirst du auch von einigen speziellen Elementen erfahren, die Zettlr zum Beispiel fürs Wissens-Management nutzt.

## Verlinkungen ⛓

Während sie selten in akademischen Veröffentlichungen anzutreffen sind, stellen Verlinkungen ein mächtiges Werkzeug in der Markdown-Welt dar. Zettlr ist geschickt im Umgang mit Links. Kopiere beispielsweise den folgenden Link in die Zwischenablage: https://www.twitter.com/Zettlr

Nun markiere diesen Text, und drücke `Cmd/Strg+K`, also das Kürzel für das Erstellen eines Links. Zettlr erkennt, dass sich ein gültiger Link in der Zwischenablage befindet, und fügt ihn automatisch als Link-Ziel ein. Weiterhin stellt Zettlr den Link automatisch in einer lesbaren Form dar, sobald du mit dem Text-Cursor aus dem Link gehst. Den so dargestellten Link kannst du dann direkt öffnen.

> Wenn du einige der von Zettlr bereits dargestellten Elemente nicht magst, und lieber den Markdown-Code sehen möchtest, lassen sich alle einzelnen Elemente von Zitationen bis zu mathematischen Gleichungen in den Einstellungen ausschalten.

Zettlr unterstützt aber nicht nur gewöhnliche Weblinks. Wenn einer der Links auf eine Datei auf deinem Computer verweist, kann Zettlr diese auch direkt öffnen – je nachdem, wie dein Betriebssystem eingestellt ist, mit dem entsprechenden Programm.

## Die Seitenleiste 📎

Nachdem die Markdown-Grundlagen geschafft sind, ist es Zeit, noch ein hilfreiches Werkzeug von Zettlr vorzustellen: Die Seitenleiste. Die Seitenleiste öffnest du per Klick auf das rechte Toolbar-Icon, welches aussieht wie drei Spalten. Die Seitenleiste verfügt über drei Reiter mit kontextuellen Informationen.

Der erste Reiter zeigt alle nicht-Markdown-Dateien an, die sich im aktuell ausgewählten Verzeichnis befinden. Per Klick öffnest du sie mit ihrer Standard-App, und du kannst sie in den Editor ziehen. Du kannst dort gerade eine PDF-Datei sehen. Versuche, sie nun in deinem PDF-Programm zu öffnen!

Der zweite Reiter ist besonders interessant für Wissenschaftler\*innen und Studierende: Er zeigt ein Literaturverzeichnis aller im aktuellen Dokument zitierten Werke an. Dies dient als eine Vorschau, damit du überprüfen kannst, ob alle Werke, die zitiert werden müssen, auch tatsächlich irgendwo zitiert werden.

> Dieses Literaturverzeichnis verwendet einen internen Zitationsstil zu Vorschauzwecken. Sobald du das Dokument exportierst, kümmert sich Zettlr darum, mit dem Stil deiner Wahl zu zitieren. Diesen Stil kannst du in den Export-Einstellungen auswählen.

Der dritte Reiter enthält ein Inhaltsverzeichnis aller Überschriften im aktuellen Dokument. Mit einem Klick springst du direkt zum entsprechenden Absatz. Dasselbe Inhaltsverzeichnis kannst du dir auch mittels des entsprechenden Toolbar-Buttons anzeigen lassen. Der einzige Unterschied zwischen beiden Methoden ist, dass das Inhaltsverzeichnis in der Seitenleiste die ganze Zeit sichtbar bleibt, während du an deinem Dokument arbeitest.

## Interaktive Elemente ⏯

Bis hierhin hast du bereits viel über Zettlr und Markdown gelernt. Viele Elemente sind zusätzlich interaktiv, wie die folgenden Boxen:

- [ ] Mit dem Dateimanager umgehen lernen
- [ ] Erste Markdown-Elemente lernen
- [ ] Pandoc und LaTeX für das Exportieren von Dokumenten installiert

Auch Tabellen sind interaktiv. Wenn du mit der Maus über Tabellen fährst, werden dir einige Buttons angezeigt, mit welchen du die Tabelle bearbeiten kannst. Mit einem Klick in die einzelnen Tabellenzellen lässt sich ihr Inhalt bearbeiten.

| Datei                         | Zweck                                   | Dateiname       |
|-------------------------------|-----------------------------------------|-----------------|
| Willkommen!                   | Erster Überblick über Zettlr            | Willkommen.md   |
| Mit dem Zettelkasten arbeiten | Einführung in die Zettelkasten-Features | Zettelkasten.md |
| Zitieren mit Zettlr           | Zitieren mit Literaturdatenbanken       | Zitieren.md     |

Du kannst neue Zeilen und Spalten hinzufügen und entfernen sowie Spalten anordnen. Der Tabelleneditor arbeitet dabei Kontext-sensitiv. Das heißt, es wird bei einem Klick auf einen Ausrichtungs-Button immer die Spalte ausgerichtet, in der sich die aktive Zelle befindet. Genauso funktioniert auch das Löschen und hinzufügen von Spalten und Zeilen.

> Wenn dir der Tabelleneditor nicht gefällt, kannst du ihn in den Editor-Einstellungen auch deaktivieren. Bitte beachte zudem, dass Markdown-Tabellen nicht für sehr komplexe Daten geeignet sind. Hierfür bietet es sich an, andere Dateiformate zu verwenden und erst beim Export in das Dokument einzupflegen.

## Weitere Informationen 📚

Dies war der erste Teil der Einführung. Wir haben nicht allzu viel behandelt, aber alles weitere kannst du [in unserer Dokumentation nachschlagen](https://docs.zettlr.com/). Vielleicht interessiert dich ja der [Tag-Manager](https://docs.zettlr.com/en/reference/settings/#manage-tags) oder die [vielfältigen Suchoptionen](https://docs.zettlr.com/en/core/search/)?

Wenn du bereit bist, klicke mit gedrückter `Cmd/Strg`-Taste auf den folgenden Wiki-Link: [[Zettelkasten]]

[^1]: Der Text dieser Fußnote befindet sich am Ende des Dokuments. Prinzipiell kannst du den Text allerdings positionieren, wo immer du willst. Das beste? Du musst nicht nach unten scrollen, um die Fußnote zu bearbeiten – klicke einfach mit gedrückter `Cmd/Strg`-Taste auf sie. Änderungen übernimmst du mit `Shift+Enter`, während du die Bearbeitung abbrichst, indem du einfach irgendwo außerhalb des Popups klickst.
