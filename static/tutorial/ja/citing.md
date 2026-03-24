---
title: "Zettlr での引用"
keywords:
  - Zotero
  - JabRef
  - CSL JSON
  - BibTex
  - 参考文献管理
...

# Zettlr での引用 💬

この最後のガイドでは、Zettlr を使って自動的に引用を行う方法について詳しく説明します。これまで Word 用の Zotero プラグイン（あるいは Citavi プラグイン）を使用したことがある方なら、ご安心ください。動作はほぼ同じですが、ニーズに合わせて引用をより柔軟に調整できます。

Zettlr で引用を始めるには、参考文献データベースを設定する必要があります。[その方法については、ドキュメントで説明しています](https://docs.zettlr.com/en/core/citations/)。このチュートリアルでは、必要なことをすべてカバーする小さなデータベースをあらかじめ用意しました。これを読み込んでみましょう！チュートリアルディレクトリ内に "references.json" という小さなファイルがあります。これには、Zettlr が引用できるいくつかの参考文献が含まれています。読み込むには、まず環境設定に移動し、「引用」タブを開きます。そこで、参考文献データベースフィールドのファイルブラウザを使って、このファイルを指定します。

## 最初の引用 🎓

Zettlr はすぐにファイルを読み込み、引用できるようになります。次の引用符で囲まれた文章を見てみましょう。これには確かに引用が必要です。

> Es findet hier also ein Widerstreit statt, Recht wider Recht, beide gleichmäßig durch das Gesetz des Warenaustauschs besiegelt. **Zwischen gleichen Rechten entscheidet die Gewalt.** Und so stellt sich in der Geschichte der kapitalistischen Produktion die Normierung des Arbeitstags als Kampf um die Schranken des Arbeitstags dar — ein Kampf zwischen dem Gesamtkapitalisten, d.h. der Klasse der Kapitalisten, und dem Gesamtarbeiter, oder der Arbeiterklasse.

これは、カール・マルクスの『資本論』第 1 巻にある、「同等の権利の間では、暴力が決着をつける」という有名な一節です。それでは、この引用を追加してみましょう。これを行うには、引用を追加したい場所に `@` 記号を入力するだけです。引用の形式には 3 つの方法があります。

* 著者名を本文中に含める引用: `@CiteKey` は `著者 (年)` となります。
* 著者名を本文中に含め、さらに参照箇所を追加する引用: `@CiteKey [p. 123]` は `著者 (年, p. 123)` となります。
* 「完全な」引用: `[@Citekey, p. 123]` は `(著者 年, p. 123)` となります。

さて、まだ引用が付いていない私たちの引用文に戻りますが、引用符の後に `(Marx 1962, 23: 249)` と表示される引用を追加できますか？

> ニーズに応じて、Zettlr が引用を自動補完する方法を選択できます。脚注を使って定期的に引用する場合は、角括弧を使った引用をデフォルトにするとよいでしょう。本文中に著者の姓を頻繁に記載する場合は、シンプルな citekey の自動補完が適しています。さらにページ番号などの情報が必要な場合は、`@CiteKey []` という citekey の自動補完が便利です。脚注スタイルの引用を使用している場合、中括弧で囲まれたものはすべて脚注に配置されます。つまり、`@CiteKey` を使用すると、引用のみが脚注に配置され、著者の姓は本文中に残ります。

Zettlr の中核には、あなたが記述した内容を解析し、複数の言語にわたってページ (`p.` や `pp.`)、章 (`chapter`)、節 (`sec.` や `§`) などの共通部分を抽出できる強力なエンジンが備わっています。

## 参考文献リスト 💻

長めの論文や書籍を書いていると、何を既に引用したか、何をまだ論文に盛り込む必要があるか、把握しきれなくなることがあります。Zettlr は、サイドバーに参考文献の全リストを表示することができます。もう一度サイドバーアイコンをクリックして開き、「参考文献」セクションを見てみてください。ファイルを保存すると、その書籍がそこに表示されているのがわかります。そして、引用を追加し続けると、このリストは増えていきます！

> Zettlr を使用してファイルをエクスポートすると、ファイルの内容の下に参考文献リストが自動的に追加されます。[YAML frontmatter](https://docs.zettlr.com/en/advanced/yaml-frontmatter/) を使用すると、これを防ぐことができます。`suppress-bibliography: true` プロパティを追加するだけです。また、[この参考文献リストをカスタマイズする](https://docs.zettlr.com/en/core/citations/#customizing-the-list-of-references) こともできます。

## 最後に 🔥

これで、Zettlr への短い入門は終了です。これであとは自由にお使いいただけます！

最後に、素晴らしい Zettlr コミュニティについて触れておきたいと思います。私たちは、新しいユーザーを歓迎し、質問に答え、アプリ自体の変更を提案してくれる、何十人ものやる気に満ちた人々の助けなしには、このような素晴らしいツールを維持することは決してできません。ぜひ、できるだけ多くのプラットフォームでコミュニティに参加し、あなたの声を届けてください！特に、あなたがちょうど読み終えたこのチュートリアルが良いかどうか、あるいは変更が必要かどうかについて、あなたは評価することができます。改善案があれば、いつでもお聞かせください！

こちらのコミュニティにご参加いただけます：

- [Discord](https://discord.gg/PcfS3DM9Xj)
- [Subreddit](https://www.reddit.com/r/Zettlr/)
- [GitHub](https://github.com/Zettlr/Zettlr/)

最後に、ご希望でしたら、[Patreon](https://www.patreon.com/zettlr) または [PayPal](https://www.paypal.me/hendrikerz) で Zettlr をサポートすることもできます！

しかし、これでこの短い入門は終わりです。**Zettlr での作業をお楽しみください！**

![zettlr.png](./zettlr.png)
