# Link Resolution Test

The following are examples of links that should be opened accordingly, being resolved to valid, absolute links that `shell.openExternal` can deal with. These are also tested using the unit tests run via `yarn test`.

- [Expected: file:///foo/bar/Documents/directory/File.md](file:///foo/bar/Documents/directory/File.md)
- [Expected: http://www.example.com/](http://www.example.com/)
- [Expected: ftp://api.somelink.fm/api/test.php](ftp://api.somelink.fm/api/test.php)
- [Expected: file:////shared-host/docs/file.md](//shared-host/docs/file.md)
- [Expected: file://path/to/Zettlr/resources/test/Miescellaneous/Testfile Readability.md](file://./Testfile Readability.md)
- [Expected: https://github.com](github.com)
- [Expected: https://www.zettlr.com](www.zettlr.com)
- [Expected: file:///home/bar/documents/absolute.md](/home/bar/documents/absolute.md)
- [Expected: file:///home/foo/documents/one/relative.md](./one/relative.md)
- [Expected: file:///home/foo/documents/another/relative.md](another/relative.md)
- [A test link with parentheses](https://de.wikipedia.org/wiki/Therm_(Link))
- https://de.wikipedia.org/wiki/Therm_(Link)
