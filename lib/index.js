'use strict';
var shell = require('shelljs');
const gitlabApiV = 'api/v4';
const domainRegex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/;
const request = require('request');
let gitInfo = null;
let opt = {};
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
    console.log('[Please, declare glmr.token git config \n git config --add gitlab.token "<GITLAB-ACCESS-TOKEN>"]');
    throw new Error()
}


function createMergeParams(mergeRequestDefaultUrl, optLocal) {
    mergeRequestDefaultUrl += `&target_branch=${optLocal.targetBranch}`;
    if (optLocal.title) {
        mergeRequestDefaultUrl += `&title=${encodeURI(optLocal.wip ? 'WIP: ' + optLocal.title : optLocal.title)}`;
    } else {
        const latestCommitMessage = exeCommand('git show-branch --no-name HEAD');
        mergeRequestDefaultUrl += `&title=${encodeURI(optLocal.wip ? 'WIP: ' + latestCommitMessage : latestCommitMessage)}`;
    }
    if (optLocal.assignee) {
        mergeRequestDefaultUrl += `&assignee_id=${optLocal.assignee}`;
    }
    if (optLocal.source) {
        mergeRequestDefaultUrl += `&source_branch=${optLocal.source}`;
    } else {
        mergeRequestDefaultUrl += `&source_branch=${getGitInfo().branch}`;
    }
    mergeRequestDefaultUrl += `&remove_source_branch=${!optLocal['no-remove']}`;
    return mergeRequestDefaultUrl;
}

function checkBranch(targetBranch) {
    const urlGetBranchs = `${gitInfo.domain}/${gitlabApiV}/projects/${gitInfo.projectPathEncoded}/repository/branches/${targetBranch}?private_token=${getToken()}`;
    if (opt.verbose) {
        console.log('[Branch Request URI]:\n ', urlGetBranchs);
    }
    return new Promise((resolve, reject) => {
        request.get(urlGetBranchs, { json: true }, (err, res, body) => {
            if (err) { return console.log('ERROR: ', err); }
            if (res.statusCode === 200) {
                return resolve();
            } else if (res.statusCode === 404) {
                console.log(`[Target branch '${targetBranch}' do not exists on remote repository]`);
                return;
            }
        });
    })
}

function getUser(userName, callback) {
    const urlGetMembers = `${gitInfo.domain}/${gitlabApiV}/users?username=${userName}&private_token=${getToken()}`;
    if (opt.verbose) {
        console.log('[User Request URI]:\n ', urlGetMembers);
    }
    request.get(urlGetMembers, { json: true }, (err, res, body) => {
        if (err) { return console.log('ERROR: ', err); }
        if (res.statusCode === 200) {
            if (body.length > 0) {
                return callback(body[0]);
            } else {
                console.log(`[User '${userName}' Not Found]`);
            }
        }
        if (body.message) {
            console.log(body.message);
        }
    });
}

function createMergeRequestUrl(params) {
    const baseMrUrl = `${gitInfo.domain}/${gitlabApiV}/projects/${gitInfo.projectPathEncoded}/merge_requests`;
    const mergeRequestUrl = createMergeParams(`${baseMrUrl}?private_token=${getToken()}`, params);
    if (opt.verbose) {
        console.log('[Merge Request URI]:\n ', mergeRequestUrl);
    }
    return mergeRequestUrl;
}

function logSuccessMr(mrBody) {
    console.log('\x1b[36m%s\x1b[0m', '\n####### [Merge Request Created]');
    if (mrBody.work_in_progress) {
        console.log(`\t*Work In Progress*`);
    }
    console.log(`\tTitle: ${mrBody.title}`);
    console.log(`\tBranchs: [Source] ${mrBody.source_branch} -> [Target] ${mrBody.target_branch}`);
    if (mrBody.assignee) {
        console.log(`\tAssignee: ${mrBody.assignee.name} <${mrBody.assignee.username}>`);
    }
    console.log(`\tChanges: ${mrBody.changes_count}`);
    console.log('\x1b[33m%s\x1b[0m', `\tWeb URL: ${mrBody.web_url + '/diffs'}`);
    console.log('####### *');
}

function sendMergeRequest(mergeRequestUrl) {
    if (!mergeRequestUrl) return;
    request.post(mergeRequestUrl, { json: true }, (err, res, body) => {
        if (err) { return console.log('ERROR: ', err); }
        if (res.statusCode === 404) {
            console.log('[Error]\n ', mergeRequestUrl);
        }
        if (res.statusCode === 201) {
            logSuccessMr(body);
        }
        if (res.statusCode === 422) {
            console.log('[Error]\n ', body.error);
        }
        if (body.message) {
            console.log(body.message);
        }
    });
}

var openMr = function (targetBranch, options = {}) {
    opt = options;
    gitInfo = getGitInfo();
    try {
        checkBranch(targetBranch).then(() => {
            if (opt.user) {
                getUser(opt.user, (user) => {
                    sendMergeRequest(createMergeRequestUrl({ ...opt, targetBranch, assignee: user.id }));
                });
            } else {
                sendMergeRequest(createMergeRequestUrl({ ...opt, targetBranch }));
            }
        })
    } catch (error) {
        if (error.message) {
            console.error(error.message);
        }
    }
};



exports.openMr = openMr;