/**
* @ignore
* BEGIN HEADER
*
* Contains:        ZettlrUpdater class
* CVM-Role:        Controller
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
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
const showdown   = require('showdown');
const isOnline   = require('is-online');

const {trans}    = require('../common/lang/i18n.js');

const REPO_URL   = require('../common/data.json').repo_url;
const CUR_VER    = require('../package.json').version;

/**
 * This class is able to check for updates based on the repository URL. It has
 * the public method `check()` that can be called. If you do, it will try to
 * call the callback with information regarding the new version, or do nothing
 * if there is no new version.
 */
class ZettlrUpdater
{
    /**
     * Create a new object from type ZettlrUpdater
     * @param {Zettlr} app The app object
     */
    constructor(app)
    {
        this._app = app;
        this._error = false;
        this._availableUpdates = [];
        this._repo = REPO_URL;
        if(this._repo[this._repo.length-1] != '/') {
            this._repo = this._repo + '/'; // Add trailing slash
        }
        this._conv = new showdown.Converter({
            'headerLevelStart': 2
        });
        this._conv.setFlavor('github');

        this._response = '';
    }

    /**
     * Check whether or not the application is online. If so, perform the actual
     * update check.
     * @return {ZettlrUpdater} Returns this for chainability.
     */
    check()
    {
        isOnline().then(online => {
            if(!online) {
                this._app.notify(trans('dialog.update.connection_error'));

            } else {
                this._fetchReleases();
            }
        });

        return this;
    }

    /**
     * This function is buffered by a connectivity check, and will only executed
     * if there is a connection, because otherwise, net will throw errors like
     * mad.
     * @return {void} Does not return anything.
     */
    _fetchReleases()
    {
        net.on('error', (err) => {
            this._app.notify(trans('dialog.update.connection_error'));
        });

        let request = net.request(this._url('/releases'));

        if(!request) {
            return this._app.notify(trans('dialog.update.connection_error'));
        }

        request.on('response', (response) => {
            if(response.statusCode >= 300) {
                if(response.statusCode >= 500) {
                    return this._app.notify(trans('dialog.update.server_error', response.statusCode));
                }
                if(response.statusCode >= 400) {
                    return this._app.notify(trans('dialog.update.client_error', response.statusCode));
                }
                if(response.statusCode >= 300) {
                    // Don't follow potentially harmful redirections (in case someone tries to mock the app)
                    return this._app.notify(trans('dialog.update.redirect_error', response.statusCode));
                }
            }
            response.on('data', (chunk) => {
                // Add everything until the request is complete
                this._response = this._response + chunk;
            });
            response.on('error', (err) => {
                this._error = true;
                this._app.notify(trans('dialog.update.transmission_error'));
            });
            response.on('end', () => {
                // Now parse the response.
                this._parseResponse();
            });
        });
        request.end();
    }

    /**
     * Is called when the response of the HTTP request is read completely.
     */
    _parseResponse()
    {
        if(this._error) {
            this._response = '';
            this._error = false;
            return; // A notification has been sent from within the asynchronous function
        }

        // Error handling
        if(this._response.trim() === '') {
            this._app.notify(trans('dialog.update.no_data'));
            this._response = '';
            return;
        }

        // First we need to deal with it.
        this._response = JSON.parse(this._response);

        // Check if (1) our app is less than and (2) the new release is _not_ a draft
        // and (3) the new release is _not_ a prerelease (only stable for this updater)
        if(semver.lt(CUR_VER, this._response[0].tag_name) && !this._response[0].draft && !this._response[0].prerelease) {
            // TODO: On mac and windows, already include the download link to easily
            // download the update and start the updater.
            let html = this._conv.makeHtml(this._response[0].body);

            // Convert links, so that they remain but do not open in the same
            // window. Security: target="_blank" (then at least they "only"
            // open a new window)
            let aRE = /<a(.+?)>(.*?)<\/a>/g;
            html = html.replace(aRE, function(match, p1, p2, offset, string) {
                return `<a${p1} onclick="require('electron').shell.openExternal(this.getAttribute('href')); return false;" target="_blank">${p2}</a>`;
            });

            let updateContent = {
                    'newVer': this._response[0].tag_name,
                    'curVer': CUR_VER,
                    'changelog': html,
                    'releaseURL': this._response[0].html_url,
                    'downloadURL': ''
                };

            this._app.getIPC().send('update-available', updateContent);
        } else {
            this._app.notify(trans('dialog.update.no_update'));
        }

        // Cleanup
        this._response = '';
    }

    /**
     * Creates the API url based on GitHub v3 API, concatenating the type of
     * request with the Repository URL
     * @param  {String} [type='/'] The action to be asked for (e.g. /release)
     * @return {String}            The callable URL
     */
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
