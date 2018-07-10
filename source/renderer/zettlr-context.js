/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrCon class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
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
 * This class is a wrapper for the remote Menu class. What it does is basically
 * being called by ZettlrBody object, and then determine from the event itself,
 * how the context menu should be built. For instance, it will build a different
 * context menu, if it detects the parent #editor-element, or the #directories.
 * What I just realized is, that the context menu is **reference hell**, so in
 * a future version, the context menu should be moved to ... like the renderer.
 * Or, even better: the main process (because then it does not lock the renderer
 * on generation, making the experience smoother.)
 */
class ZettlrCon
{
    /**
     * Create the object.
     * @param {ZettlrBody} parent Body element.
     */
    constructor(parent) {
        this._body = parent;
        this._menu = new Menu();
    }

    /**
     * Build the context menu.
     * @param  {Event} event The JavaScript event containing information for the menu
     * @return {void}       Nothing to return.
     */
    _build(event) {
        delete this._menu;
        this._menu = new Menu();
        let elem = $(event.target);
        let label;
        let hash;

        // First: determine where the click happened (preview pane, directories or editor)
        if(elem.parents('#preview').length > 0) {
            if(elem.hasClass('directory')) {
                // No context menus for directories
                return;
            }
            // In case of preview, our wanted elements are: the p.filename-tag (containing
            // the name) inside the <li> and the data-hash attr inside the <li>
            let vdfile = false; // Is this file part of a virtual directory?
            let vdhash = undefined;
            if(elem.is('li')) {
                // Already got it
                label = elem.children('p.filename').first().text();
                hash = elem.attr('data-hash');
                vdfile = (elem.hasClass('vd-file')) ? true : false;
                if(vdfile) {
                    vdhash = elem.attr('data-vd-hash');
                }
            } else if(elem.is('p') && elem.hasClass('filename')) {
                label = elem.text();
                hash = elem.parent().attr('data-hash');
                vdfile = (elem.parent().hasClass('vd-file')) ? true : false;
                if(vdfile) {
                    vdhash = elem.parent().attr('data-vd-hash');
                }
            } else if(elem.is('span')) {
                label = elem.parent().children('p.filename').first().text();
                hash = elem.parent().attr('data-hash');
                vdfile = (elem.parent().hasClass('vd-file')) ? true : false;
                if(vdfile) {
                    vdhash = elem.parent().attr('data-vd-hash');
                }
            }

            // Now build
            let that = this;
            this._menu.append(new MenuItem({ 'label': trans('menu.rename_file'), click(item, win) {
                that._body.getRenderer().handleEvent('file-rename', { 'hash': hash });
            }}));
            this._menu.append(new MenuItem({ 'label': trans('menu.delete_file'), click(item, win) {
                that._body.getRenderer().handleEvent('file-delete', { 'hash': hash });
            }}));
            // Enable removal of files from virtual directories
            if(vdfile) {
                this._menu.append(new MenuItem({ 'label': trans('menu.delete_from_vd'), click(item, win) {
                    that._body.getRenderer().handleEvent('file-delete-from-vd', { 'hash': hash, 'virtualdir': vdhash });
                }}));
            }
            this._menu.append(new MenuItem({ 'type': 'separator' }));
            this._menu.append(new MenuItem({ 'label': trans('menu.quicklook'), click(item, win) {
                that._body.getRenderer().handleEvent('quicklook', { 'hash': hash });
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
                if(!elem.hasClass('root')) {
                    this._menu.append(new MenuItem({ 'label': trans('menu.rename_dir'), click(item, win) {
                        that._body.getRenderer().handleEvent('dir-rename', { 'hash': hash });
                    } }));
                    this._menu.append(new MenuItem({ 'label': trans('menu.delete_dir'), click(item, win) {
                        that._body.getRenderer().handleEvent('dir-delete', { 'hash': hash });
                    } }));
                    this._menu.append(new MenuItem({ 'type': 'separator' }));
                }

                // Only add new file, dir and virtual dir-options if directory
                if(elem.hasClass('directory')) {
                    this._menu.append(new MenuItem({ 'label': trans('menu.new_file'), click(item, win) {
                        that._body.getRenderer().handleEvent('file-new', { 'hash': hash });
                    } }));
                    this._menu.append(new MenuItem({ 'label': trans('menu.new_dir'), click(item, win) {
                        that._body.getRenderer().handleEvent('dir-new', { 'hash': hash });
                    } }));
                    this._menu.append(new MenuItem({ 'label': trans('menu.new_vd'), click(item, win) {
                        that._body.getRenderer().handleEvent('dir-new-vd', { 'hash': hash });
                    } }));

                    this._menu.append(new MenuItem({ 'type': 'separator' }));
                    if(elem.hasClass('project')) {
                        this._menu.append(new MenuItem({ 'label': trans('menu.remove_project'), click(item, win) {
                            that._body.getRenderer().handleEvent('dir-remove-project', { 'hash': hash });
                        } }));
                        this._menu.append(new MenuItem({ 'label': trans('menu.project_properties'), click(item, win) {
                            that._body.getRenderer().handleEvent('dir-project-properties', { 'hash': hash });
                        } }));
                        this._menu.append(new MenuItem({ 'label': trans('menu.project_build'), click(item, win) {
                            that._body.getRenderer().handleEvent('dir-project-export', { 'hash': hash });
                        } }));
                    } else {
                        this._menu.append(new MenuItem({ 'label': trans('menu.new_project'), click(item, win) {
                            that._body.getRenderer().handleEvent('dir-new-project', { 'hash': hash });
                        } }));
                    }
                }

                if(elem.hasClass('root')) {
                    // Root dirs can be closed
                    this._menu.append(new MenuItem({ 'type': 'separator' }));
                    this._menu.append(new MenuItem({ 'label': trans('menu.close_dir'), click(item, win) {
                        that._body.getRenderer().handleEvent('root-close', { 'hash': hash });
                    }}));
                }
            } else if(elem.is('div') && elem.hasClass('file')) {
                // Standalone root file selected
                label = elem.text();
                hash = elem.attr('data-hash');
                let that = this;
                this._menu.append(new MenuItem({ 'label': trans('menu.rename_file'), click(item, win) {
                    that._body.getRenderer().handleEvent('file-rename', { 'hash': hash });
                }}));
                this._menu.append(new MenuItem({ 'label': trans('menu.delete_file'), click(item, win) {
                    that._body.getRenderer().handleEvent('file-delete', { 'hash': hash });
                }}));
                this._menu.append(new MenuItem({ 'type': 'separator' }));
                this._menu.append(new MenuItem({ 'label': trans('menu.close_file'), click(item, win) {
                    that._body.getRenderer().handleEvent('root-close', { 'hash': hash });
                }}));
            }
        } else if(elem.parents('#editor').length > 0) {
            // If the word is spelled wrong, request suggestions
            let suggestions = [];
            if(elem.hasClass('cm-spell-error')) {
                suggestions = this._body.getRenderer().typoSuggest(elem.text());
            }
            if(suggestions.length > 0) {
                // Select the word under the cursor if there are suggestions.
                // Makes it easier to replace them
                this._body.getRenderer().getEditor().selectWordUnderCursor();
                let self = this;
                for(let sug of suggestions) {
                    this._menu.append(new MenuItem({ label: sug, click(item, win) {
                        self._body.getRenderer().getEditor().replaceWord(sug);
                    } }));
                }
                this._menu.append(new MenuItem({ type: 'separator' }));
            } else {
                this._menu.append(new MenuItem({
                    label: trans('menu.no_suggestions'),
                    enabled: 'false'
                }));
                this._menu.append(new MenuItem({ type: 'separator' }));
            }

            let that = this;
            // Just build -- these menu items will only trigger CodeMirror actions
            this._menu.append(new MenuItem({
                label: trans('menu.bold'),
                accelerator: 'CmdOrCtrl+B',
                click(item, win) {
                that._body.getRenderer().handleEvent('cm-command', 'markdownBold');
            }}));
            this._menu.append(new MenuItem({
                label: trans('menu.italic'),
                accelerator: 'CmdOrCtrl+I',
                click(item, win) {
                that._body.getRenderer().handleEvent('cm-command', 'markdownItalic');
            } }));
            this._menu.append(new MenuItem({type: 'separator'}));
            this._menu.append(new MenuItem({
                label: trans('menu.insert_link'),
                accelerator: 'CmdOrCtrl+K',
                click(item, win) {
                that._body.getRenderer().handleEvent('cm-command', 'markdownLink');
            } }));

            this._menu.append(new MenuItem( { label: trans('menu.insert_ol'), click(item, win) {
                that._body.getRenderer().handleEvent('cm-command', 'markdownMakeOrderedList');
            } }));
            this._menu.append(new MenuItem( { label: trans('menu.insert_ul'), click(item, win) {
                that._body.getRenderer().handleEvent('cm-command', 'markdownMakeUnorderedList');
            } }));
            /*this.menu.append(new MenuItem( { label: 'Blockquote' }));*/
            this._menu.append(new MenuItem( { type: 'separator' } ));
            this._menu.append(new MenuItem( { label: trans('menu.cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' }));
            this._menu.append(new MenuItem( { label: trans('menu.copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' }));
            this._menu.append(new MenuItem( { label: trans('menu.paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' }));
            this._menu.append(new MenuItem( { type: 'separator' } ));
            this._menu.append(new MenuItem( { label: trans('menu.select_all'), role: 'selectall', accelerator: 'CmdOrCtrl+A' }));
        } else if(elem.is('input[type="text"]') || elem.is('textarea')) {
            // Generate default text context menu
            this._menu.append(new MenuItem( { label: trans('menu.cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' }));
            this._menu.append(new MenuItem( { label: trans('menu.copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' }));
            this._menu.append(new MenuItem( { label: trans('menu.paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' }));
            this._menu.append(new MenuItem( { type: 'separator' } ));
            this._menu.append(new MenuItem( { label: trans('menu.select_all'), role: 'selectall', accelerator: 'CmdOrCtrl+A' }));
        }
    }

    /**
     * Display the popup using the event passed by ZettlrBody
     * @param  {Event} event The oncontextmenu event
     * @return {void}       Nothing to return.
     */
    popup(event) {
        this._build(event);
        if(this._menu.items.length > 0) {
            // Open at click coords even the user may have moved the mouse
            this._menu.popup({ 'x': event.clientX, 'y': event.clientY});
        }
    }
}

module.exports = ZettlrCon;
