# Contributing to Zettlr

Hey there.

First of all: Thanks for wanting to contribute. Anyone can contribute, no matter if you can actually code or just complain about unwanted behaviour. Everything helps this app to grow better for everybody.

I have no special requirements on how to commit to Zettlr yet. But some basic expectations I have about contributing (to both save time for me and you) will be listed below:

* If you found a bug, please open up an issue. Don't want to create a GitHub-Account for that? No problem, just email me at zettlr@mailbox.org and I'll open up the issue myself.
* If you think some feature is behaving not as you would expect, please do the same (e.g., if you do not want to create a GitHub account first, email me!)
* If a feature you'd like to use is missing, the same applies!

## Contributing translations

If you want to contribute translations please make sure that your pull request contains the following:

* Your (updated or new) translation file in `source/common/lang`.
* The language has been added to `this.supportedLangs` in `source/main/zettlr-config.js`
* To save me time, please also add the according hunspell dictionary's .AFF and .DIC files to `source/renderer/assets/dict` in the respective directory structure ([Link to the Github repository](https://github.com/wooorm/dictionaries))
* Then make sure that you also update the property `this.cfgtpl.spellcheck`-object accordingly

## Contributing code

After all, I'm very thankful for every piece of code I do not have to write on my own. So if you decide to add a feature on your own using forks and pull requests, please commit to the develop branch. Then I'll merge them as soon as possible and commit them to master. If there are branches dedicated to certain features, consider requesting the pull there, if your PR contributes to this specific feature (general bug fixes, of course, should be PR'd to develop).

## Anything else?

If there's anything else, you can use either GitHub or mail to contact me directly. If you think something is missing, please contact me!
