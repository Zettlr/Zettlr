# Zettlr Testing Environment

You are viewing the Zettlr testing environment. This normally means that you have run the `yarn test-gui` command, so in large cases, what I've written here is rather some "lorem ipsum" text of no great relevance to your testing purposes.

But in case you did not expect this, there may be something off!

> You can change anything in these files, as these are dummy files that can be copied whenever you want to reset this test directory. This directory resides in your `./resources` subdirectory, and therefore will not be added to git. If you want to reset the directory to the initial state (for instance, if you removed every single file, or did some other naughty thing with it), you can do so by providing the `--clean`-flag to the command: `yarn test-gui --clean`.

## Adding more Test Cases

In case you realize there's broken behaviour, feel free to open a Pull Request which adds more files/modifies files to accomodate for these edge cases so that we have an easy time testing it out using the local development environments.

## Getting Started

Browse the files to test out the behaviour. Here are some examples where you could start:

- [A Generic Markdown Document](./Rendering/Generic Document 1.md)
- [Syntax Highlighting](./Syntax Highlighting/Start.md)
