/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrCon class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This model builds and displays a context menu based on where
 *                  the oncontextmenu event occurred.
 *
 * END HEADER
 */

const {remote}          = require('electron');
const {Menu, MenuItem}  = remote;
const {trans}           = require('../common/lang/i18n.js');

/**
 * ZettlrCon class
 */
class ZettlrCon
{
    /**
     * Create the object.
     * @param {ZettlrBody} parent Body element.
     */
    constructor(parent) {
        this.parent = parent;
        this.menu = new Menu();
    }

    /**
     * Build the context menu.
     * @param  {Event} event The JavaScript event containing information for the menu
     * @return {void}       Nothing to return.
     */
    build(event) {
        delete this.menu;
        this.menu = new Menu();
        let elem = $(event.target);
        let label;
        let hash;

        // First: determine where the click happened (preview pane, directories or editor)
        if(elem.parents('#preview').length > 0) {
            if(elem.hasClass('directory')) {
                // No context menus for directories
                return;
            }
            // In case of preview, our wanted elements are: the strong-tag (containing
            // the name) inside the <li> and the data-hash attr inside the <li>
            if(elem.is('li')) {
                // Already got it
                label = elem.children('strong').first().text();
                hash = elem.attr('data-hash');
            } else if(elem.is('strong')) {
                label = elem.text();
                hash = elem.parent().attr('data-hash');
            } else if(elem.is('span')) {
                label = elem.parent().children('strong').first().text();
                hash = elem.parent().attr('data-hash');
            }

            // Now build
            let that = this;
            this.menu.append(new MenuItem({ 'label': trans('menu.rename_file'), click(item, win) {
                that.parent.parent.handleEvent(null, {
                    'command': 'file-rename',
                    'content': { 'hash': hash }
                });
            }}));
            this.menu.append(new MenuItem({ 'label': trans('menu.delete_file'), click(item, win) {
                that.parent.parent.handleEvent(null, {
                    'command': 'file-delete',
                    'content': { 'hash': hash }
                });
            }}));
            this.menu.append(new MenuItem({ 'type': 'separator' }));
            this.menu.append(new MenuItem({ 'label': trans('menu.quicklook'), click(item, win) {
                that.parent.parent.handleEvent(null, {
                    'command': 'quicklook',
                    'content': { 'hash': hash }
                });
            }}));

        } else if(elem.parents('#directories').length > 0) {
            // In case of directories, our wanted elements are: Only the <li>s
            if(elem.is('li') || elem.is('span')) {
                if(elem.is('span')) {
                    elem = elem.parent();
                }

                label = elem.text();
                hash = elem.attr('data-hash');

                // Now build
                let that = this;

                // Only add rename/remove options if not root dir
                if(elem.attr('id') !== 'root') {
                    this.menu.append(new MenuItem({ 'label': trans('menu.rename_dir'), click(item, win) {
                        that.parent.parent.handleEvent(null, {
                            'command': 'dir-rename',
                            'content': { 'hash': hash }
                        });
                    } }));
                    this.menu.append(new MenuItem({ 'label': trans('menu.delete_dir'), click(item, win) {
                        that.parent.parent.handleEvent(null, {
                            'command': 'dir-delete',
                            'content': { 'hash': hash }
                        });
                    }}));
                    this.menu.append(new MenuItem({ 'type': 'separator' }));
                }

                this.menu.append(new MenuItem({ 'label': trans('menu.new_file'), click(item, win) {
                    that.parent.parent.handleEvent(null, {
                        'command': 'file-new',
                        'content': { 'hash': hash }
                    });
                } }));
                this.menu.append(new MenuItem({ 'label': trans('menu.new_dir'), click(item, win) {
                    that.parent.parent.handleEvent(null, {
                        'command': 'dir-new',
                        'content': { 'hash': hash }
                    });
                } }));
            }
        } else if(elem.parents('#editor').length > 0) {
            // If the word is spelled wrong, request suggestions
            let suggestions = [];
            if(elem.hasClass('cm-spell-error')) {
                suggestions = this.parent.parent.typoSuggest(elem.text());
            }
            if(suggestions.length > 0) {
                // Select the word under the cursor if there are suggestions.
                // Makes it easier to replace them
                this.parent.parent.editor.selectWordUnderCursor();
                let self = this;
                for(let sug of suggestions) {
                    this.menu.append(new MenuItem({ label: sug, click(item, win) {
                        self.parent.parent.editor.replaceWord(sug);
                    } }));
                }
                this.menu.append(new MenuItem({ type: 'separator' }));
            } else {
                this.menu.append(new MenuItem({
                    label: trans('menu.no_suggestions'),
                    enabled: 'false'
                }));
                this.menu.append(new MenuItem({ type: 'separator' }));
            }

            let that = this;
            // Just build -- these menu items will only trigger CodeMirror actions
            this.menu.append(new MenuItem({
                label: trans('menu.bold'),
                accelerator: 'CmdOrCtrl+B',
                click(item, win) {
                that.parent.parent.handleEvent(null, {
                    'command': 'cm-command',
                    'content': 'markdownBold'
                });
            }}));
            this.menu.append(new MenuItem({
                label: trans('menu.italic'),
                accelerator: 'CmdOrCtrl+I',
                click(item, win) {
                that.parent.parent.handleEvent(null, {
                    'command': 'cm-command',
                    'content': 'markdownItalic'
                });
            } }));
            this.menu.append(new MenuItem({type: 'separator'}));
            this.menu.append(new MenuItem({
                label: trans('menu.insert_link'),
                accelerator: 'CmdOrCtrl+K',
                click(item, win) {
                that.parent.parent.handleEvent(null, {
                    'command': 'cm-command',
                    'content': 'markdownLink'
                });
            } }));

            this.menu.append(new MenuItem( { label: trans('menu.insert_ol'), click(item, win) {
                that.parent.parent.handleEvent(null, {
                    'command': 'cm-command',
                    'content': 'markdownMakeOrderedList'
                });
            } }));
            this.menu.append(new MenuItem( { label: trans('menu.insert_ul'), click(item, win) {
                that.parent.parent.handleEvent(null, {
                    'command': 'cm-command',
                    'content': 'markdownMakeUnorderedList'
                });
            } }));
            /*this.menu.append(new MenuItem( { label: 'Blockquote' }));*/
            this.menu.append(new MenuItem( { type: 'separator' } ));
            this.menu.append(new MenuItem( { label: trans('menu.cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' }));
            this.menu.append(new MenuItem( { label: trans('menu.copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' }));
            this.menu.append(new MenuItem( { label: trans('menu.paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' }));
            this.menu.append(new MenuItem( { type: 'separator' } ));
            this.menu.append(new MenuItem( { label: trans('menu.select_all'), role: 'selectall', accelerator: 'CmdOrCtrl+A' }));
        } else if(elem.is('input[type="text"]') || elem.is('textarea')) {
            // Generate default text context menu
            this.menu.append(new MenuItem( { label: trans('menu.cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' }));
            this.menu.append(new MenuItem( { label: trans('menu.copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' }));
            this.menu.append(new MenuItem( { label: trans('menu.paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' }));
            this.menu.append(new MenuItem( { type: 'separator' } ));
            this.menu.append(new MenuItem( { label: trans('menu.select_all'), role: 'selectall', accelerator: 'CmdOrCtrl+A' }));
        }
    }

    /**
     * Display the popup using the event passed by ZettlrBody
     * @param  {Event} event The oncontextmenu event
     * @return {void}       Nothing to return.
     */
    popup(event) {
        this.build(event);
        if(this.menu.items.length > 0) {
            this.menu.popup();
        }
    }
}

module.exports = ZettlrCon;
