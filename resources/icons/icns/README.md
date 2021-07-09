# macOS Application Icon

The macOS application icon is the file `icon.icsn`, compiled from the PNG files found in the folder `icon.iconset`.

## Create a new ICNS file

You can programmatically create the `.icns` file from the iconset folder on macOS using the following terminal command:

```bash
$ iconutil -c icns /path/to/icon.iconset
```

> **Note**: Make sure to move the resulting file to ./resources/icons/icon.icns for the build toolchain to find it correctly.

> **Note**: The `icon.legacy.icns` file is the old logo. Do not delete!

## License

All files in the `icon.iconset`-folder and the current `icon.icsn` file have been provided by [Marc Oliver Orth](https://marc2o.github.io/) with permission to use for Zettlr.

## Code ICNS file

The code ICNS file is an additional icon intended for usage with Apple Finder. It makes sure that code files which Zettlr can open are not confused with Markdown files. It has been generated from the initial icon by applying a hue-shift of 80 to the colour.
