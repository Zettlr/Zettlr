/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrTags class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Just some basic tag-color-description relationships. Pretty basic.
 *
 * END HEADER
 */

 const fs             = require('fs');
 const path           = require('path');

class ZettlrTags
{
    constructor(parent)
    {
        this._app = parent;
        this._file = path.join(require('electron').app.getPath('userData'), 'tags.json');
        this._tags = [];

        this._load();
    }

    /**
     * This function only (re-)reads the tags on disk.
     * @return {ZettlrTags} This for chainability.
     */
    _load()
    {
        let readConfig = {};

        // We are not checking if the user directory exists, b/c this file will
        // be loaded after the ZettlrConfig, which makes sure the dir exists.

        // Does the file already exist?
        try {
            let stats = fs.lstatSync(this._file);
            this._tags = JSON.parse(fs.readFileSync(this._file, { encoding: 'utf8' }));
        } catch(e) {
            fs.writeFileSync(this._file, JSON.stringify([]), { encoding: 'utf8' });
            return this; // No need to iterate over objects anymore
        }

        this._checkIntegrity();

        return this;
    }

    _save()
    {
        // (Over-)write the tags
        fs.writeFileSync(this._file, JSON.stringify(this._tags), { encoding: 'utf8' });

        return this;
    }

    /**
     * This file makes sure all tags fulfill certain criteria
     */
    _checkIntegrity()
    {
        let nulltag = { "name": "NULL", "color": "#ff0000", "desc": "No description given"};
        for(let tag of this._tags) {
            if(typeof tag === 'object') {
                if(!tag.hasOwnProperty('name')) {
                    tag.name = nulltag.name;
                }
                if(!tag.hasOwnProperty('color')) {
                    tag.color = nulltag.color;
                }
                if(!tag.hasOwnProperty('desc')) {
                    tag.desc = nulltag.desc;
                }
                // Make sure descriptions are short
                if(tag.desc.length > 100) {
                    tag.desc = tag.desc.substr(0, 100);
                }
            } else {
                // wtf is this? make it go away
                this._tags.splice(this._tags.indexOf(tag), 1);
            }
        }

        // Now remove all tags that fulfill the "not given" template above completely
        for(let tag of this._tags) {
            if(tag == nulltag) {
                this._tags.splice(this._tags.indexOf(tag), 1);
            }
        }

        return this;
    }

    /**
     * Returns a tag (or all, if name was not given)
     * @param  {String} [name=null] The tag to be searched for
     * @return {Object}      Either undefined (as returned by Array.find()) or the tag
     */
    get(name = null)
    {
        if(!name) {
            return this._tags;
        }

        return this._tags.find((elem) => { return elem.name == name; });
    }

    /**
     * Add or change a given tag. If a tag with "name" exists, it will be overwritten, else added.
     * @param {String} name  The tag name
     * @param {String} color The color, HTML compliant
     * @param {String} desc  A short description.
     */
    set(name, color, desc)
    {
        let tag = this.get(name);
        // Either overwrite or add
        if(tag) {
            tag = newtag;
        } else {
            this._tags.push({"name": name, "color": color, "desc": desc});
        }

        this._save();

        return this;
    }

    /**
     * Updates all tags (i.e. replaces them)
     * @param  {Array} tags The new tags as an array
     * @return {ZettlrTags} This for chainability.
     */
    update(tags)
    {
        this._tags = [];
        for(let t of tags) {
            // Only update correctly set tags
            if(t.hasOwnProperty('name') && t.hasOwnProperty('color') && t.hasOwnProperty('desc')) {
                this.set(t.name, t.color, t.desc);
            }
        }

        this._save();

        return this;
    }
}

module.exports = ZettlrTags;
