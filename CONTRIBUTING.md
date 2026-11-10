# Contributing to Zettlr

Zettlr lives through contributions from the community. You do not have to know
coding to help out. For the most part, a (free) GitHub account suffices. In this
document, you can find information on how to get started.

> [!TIP]
> Please view our [Code of Conduct](./CODE_OF_CONDUCT.md) to know how you should
> interact with our community and maintainers. Please note that maintainers may
> close issues, pull requests, or comments at their discretion without providing
> any reasons.

**Table of Contents**

- [Contributing to Zettlr](#contributing-to-zettlr)
  - [Community (Discussions/Support)](#community-discussionssupport)
  - [Report Issues \& Request Features](#report-issues--request-features)
  - [Contributing to Zettlr](#contributing-to-zettlr-1)
    - [Code Contributions](#code-contributions)
    - [Test Preview Versions](#test-preview-versions)
    - [Translations](#translations)
    - [Documentation](#documentation)
    - [Support Others](#support-others)
  - [AI Usage Policy](#ai-usage-policy)
  - [Questions \& Concerns](#questions--concerns)

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
> bug reports and feature requests. The maintainers may close or delete issues
> at any time without providing reasons.

## Report Issues & Request Features

Every app has bugs, and every app can be improved. If you find a bug, please
report it as soon as possible. We provide a user-friendly issue form that helps
you give us the right information that we need.

Sometimes, you find that there is something that the app lacks. In that case,
use the appropriate form to request a new feature. We will do our best to
implement it.

> [!IMPORTANT]
> Keep your GitHub notifications active. We often have to ask follow-up
> questions. If you do not answer them, we cannot proceed with helping you. We
> may close issues that lack activity.

## Contributing to Zettlr

You can contribute broadly among four dimensions (there are certainly other ways
in which you can help!):

1. **Code Contributions**: Fix bugs or implement new features.
2. **Test Preview Versions**: Turn on beta notifications in your settings, or
   [download nightly releases](https://nightly.zettlr.com) to test the app
   before we publish public releases.
3. **Translations**: Improve the existing translations of the app, or provide
   new ones.
4. **Documentation**: Improve the user manual.
5. **Support**: Help other users get started and answer questions.

### Code Contributions

We welcome PRs that fix bugs, improve behavior, or implement new features. You
can find all information to get started in the [README.md](./README.md) file.

To contribute code to the repository, please open a Pull Request. The technical
details can be found in the README.md file. Please note the following
additional requirements for opening pull requests:

1. This repository includes a pull request template. When you open a PR via the
   web interface, it will already be loaded into the text box for your
   convenience. You are **required** to fill in this form. Please read through
   the instructions in the form and fill in every section.
   **Pull requests that do not use the template or fail to fill in all sections will be closed.**
   We use this form for transparency and accountability purposes, and because it
   streamlines our understanding of the open PRs and managing the contributions.
2. After opening the PR, keep your notifications active. If we require
   additional information, we will comment on your PR. If you do not respond, we
   will close your PR for inactivity.
3. The PR will automatically be checked by our automated pipelines. If there are
   errors, you are expected to fix these errors yourself without being reminded.
   You are not required, however, to fix any linter warnings and/or errors that
   you did not cause.

> [!caution]
> We require every contributor to use and fill in the PR issue template by hand.
> Failure to use the provided template, or letting an LLM write the description
> for you will lead to a closure of your PR. See also the
> [Code of Conduct](./CODE_OF_CONDUCT.md) for more information on the AI usage
> in communication, as well as our [AI Policy](#ai-usage-policy) below.

### Test Preview Versions

Every new feature or change to the app can introduce bugs or other unwanted
behavior. It is hard for just the developers to cover every single edge case. As
such, we rely on the community to test out new versions and report any new bugs.

It is a win-win situation: By testing preview versions, you trade in some
stability for the privilege of experiencing brand new features before anybody
else, and at the same time help us fix remaining bugs before we can do a public
release.

There are two ways to test out new versions: Beta releases, and nightly
releases.

A relatively safe way is to test out beta releases. We usually only release them
before larger updates. You can tell Zettlr that you wish to test beta releases
by enabling the corresponding setting in your app preferences. Beta releases are
relatively stable but may have the odd annoying bug.

The second way to test preview versions is to install
[nightly releases](https://nightly.zettlr.com). Nightly releases are called this
way because they are built "over night." They are typically released
automatically, and come directly off of the current development state. While
those are often quite stable, there can be instances where there is a serious
bug in the code that we did not spot. Testing out nightly releases is immensely
helpful to the developer team, but they can be risky.

> [!TIP]
> Especially for smaller updates, it is typically easier for the developers to
> ask the community to test out a nightly release rather than publishing a beta.
> If you join our Discord, you will typically see us asking to test a nightly
> release shortly before a new update. In those instances, you can expect
> nightly releases to be stable and mostly risk-free, like a beta release.

### Translations

Zettlr utilizes the [`gettext`](https://www.gnu.org/software/gettext/) system
for translating content. All translations reside in the
[`static/lang` directory](./static/lang). Inside, you will find a set of `*.po`
files, named with their corresponding language codes (e.g. `fr-FR` for French
and `pt-BR` for Brazilian Portuguese).

To improve upon a translation, simply edit the corresponding `*.po` file using a
method of your choice. This can be done either with a text editor, or a
graphical application, such as [POedit](https://poedit.net/).

After you have modified the translation file, open a Pull Request to add your
changes to the application. GitHub has created a great
[guide on how to open Pull Requests](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files#editing-files-in-another-users-repository).

You can find more info in the
[documentation](https://docs.zettlr.com/en/getting-started/get-involved/), or
you can ask our community if you need help.

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
  Intelligence, local models, etc.), you disclose the extent of the usage.
  "Usage" in the context of this policy refers to you letting it write code or
  (documentation) text that you use in your contribution. This also includes
  letting it improve a paragraph of text or block of code that you have written.
  A coarse statement provided when you open a PR is sufficient ("AI was used to
  improve this text/code"). We may ask you to specify further, but by default,
  we only expect general disclosure.
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
  you contribute. Failure to do so constitutes a breach of our
  [code of conduct](./CODE_OF_CONDUCT.md).

## Questions & Concerns

If you have any questions or concerns regarding this contributor's guide, please
let us know. You can reach both community and maintainers on the Community Forum
or Discord. We are happy to answer any questions you may have, and respond to
your concerns.