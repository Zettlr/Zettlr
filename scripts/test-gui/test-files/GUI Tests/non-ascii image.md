# Non-Ascii Characters in Image Paths

This test file is designed to see how Zettlr handles files with non-ascii characters. We've had a bug report that users could not open such images since the path is expected to contain the characters as they are, whereas URLs, and as such Zettlr's internal engine, normally encode such characters. For example, brackets such as `(` and `)` normally become `%28` and `%29`. Then, it cannot open such images externally.

Below is one such image:

![An Image with non-ASCII characters](an image with ümläuts.jpeg)

Here you can try different things and see if they work: Open it, and try to work with this image.
