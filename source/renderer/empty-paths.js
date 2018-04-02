/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        EmptyPaths class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This class creates a message that is displayed when the tree
 *                  is empty.
 *
 * END HEADER
 */

class EmptyPaths
{
    constructor(dirobj)
    {
        this._directories = dirobj;
        this._container = $('<div>').addClass('emptyPaths'); // TODO: Translate below
        this._container.append($('<div>').addClass('info').text('Open a file or directory'));
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
