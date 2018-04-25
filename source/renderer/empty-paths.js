/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        EmptyPaths class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class creates a message that is displayed when the tree
 *                  is empty.
 *
 * END HEADER
 */

const {trans} = require('../common/lang/i18n.js');

class EmptyPaths
{
    constructor(dirobj)
    {
        this._directories = dirobj;
        this._container = $('<div>').addClass('emptyPaths'); // TODO: Translate below
        this._container.append($('<div>').addClass('info').text(trans('gui.empty_directories')));
    }

    show()
    {
        this._directories.getContainer().append(this._container);
    }

    hide()
    {
        this._container.detach();
    }
}

module.exports = EmptyPaths;
