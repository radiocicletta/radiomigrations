#!/usr/bin/env iojs
/* Merging user's informations between several services:
 * - django Users
 * - moinmoin users
 * - google groups users
 * 
 * all of the informations are encoded as json objects
 *
 * django users are retrieved using dumpdata:
 *      $ ./manage.py dumpdata auth.Users > users.json
 *
 * moinmoin users are grep-ed and regexp-ed from wiki's files:
 *      $ find  /path/to/wiki/data/user/ -type f -exec egrep '(email|password)=' {} \; | sed -e 's/\([^=]*\)=\(.*\)/"\1":"\2"/' > wiki_users.json
 * and then adjusted using vim.
 *
 * google group's users are exported in CSV format then converted
 *      $ cut -d , -f 1,2,5 users.csv | sed -e 's/^/"/; s/\,/"\,/; s/\("[^"]*"\),\("[^"]*"\),\("[^"]*"\)/{"email": \1,"name": \2,"options": \3},/' > groups_users.json
 * and then adjusted using vim.
 *
 */

var fs = require('fs'),
    json_django = JSON.parse(fs.readFileSync('users.json')),
    json_wiki = JSON.parse(fs.readFileSync('wiki_users.json')),
    json_groups = JSON.parse(fs.readFileSync('groups_users.json'));

json_django.sort(function (a,b){
    var _a = (a.fields.email.length > b.fields.email.length? b.fields.email.toLowerCase().split(): a.fields.email.toLowerCase().split()),
        _b = (a.fields.email.length > b.fields.email.length? a.fields.email.toLowerCase().split(): b.fields.email.toLowerCase().split());

    for (var i = 0; i < _a.length; i++) {
        if (_b[i] < _a[i])
            return a.fields.email.length > b.fields.email.length && -1 || 1;
    }
    return a.fields.email.length > b.fields.email.length && 1 || -1;
});

function ssort(a,b){
    var _a = (a.email.length > b.email.length? b.email.toLowerCase().split(): a.email.toLowerCase().split()),
        _b = (a.email.length > b.email.length? a.email.toLowerCase().split(): b.email.toLowerCase().split());

    for (var i = 0; i < _a.length; i++) {
        if (_b[i] < _a[i])
            return a.email.length > b.email.length && -1 || 1;
    }
    return a.email.length > b.email.length && 1 || -1;
}

json_wiki.sort(ssort);

json_groups.sort(ssort);

json_django.forEach(function(el){
    var lists = {wiki: json_wiki, groups: json_groups};
    for(var js in lists){
        var j = lists[js],
            dj_mail = el.fields.email,
            idxx = -1, i = 0, el_j;
        while (idxx < 0 && i < j.length) {
            if (dj_mail === j[i].email) {
                idxx = i;
                el_j = j[idxx];
                for (var key in el_j){
                    el.fields[js + '_' + key] = el_j[key];
                }
                j.splice(idxx, 1);
            }
            i++;
        }
    }
});

// debug output
json_django_leftover = json_django.filter(function(el){return !el.fields.wiki_email && !el.fields.groups_email;});
json_groups.forEach(function(el){console.log(el.email);});
json_django_leftover.forEach(function(el){console.log(el.fields.email);});
