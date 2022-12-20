# Contributing to Zettlr

Zettlr lives through contributions from the community. You do not have to know any code to help out – for the most part, a (free) GitHub account suffices. In this document, you can find information on how to get started.

**Table of Contents**

- [Contributing to Zettlr](#contributing-to-zettlr)
  - [Where to Get Help](#where-to-get-help)
    - [All Communication Channels](#all-communication-channels)
  - [How to Help](#how-to-help)
    - [Translation](#translation)
    - [Documentation](#documentation)
    - [Development](#development)
      - [Our Stack (with linked documentation)](#our-stack-with-linked-documentation)
      - [Issue Labels](#issue-labels)
  - [Final Remarks](#final-remarks)

## Where to Get Help

An active community forms the backbone of every major Open Source project. The community of Zettlr is present on various platforms on the internet, where they actively help each other out – not just with regard to using the application. Each platform yields a specific thematic focus. GitHub is the most tech-focused part of the Zettlr community, albeit [discussing here](https://github.com/Zettlr/Zettlr/discussions) is the way to go for more theoretical discussions. Furthermore, we have a [Discord-server](https://discord.gg/PcfS3DM9Xj) where we discuss the app and help each other out.

**Please note: Do NOT open issues on GitHub if you have questions on how to help/with your PR. Please ask these questions on any other platform!**

### All Communication Channels

- [Discord](https://discord.gg/PcfS3DM9Xj)
- [Reddit](https://www.reddit.com/r/Zettlr/)
- [GitHub](https://github.com/Zettlr/Zettlr)

## How to Help

As mentioned above, there are numerous ways in which you can help Zettlr. Choose one where you feel the most comfortable. You can always help in other areas as well, but choosing something where you know your ways helps to get started.

### Translation

Our aim is to support as many languages as possible, making Zettlr a truly international application. As of now, more than a dozen languages are already available, but even the most popular languages have room for improvement. Translating does not at all require technical knowledge.

Zettlr utilizes the `gettext` system for translating content. All translations reside in the folder `static/lang`. Inside, you will find a set of `*.po` files, named with their corresponding language codes (e.g. `fr-FR` for French and `pt-BR` for Brazilian Portuguese).

To improve upon a translation, simply edit the corresponding `*.po` file using a method of your choice. This can be done either with a text editor, or, if you would like to have a graphical user interface, the application POedit. After you have modified the translation file, open a Pull Request to add your changes to the application.

### Documentation

The documentation always changes with every new feature we ship, so keeping it up to date is of utmost importance. To help with our documentation, [see its repository](https://github.com/Zettlr/zettlr-docs). Just fork it and edit everything where you spot mistakes. You can also add feature explanations if something is missing. Trust your gut: If you are sure something is ill-explained, you are probably right. Then, open a Pull Request and we will make sure to merge it as soon as possible. **Please remember to check your notifications afterwards, as we might have some remarks and comment on your PR!**

### Development

If you have some experiences with developing, we would gladly welcome your help in fixing issues and adding features. Even if you just start: There are tons of smaller things and chores to do, so by cleaning up code here and there you can improve your skills and also help the project. Even if it's a minor fix, it is still a fix!

#### Our Stack (with linked documentation)

- [Electron.js](https://www.electronjs.org/docs) based on [Node.js](https://nodejs.org/api/) for backend
- [Webpack](https://webpack.js.org/concepts/), and [Less](http://lesscss.org/features/) for frontend

#### Issue Labels

There are – broadly speaking – three categories of issues on the Zettlr GitHub issue tracker, which you can distinguish with their associated labels.

1. **Bugs** come in two flavours: non-critical and critical. Non-critical bugs are those that sometimes can mean a nuisance but that do not seriously affect working with the app. Critical bugs, however, make Zettlr barely or un-usable, and fixes need to be addressed urgently. Normally, the latter is taken on by the core-team.
2. **Enhancements** are some small additions that require adding some more functionality to a feature, but that should not evolve into an own distinct feature. Even if the issue description reads like a full feature to you, the "enhancement" label means there is already said functionality, which just needs to be amended. Please ask if you are unsure.
3. **Features** are bigger additions to the application that require a completely new feature. These can take some time, but could also prove to be a nice winter project.

If you want to help, make sure to _communicate your intent_, that is:

1. If you want to tackle an issue, comment and say that you want to develop a PR. In the PR, please link the issue.
2. If you want to tackle an issue, but along the way realize that you ran out of time and can't finish it: _communicate it_! This is an Open Source project, and retracting is no shame, but not communicating that you cannot finish something will hinder all other people involved.
3. If you have a PR and are not completely sure about whether it's right, or not, just open the PR and outline your questions there. It is much easier to work with something we can see and improve the PR than if you ask without something concrete.

In any case, just remember to just open PRs and dive in. The worst that could happen is that we ask you to rewrite some file, but that has never happened and is pretty unlikely to happen in the future.

## Final Remarks

If something is missing here, or you feel something is not well described, either directly open a PR or ask one of the community places.
