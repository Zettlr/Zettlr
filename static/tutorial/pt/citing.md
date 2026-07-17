---
title: "Citando com Zettlr"

author:
  - The Zettlr Team
  - Felipe Rocha (trad.)
keywords:
  - Zotero
  - JabRef
  - CSL JSON
  - BibTex
  - Reference Management
...

# Citando com Zettlr 💬

Neste guia final, vamos explorar como você pode citar automaticamente usando o Zettlr! Se você já usou o plugin do Zotero para Word antes (ou mesmo o plugin do Citavi), fique tranquilo: funciona quase da mesma maneira, mas você tem muito mais liberdade para adaptar as citações às suas necessidades.

Para começar a citar com o Zettlr, você precisa configurar um banco de dados de referências, [como descrevemos em nossa documentação](https://docs.zettlr.com/en/editor/citations/). Para este tutorial, já preparamos um pequeno banco de dados que cobre tudo o que você precisa saber. Vamos carregá-lo! No diretório do tutorial, há um pequeno arquivo chamado “references.json”. Ele contém algumas referências que o Zettlr pode citar. Para carregá-lo, primeiro acesse as preferências e vá até a aba “Citações”. Lá, navegue até o arquivo usando o navegador de arquivos do campo de banco de dados de referências.

## Sua Primeira Citação 🎓

O Zettlr carregará imediatamente o arquivo e você já poderá citar. Vamos dar uma olhada na seguinte citação em bloco, que certamente precisa de uma referência:

> Es findet hier also ein Widerstreit statt, Recht wider Recht, beide gleichmäßig durch das Gesetz des Warenaustauschs besiegelt. **Zwischen gleichen Rechten entscheidet die Gewalt.** Und so stellt sich in der Geschichte der kapitalistischen Produktion die Normierung des Arbeitstags als Kampf um die Schranken des Arbeitstags dar — ein Kampf zwischen dem Gesamtkapitalisten, d.h. der Klasse der Kapitalisten, und dem Gesamtarbeiter, oder der Arbeiterklasse.

Esta é a famosa citação “entre direitos iguais, decide a força” de Karl Marx em seu _Capital_, volume 1. Agora vamos adicionar essa citação. Para isso, basta digitar um símbolo `@` onde você deseja inserir a citação. Existem três maneiras de formar citações:

* Citar com o nome do autor no texto: `@CiteKey`, que se tornará `Autor (Ano)`
* Citar com o nome do autor no texto e um localizador adicional: `@CiteKey [p. 123]`, que se tornará `Autor (Ano, p. 123)`
* Uma citação “completa”: `[@CiteKey, p. 123]`, que se tornará `(Autor Ano, p. 123)`

Voltando à nossa citação, que ainda precisa da referência, você consegue adicionar uma citação após a citação em bloco que apareça como `(Marx 1962, 23: 249)`?

> Você pode escolher como o Zettlr completa sua citação automaticamente, dependendo das suas necessidades. Se você cita frequentemente usando notas de rodapé, escolher a citação entre colchetes deve ser seu padrão. Se você frequentemente menciona o sobrenome do autor no texto, a autocompletação simples por citekey funciona bem. Se você também precisa de números de página ou outras informações, a autocompletação `@CiteKey []` funciona bem. Se você usa um estilo de citação em nota de rodapé, tudo o que estiver entre colchetes será colocado na nota de rodapé — então, ao usar `@CiteKey`, apenas a citação será colocada na nota, enquanto o sobrenome do autor permanecerá no texto.

No núcleo do Zettlr, existe um poderoso motor capaz de entender o que você escreve e extrair trechos comuns como páginas (`p.` e `pp.`), capítulos (`chapter`) e seções (`sec.` ou `§`), até mesmo em vários idiomas!

## A Lista de Referências 💻

Assim que você escreve trabalhos mais longos e até livros, pode perder a visão do que já citou e do que ainda precisa ser incluído no seu texto. O Zettlr consegue exibir a lista completa de referências na barra lateral. Abra-a agora clicando novamente no ícone da barra lateral e dê uma olhada na seção “Referências”. Depois de salvar o arquivo, você notará que o livro aparece ali — e, à medida que continuar adicionando referências, essa lista crescerá!

> Se você exportar um arquivo usando o Zettlr, ele adicionará automaticamente uma lista de referências abaixo do conteúdo do arquivo. Você pode impedir isso usando um [YAML frontmatter](https://docs.zettlr.com/en/editor/yaml-frontmatter/). Basta adicionar a propriedade `suppress-bibliography: true`. Você também pode [personalizar essa lista de referências](https://docs.zettlr.com/en/editor/citations/#customizing-the-list-of-references).

## Considerações Finais 🔥

Isto conclui nossa breve introdução ao Zettlr. Você está pronto para começar!

Uma última coisa que gostaríamos de mencionar é a excelente comunidade do Zettlr. Não conseguiríamos manter uma ferramenta tão boa sem a ajuda de dezenas de pessoas altamente motivadas que recebem bem novos usuários, ajudam com dúvidas e sugerem mudanças no próprio aplicativo. Considere participar da comunidade em quantas plataformas puder e faça sua voz ser ouvida! Uma coisa que você certamente pode avaliar é se este tutorial que acabou de concluir é bom ou precisa de alterações. Se tiver sugestões de melhoria, estamos sempre felizes em ouvir você!

Você pode se juntar à nossa comunidade aqui:

- [No Discord](https://discord.gg/PcfS3DM9Xj)
- [No nosso subreddit](https://www.reddit.com/r/Zettlr/)
- [No GitHub](https://github.com/Zettlr/Zettlr/)

Por fim, se quiser, você também pode apoiar o Zettlr no [Patreon](https://www.patreon.com/zettlr) ou via [PayPal](https://www.paypal.me/hendrikerz)!

Mas agora terminamos essa pequena introdução: **Aproveite trabalhar com o Zettlr!**

![zettlr.png](./zettlr.png)
