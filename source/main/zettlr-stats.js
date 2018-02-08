// This class monitors word counts and keeps track of how much the user
// has written over time.

const fs            = require('fs');
const path          = require('path');
const {app}         = require('electron');

class ZettlrStats
{
    constructor(parent)
    {
        this.parent = parent;
        this.statsPath = app.getPath('userData');
        this.statsFile = path.join(this.statsPath, 'stats.json');
        this.stats = null;

        this.statstpl = {
            'wordCount': {}
        }

        this.load();
    }

    load()
    {
        this.stats = this.statstpl;

        // Check if dir exists. If not, create.
        try {
            let s = fs.lstatSync(this.statsPath);
        } catch(e) {
            fs.mkdirSync(this.statsPath);
        }

        // Does the file already exist?
        try {
            let s = fs.lstatSync(this.statsFile);
            this.stats = JSON.parse(fs.readFileSync(this.statsFile, { encoding: 'utf8' }));
        } catch(e) {
            fs.writeFileSync(this.statsFile, JSON.stringify(this.statstpl), { encoding: 'utf8' });
            return;
        }
    }

    updateWordCount(val)
    {
        if(!this.stats.hasOwnProperty('wordCount')) {
            this.stats["wordCount"] = {};
        }

        if(val < 0) {
            val = 0; // Don't substract words
        }

        // For now we only need a word count
        if(!this.stats.wordCount.hasOwnProperty(this.getDate())) {
            this.stats.wordCount[this.getDate()] = val;
        } else {
            this.stats.wordCount[this.getDate()] = this.stats.wordCount[this.getDate()] + val;
        }
    }

    // Write the statistics (e.g. on app exit)
    save()
    {
        if(this.statsFile == null || this.stats == null) {
            this.load();
        }
        // (Over-)write the configuration
        fs.writeFileSync(this.statsFile, JSON.stringify(this.stats), { encoding: 'utf8' });
    }

    // Return today's date in the form YYYY-MM-DD
    getDate()
    {
        let d = new Date();
        let yyyy = d.getFullYear();
        let mm = d.getMonth() + 1;
        if(mm <= 9) mm =  '0' + mm;
        let dd = d.getDate();
        if(dd <= 9) dd = '0' + dd;

        return yyyy + '-' + mm + '-' + dd;
    }
}

module.exports = ZettlrStats;
