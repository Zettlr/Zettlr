# Contributing to Zettlr

Zettlr lives through contributions from the community. You do not have to know
coding to help out. For the most part, a (free) GitHub account suffices. In this
document, you can find information on how to get started.

> [!TIP]
> Also see our [Code of Conduct](./CODE_OF_CONDUCT.md) to know how you can
> interact with our community and maintainers.

**Table of Contents**

- [Community (Discussions/Support)](#community-discussionssupport)
- [Report Issues \& Request Features](#report-issues--request-features)
- [Contributing to Zettlr](#contributing-to-zettlr-1)
  - [Code Contributions](#code-contributions)
  - [Translations](#translations)
  - [Documentation](#documentation)
  - [Support Others](#support-others)
- [AI Usage Policy](#ai-usage-policy)

## Community (Discussions/Support)

An active community forms the backbone of every major Open Source project. You
can get help from the community, and discuss any changes before you start
implementing them.

There are pockets of Zettlr users all around the world, but the center of the
community are our forum and Discord server. Some of our channels can be found
here:

* [Community Forum](https://forum.zettlr.com/)
* [Discord](https://go.zettlr.com/discord/)
* [Reddit](https://www.reddit.com/r/Zettlr/)

> [!TIP]
> Both forum and Discord have their own benefits and drawbacks. The forum is
> publicly visible and works for longer discussions. Discord is a private space,
> but works well for real-time communication.

> [!IMPORTANT]
> Do not open GitHub issues to ask questions or for help. We are happy to
> answer questions on the community forum and/or Discord. Only use issues for
> bug reports and feature requests.

## Report Issues & Request Features

Every app has bugs, and every app can be improved. If you find a bug, please
report it as soon as possible. We provide a user-friendly issue form that helps
you give us the right information that we need.

Sometimes, you find that there is something that the app lacks. In that case,
use the appropriate form to request a new feature. We will do our best to
implement it.

> [!IMPORTANT]
> Keep your GitHub notifications active. We often have to ask follow-up
> questions. If you do not answer them, we cannot proceed with helping you.

## Contributing to Zettlr

You can contribute broadly among four dimensions (there are certainly other ways
in which you can help!):

1. **Code Contributions**: Fix bugs or implement new features.
2. **Translations**: Improve the existing translations of the app, or provide
   new ones.
3. **Documentation**: Improve the user manual.
4. **Support**: Help other users get started and answer questions.

### Code Contributions

We welcome PRs that fix bugs, improve behavior, or implement new features.
Zettlr is an Electron project and as such uses a standard Node.js stack. You can
find all information to get started in the [README.md](./README.md) file.

### Translations

Zettlr utilizes the `gettext` system for translating content. All translations
reside in the folder `static/lang`. Inside, you will find a set of `*.po` files,
named with their corresponding language codes (e.g. `fr-FR` for French and
`pt-BR` for Brazilian Portuguese).

To improve upon a translation, simply edit the corresponding `*.po` file using a
method of your choice. This can be done either with a text editor, or a
graphical application, such as POedit. After you have modified the translation
file, open a Pull Request to add your changes to the application.

You can find more info in the
[documentation](https://docs.zettlr.com/en/getting-started/get-involved/), or
you can ask our community if you need help!

### Documentation

We constantly change how the app works, so keeping the documentation up to date
is important. To help with improving our documentation,
[see its repository](https://github.com/Zettlr/zettlr-docs). Just fork it and
edit any page. Trust your gut: If you feel something is ill-explained, you are
probably right. Then, open a Pull Request and we will make sure to merge it as
soon as possible.

Please don't hesitate to ask our community if you have any questions.

### Support Others

Zettlr has a large, global community. Many people -- both old and new users
alike -- come to our community hubs to ask for help. The more users are present
on both the Community Forum and Discord, the better. Any question you can answer
will help the maintainers focus more on improving the app.

## AI Usage Policy

Zettlr does not prohibit the use of generative pre-trained transformers (GPT
models; simply "LLMs" or "chat bots") per se. GPT-models/LLMs are great and
valuable tools for getting certain tasks done faster than without. However, we
require anyone who contributes to the app to be transparent about the use of AI
and keep a few limits in mind.

By contributing to the repository, **you agree to abide by our AI Usage Policy**:

* Wherever you have consulted GPT models (ChatGPT, Claude, Gemini, Apple
  Intelligence, or local models), you disclose the extend of the usage. "Usage"
  in the context of this policy refers to you letting it write code or (docs)
  text that you use in your contribution. This also includes letting it improve
  a paragraph of text or block of code that you have written. A coarse statement
  provided when you open a PR is sufficient ("AI was used to improve this
  text/code"). We may ask you to specify further, but by default, we only expect
  general disclosure.
* You agree to check and proof-read any text/code that AI has generated to
  ensure you understand it. We do not require you to provide perfect code; but
  we do require you to understand everything you wish to contribute to Zettlr
  and its ecosystem.
* You acknowledge that you are the sole author and solely responsible for any
  contribution you make. GPT-models cannot make contributions on their own. You
  may never acknowledge GPT models as co-authors, especially not in commit-
  messages.
* You agree to follow ethical principles in whatever you do. This especially
  holds true for "Respect for persons": You are interacting with humans here,
  and we expect you to respect them. This means that nobody wishes to talk to a
  GPT-model. Communicate on your own, regardless of how much AI you use to help
  you contribute.
