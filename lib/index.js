'use strict';
var shell = require('shelljs');
const gitlabApiV = 'api/v4';
const domainRegex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/;

const request = require('request');

function getBranchName() {
    return exeCommand(`git rev-parse --abbrev-ref HEAD`);
}

function exeCommand(com) {
    return shell.exec(com, { silent: true }).stdout.replace('\n', '');
}


function getGitInfo() {
    let gitInfo = {
        branch: getBranchName(),
        remoteUrl: null,
        domain: null,
        projectPath: null,
        projectPathEncoded: null
    }
    let remoteRef = exeCommand('git config remote.origin.url');
    if (remoteRef.indexOf('@') != -1) {
        remoteRef = remoteRef.replace(':', '/');
        remoteRef = remoteRef.replace(remoteRef.substring(0, remoteRef.indexOf('@') + 1), 'http://');
    }
    remoteRef = remoteRef.replace('.git', '');
    if (!remoteRef) {
        throw new Error('[Null on Remote URL]');
    }
    gitInfo.remoteUrl = remoteRef;
    gitInfo.domain = domainRegex.exec(remoteRef)[0]
    gitInfo.projectPath = remoteRef.replace(domainRegex, '');
    gitInfo.projectPath = gitInfo.projectPath.replace(/\//, '');
    gitInfo.projectPathEncoded = encodeURIComponent(gitInfo.projectPath);
    if (gitInfo.domain.indexOf('gitlab') === -1) {
        throw new Error('[Is a not GitLab repository]')
    }
    return gitInfo;
}

function getToken() {
    const token = exeCommand('git config --get gitlab.token');
    if (token) {
        return token;
    }
    console.log('Please, declase glmr.token git config \n git config --add gitlab.token "<GITLAB-ACCESS-TOKEN>"');
    throw new Error()
}


function createMergeParams(mergeRequestDefaultUrl, opt) {
    if (opt.title) {
        mergeRequestDefaultUrl += `&title=${encodeURI(opt.title)}`;
    } else {
        mergeRequestDefaultUrl += `&title=${encodeURI(exeCommand('git show-branch --no-name HEAD'))}`;
    }
    if (opt.source_branch) {
        mergeRequestDefaultUrl += `&source_branch=${opt.source_branch}`;
    } else {
        mergeRequestDefaultUrl += `&source_branch=${getGitInfo().branch}`;
    }
    mergeRequestDefaultUrl += `&remove_source_branch=${!opt['no-remove']}`;
    return mergeRequestDefaultUrl;
}

var openMr = function (targetBranch, opt = {}) {
    try {
        const gitInfo = getGitInfo();
        const baseMrUrl = `${gitInfo.domain}/${gitlabApiV}/projects/${gitInfo.projectPathEncoded}/merge_requests`;
        const mergeRequestUrl = createMergeParams(`${baseMrUrl}?private_token=${getToken()}&target_branch=${targetBranch}`, opt);
        if (opt.verbose) {
            console.log('[Source Branch]:\n', gitInfo.branch);
            console.log('[Target Branch]:\n', targetBranch);
            console.log('[Merge Request URI]:\n ', mergeRequestUrl);
            console.log('######## send...');
        }
        request.post(mergeRequestUrl, { json: true }, (err, res, body) => {
            if (err) { return console.log('ERROR: ', err); }
            if (res.statusCode === 404) {
                console.log('[Error]\n ', mergeRequestUrl);
            }
            if (res.statusCode === 201) {
                console.log('[Merge Request Created]\n', `${getGitInfo().remoteUrl}/merge_requests/${body.iid}/diffs`);
            }
            if (res.statusCode === 422) {
                console.log('[Error]\n ', body.error);
            }
            if (body.message) {
                console.log(body.message);
            }
        });
    } catch (error) {
        if (error.message) {
            console.error(error.message);
        }
    }
};



exports.openMr = openMr;