// Class independent helper functions

// Basic hashing function (thanks to https://stackoverflow.com/a/7616484)
function hash(string)
{
    let hash = 0, i, chr;
    if (string.length === 0) return hash;

    for(i = 0; i < string.length; i++) {
        chr = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

// This function can sort an array of ZettlrFile and ZettlrDir objects
function sort(arr)
{
    // First sort through children array (necessary if new children were added)
    arr.sort((a, b) => {
        // Negative return: a is smaller b
        if(a.name < b.name) {
            return -1;
        } else if(a.name > b.name) {
            return 1;
        } else {
            return 0;
        }
    });

    // Now split the array into files and directories and concat again
    let f = [];
    let d = [];

    for(let c of arr) {
        if(c.type === 'file') {
            f.push(c);
        } else if(c.type === 'directory') {
            d.push(c);
        }
    }

    // Return sorted array
    return f.concat(d);
}

// This function generates a (per second unique) name
function generateName()
{
    let date = new Date();
    let yyyy = date.getFullYear();
    let mm = date.getMonth() + 1;
    if(mm <= 9) mm =  '0' + mm;
    let dd = date.getDate();
    if(dd <= 9) dd = '0' + dd;
    let hh = date.getHours();
    if(hh <= 9) hh =  '0' + hh;
    let m = date.getMinutes();
    if(m <= 9) m =  '0' + m;
    let ss = date.getSeconds();
    if(ss <= 9) ss =  '0' + ss;
    let add = yyyy + "-" + mm + "-" + dd + " " + hh + ":" + m + ":" + ss;

    return "New file " + add + ".md";
}

module.exports = { hash, sort, generateName };
