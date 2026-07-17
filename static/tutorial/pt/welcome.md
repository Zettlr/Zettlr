---
title: "Bem-vindo ao Zettlr!"
keywords:
  - Guia
  - Tutorial
  - Introdução
...

# Bem-vindo ao Zettlr!

 ![zettlr.png](./zettlr.png)

Olá e obrigado por escolher o Zettlr! 🎉 Reunimos este pequeno tutorial interativo para que você possa mergulhar no uso do aplicativo sem precisar folhear toda a documentação. No entanto, o Zettlr é capaz de muito mais do que está descrito nesta breve introdução, então recomendamos fortemente que você também confira [🔗 a documentação extensa](https://docs.zettlr.com/) (mantenha pressionado `Cmd` ou `Ctrl` para abrir o link). A documentação está disponível em vários idiomas e ajuda você a navegar pelo conjunto amplo de recursos. Você pode sempre abrir a documentação online pressionando `F1` ou selecionando o item correspondente no menu Ajuda.

Mas agora: vamos lá!

> Neste tutorial, você verá links que pode seguir. Por padrão, clicar em um link é interpretado como “quero editar este link”. Se quiser abri-lo, mantenha pressionada a tecla `Cmd`, se estiver no macOS, ou a tecla `Ctrl` caso contrário, enquanto clica no link! Sempre que encontrar `Cmd/Ctrl`, leia como “use `Cmd` se estiver no macOS, ou `Ctrl` caso contrário.”

## Sobre este tutorial 🎬

Vários aplicativos Markdown usam esse tipo de tutorial interativo para guiar o usuário na prática do aplicativo. No caso do Zettlr, criamos um pequeno diretório na sua pasta de documentos, chamado “Zettlr Tutorial”, e carregamos ele para você. Agora, você vê o conteúdo desse diretório na barra lateral esquerda (chamada de “gerenciador de arquivos”), então vamos dar uma olhada!

Como você pode ver, há um título chamado “Workspaces”, e abaixo dele está a pasta do tutorial – Zettlr Tutorial – com o arquivo atual destacado. Você também pode ver outros arquivos, por exemplo “references.json”, que se tornará importante em breve. Este modo padrão do gerenciador de arquivos é chamado de “combinado”, porque mostra seus arquivos e pastas intercalados, como você já conhece do navegador de arquivos do seu sistema. O gerenciador de arquivos do Zettlr tem outros dois modos, “fino” e “expandido”, que separam seus arquivos das pastas. Você pode ativá-los nas configurações.

A pasta “Zettlr Tutorial” é chamada de “Workspace” e contém todos os arquivos que estão atualmente carregados no aplicativo. Você pode abrir outros workspaces e até arquivos isolados (que não fazem parte de nenhum workspace), e esses também aparecerão no gerenciador de arquivos.

Você pode clicar com o botão direito no diretório e escolher “fechar” ou “excluir”. Quando você _fecha_ um workspace ou um arquivo de nível superior (também chamado de arquivo independente) no Zettlr, isso significa que você o descarrega do aplicativo, mas ele permanece no seu computador. Se você _excluí-lo_, isso significa que o Zettlr o moverá para a lixeira. Mas não faça isso agora, pois ainda há coisas novas para aprender! ✍🏼

> Observação: em algumas distribuições Linux, mover arquivos para a lixeira pode não funcionar imediatamente, pois o Zettlr depende de um certo pacote para mover arquivos para a lixeira. Se você tiver problemas ao remover arquivos e pastas, por favor [verifique nossa seção de FAQ](https://docs.zettlr.com/en/reference/faq/), que explica isso!

O Zettlr é construído em torno do conceito de workspaces. Portanto, você terá a melhor experiência mantendo pelo menos um diretório de workspace aberto o tempo todo e fazendo todo seu trabalho nele. Os workspaces são carregados automaticamente sempre que você abre o aplicativo e são exibidos na árvore de diretórios que está visível agora.

Se você já tem uma pasta na qual deseja armazenar suas notas reais, ou se já tem algumas notas, pode abri-la agora pressionando o botão “Open Workspace…” na barra de ferramentas ou pelo atalho `Cmd/Ctrl`+ Shift + `o`.

## Como usar Markdown 📝

O Zettlr é um editor Markdown, o que significa que ele funciona principalmente como aplicativos que você já conhece, como Microsoft Word, LibreOffice ou Apple Pages. Mas em vez de clicar em uma infinidade de botões na barra de ferramentas, você pode aplicar estrutura aos seus elementos usando apenas caracteres, o que significa que você nunca precisa sair do teclado! ✨

Vamos passar rapidamente pelos elementos mais importantes:

1. Você pode deixar o texto em **negrito** e _itálico_ cercando-o com sublinhados ou asteriscos. Qual escolher é totalmente com você. Um único caractere deixa o texto em itálico, dois deixam em negrito e três deixam em __*negrito e itálico*__.
2. Títulos são criados quase como hashtags — basta escrever um `#` seguido de um espaço. Você pode usar até seis caracteres `######` para criar títulos dos níveis um a seis.
3. Listas são criadas literalmente — basta escrever `*`, `-` ou `+` em uma nova linha. Listas numeradas consistem em um número seguido de um ponto.
4. Por fim, blocos de citação são escritos exatamente como o texto citado aparece em e-mails: simplesmente delimite-os usando `>`.

Claro, há muitos outros elementos. Notas de rodapé, por exemplo — passe o cursor sobre esta para vê-la.[^1] Durante este tutorial, você também aprenderá sobre alguns elementos especiais que o Zettlr usa para permitir um trabalho realmente acadêmico, assim como gestão de conhecimento usando um Zettelkasten!

## Links ⛓

Embora não sejam usados com tanta frequência em textos acadêmicos, links são uma ferramenta poderosa do Markdown, e o Zettlr os eleva a outro nível. O Zettlr age de forma bastante inteligente quando se trata de links. Vamos criar um rapidamente! Copie o seguinte link para a área de transferência: https://fosstodon.org/@zettlr

Agora, selecione as seguintes palavras: “link para nossa conta no Mastodon” e pressione `Cmd/Ctrl+K`! O Zettlr vê que você tem um link válido na área de transferência e usa automaticamente esse destino de link. Além disso, o Zettlr oculta automaticamente o destino do link e exibe apenas o texto vinculado para facilitar a leitura do seu texto. Se você não gostar de alguns dos muitos elementos que o Zettlr renderiza por padrão, pode desativá-los um a um nas preferências de “Exibição”.

Mas o Zettlr não suporta apenas links web comuns. Se você vincular a um arquivo que esteja em algum lugar do seu computador, o Zettlr poderá abri-lo se você clicar nesse link. Em geral, lembre-se apenas de que o Zettlr busca tornar sua experiência de escrita o mais fluida possível, não apenas no que diz respeito a links.

## A Barra Lateral 📎

Agora que cobrimos o básico do Markdown, é hora de mostrar mais do que o Zettlr pode fazer! Clique agora no ícone em forma de coluna no canto superior direito da barra de ferramentas. Isso abrirá a [barra lateral](https://docs.zettlr.com/en/sidebar/), que contém quatro guias.

A primeira guia exibe um índice gerado dinamicamente. Você pode clicar nos títulos para saltar até eles no texto. A segunda guia contém uma lista de referências (se você tiver alguma no documento atual). Isso serve como uma maneira poderosa de verificar o que você citou no documento.

> Observe que as referências são formatadas apenas usando o estilo de citação embutido. Quando você exportar seu documento, o Zettlr cuidará de usar o estilo de citação que você escolheu, se tiver definido um nas preferências de “Exportar” (mais sobre isso mais adiante).

A terceira guia contém arquivos relacionados, isto é: arquivos que o Zettlr acha relacionados ao arquivo atual. Ele faz isso olhando para as tags e também para os links internos (mais sobre isso depois) que você usa em todos os arquivos. No topo dessa lista estarão os arquivos que linkam para o arquivo que você está visualizando. Em seguida vêm os arquivos que têm tags em comum com o arquivo atual. Quanto mais tags um arquivo tiver em comum com o seu arquivo atual, mais no topo ele aparecerá nessa lista.

A última guia contém todos os arquivos que não são Markdown e que residem no diretório atualmente selecionado. Você verá um arquivo "LaTeX Guide.pdf". Quer saber o que é? Vamos dar uma olhada: clique nele para abrir o arquivo com seu visualizador de PDF padrão agora!

## Elementos Interativos ⏯

Até agora, você já aprendeu muito sobre o Zettlr. Você consegue marcar todas as caixas?

- [ ] Trabalhar com arquivos e diretórios
- [ ] Aprender o básico de Markdown
- [ ] Instalar o LaTeX para exportar meus arquivos

Alguns elementos no editor são interativos, assim como as caixas de seleção. Tabelas são outra coisa que é altamente interativa. Dê uma olhada na tabela a seguir: passe o mouse sobre ela e verá alguns botões aparecerem que permitem interagir com a tabela!

| Arquivo                     | Objetivo                                                         | Nome do arquivo |
|-----------------------------|------------------------------------------------------------------|-----------------|
| Bem-vindo ao Zettlr!        | Dá uma visão geral básica das funcionalidades do Zettlr          | welcome.md      |
| Trabalhando com Zettelkasten| Introduz as várias funcionalidades de Zettelkasten no Zettlr     | zettelkasten.md |
| Citando com Zettlr          | Destaca as capacidades de trabalhar com bancos de referências      citing.md       |

Você pode alinhar colunas, além de adicionar e remover linhas e colunas na tabela. O editor de tabela sempre trabalhará na coluna ou linha que estiver ativa no momento. Então, para remover uma linha específica, certifique-se de que uma célula dessa linha esteja selecionada. Sinta-se à vontade para brincar um pouco com a tabela para se acostumar com seu funcionamento!

## Recursos adicionais 📚

Você conseguiu! A primeira parte da introdução acabou. Não cobrimos muita coisa aqui, mas você pode aprender sobre qualquer coisa na nossa [documentação](https://docs.zettlr.com/)! O que pode te interessar é [o poderoso gerenciador de tags](https://docs.zettlr.com/en/pkms/tag-manager/) ou as [opções versáteis de busca](https://docs.zettlr.com/en/file-manager/search/).

Mas agora chega de básico, estamos prontos para mergulhar de vez! Vamos para o tutorial do Zettelkasten! Para ir até lá, basta clicar com `Cmd/Ctrl` no seguinte wiki-link: [[zettelkasten]]

[^1]: Este texto fica na parte inferior deste arquivo. Mas você pode colocar notas de rodapé em qualquer lugar que desejar. O Zettlr exibirá o texto da nota correspondente quando você passar o mouse sobre ela, para que não seja necessário rolar a página para ler o que está escrito.
