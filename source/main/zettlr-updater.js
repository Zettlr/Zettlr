/**
* @ignore
* BEGIN HEADER
*
* Contains:        ZettlrUpdater class
* CVM-Role:        Controller
* Maintainer:      Hendrik Erz
* License:         MIT
*
* Description:     This class can check for new updates and display it to the
*                  user. We need this class because as Squirrel does not
*                  support Linux right now, and we want to consolidate the
*                  experience over all platforms.
*
* END HEADER
*/

const {net}      = require('electron');
const semver     = require('semver');
const {markdown} = require( "markdown" );

const REPO_URL   = require('../common/data.json').repo_url;
const CUR_VER    = require('../package.json').version;

class ZettlrUpdater
{
    constructor(app)
    {
        this._app = app;
        this._availableUpdates = [];
        this._repo = REPO_URL;
        if(this._repo[this._repo.length-1] != '/') {
            this._repo = this._repo + '/'; // Add trailing slash
        }

        this._response = '';
    }

    check()
    {
        let request = net.request(this._url('/releases'));
        request.on('response', (response) => {
            // console.log(`STATUS: ${response.statusCode}`);
            response.on('data', (chunk) => {
                // Add everything until the request is complete
                this._response = this._response + chunk;
            });
            response.on('end', () => {
                // Now parse the response.
                this._parseResponse();
            });
        });
        request.end();
    }

    _parseResponse()
    {
        // First we need to deal with it.
        this._response = JSON.parse(this._response);

        // Check if (1) our app is less than and (2) the new release is _not_ a draft
        // and (3) the new release is _not_ a prerelease (only stable for this updater)
        if(semver.lt('0.11.0', this._response[0].tag_name) && !this._response[0].draft && !this._response[0].prerelease) {
            // TODO: On mac and windows, already include the download link to easily
            // download the update and start the updater.
            let html = markdown.toHTML(this._response[0].body);
            this._app.notifyUpdate(this._response[0].tag_name, html, this._response[0].html_url);
        }
    }

    _url(type = '/')
    {
        // Failsafe
        if(type[0] === '/') {
            type = type.substr(1);
        }

        return this._repo + type;
    }
}

module.exports = ZettlrUpdater;
