# Zettlr Arabic Edition (beta1)

An Arabised fork of [Zettlr](https://github.com/Zettlr/Zettlr) - An open-source Markdow/text editor, adapted for Arabic writers and editors.

## ✨ What's New

### Arabic Language Support
- **Complete Arabic UI Translation** - Full interface localization with professionally translated menus, dialogs, and settings
- **Arabised App Icon** - Distinctive "ز" (Zay) icon replacing the Greek Zeta, representing the Arabic Edition
- **RTL (Right-to-Left) Interface** - Native right-to-left text direction support throughout the application
- **Bidirectional Text Handling** - Seamless mixing of Arabic and Latin scripts

### Vim Mode Enhancements
- **Fixed Keyboard Layout for Vim** - Vim Normal mode commands work with Arabic keyboard layouts
  - Physical key mapping (e.g., pressing `ج` key executes `j` command)
  - Interactive training UI for modifier-based keys
  - No need to switch keyboard layouts while editing
- **Dual-Cursor System** - Advanced cursor positioning for Arabic connected scripts
  - Physical cursor tracks actual character positions
  - Visual cursor displays where text appears
  - Fixes issues with isolated vs. connected Arabic characters

### Technical Improvements
- **CodeMirror 6 Migration** - Built on Zettlr 3.6.0 with modern CM6 architecture
- **Improved Arabic Experience** - Better handling of Arabic in Vim mode

## 📦 Installation

### macOS (Apple Silicon)
```bash
# Download Zettlr-3.6.0-arm64.dmg
# After installation, remove quarantine:
sudo xattr -cr /Applications/Zettlr.app
```

### Windows (64-bit)
```bash
# Download Zettlr-3.6.0-x64.exe
# Run installer and click "More info" → "Run anyway" if SmartScreen warns
```

### Linux
**Debian/Ubuntu:**
```bash
sudo dpkg -i Zettlr-3.6.0-amd64.deb
```

**Fedora/RHEL:**
```bash
sudo rpm -i Zettlr-3.6.0-x86_64.rpm
```

**AppImage (Universal):**
```bash
chmod +x Zettlr-3.6.0-x86_64.AppImage
./Zettlr-3.6.0-x86_64.AppImage
```

## ⚙️ Configuration

### Enable Vim Fixed Keyboard Layout

1. Open **Preferences** (⌘, / Ctrl+,)
2. Go to **Editor** tab
3. Set **Input Mode** to **Vim**
4. Enable **Use Fixed Keyboard Layout for Vim Normal Mode**
5. Configure modifier keys using the training UI if needed

## ⚠️ Known Issues

- **Unsigned Builds**: These builds are not code-signed. You may need to allow installation from unidentified developers.
- **First Launch**: macOS users must run `sudo xattr -cr /Applications/Zettlr.app` after installation.
- **Performance**: Very large documents (>10,000 lines) may experience slowdowns with complex Arabic text.

## 🔗 Links

- **Original Zettlr**: https://github.com/Zettlr/Zettlr
- **Arabic Edition Repository**: https://github.com/diraneyya/Zettlr-Arabic
- **Documentation**: See `/context` folder for technical details
- **Report Issues**: https://github.com/diraneyya/Zettlr-Arabic/issues

## 🙏 Credits

- **Original Zettlr**: Hendrik Erz and contributors
- **Arabic Edition**: Orwa Diraneyya (@diraneyya)
- **Vim Plugin**: Based on [@replit/codemirror-vim](https://github.com/replit/codemirror-vim)
- **AI Assistance**: Developed with [Claude Code](https://claude.com/claude-code)

## 📄 License

GNU GPL v3.0 - Same as upstream Zettlr

---

**This is a community fork and is not officially affiliated with the Zettlr project.**