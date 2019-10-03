git = require('git-utils');
opn = require('opn');
repository = git.open('.')

var openMr = function (targetBranch, opt = {}) {
    if (repository) {
        const branchName = repository.getShortHead();
        let url = `${getRemoteUrl()}/merge_requests/new?merge_request[source_branch]=${branchName}&merge_request[target_branch]=${targetBranch}`;
        if (opt.title) {
            url += `&merge_request[title]=${opt.title}`
        }
        opn(encodeURI(url));
    } else {
        console.error('No Repository')
    }
};

function getRemoteUrl() {
    let remoteRef = String(repository.getConfigValue('remote.origin.url'));
    if (remoteRef.indexOf('@') != -1) {
        remoteRef = remoteRef.replace(':', '/');
        remoteRef = remoteRef.replace(remoteRef.substring(0, remoteRef.indexOf('@') + 1), 'http://');
    }
    remoteRef = remoteRef.replace('.git', '');
    if (!remoteRef) {
        throw new Error('Null on Remote URL');
    }
    return remoteRef;
}

// Allows us to call this function from outside of the library file.
// Without this, the function would be private to this file.
exports.openMr = openMr;