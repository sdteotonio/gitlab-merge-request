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
        throw new Error('\x1b[31m[Null on Remote URL]');
    }
    gitInfo.remoteUrl = remoteRef;
    gitInfo.domain = domainRegex.exec(remoteRef)[0]
    gitInfo.projectPath = remoteRef.replace(domainRegex, '');
    gitInfo.projectPath = gitInfo.projectPath.replace(/\//, '');
    gitInfo.projectPathEncoded = encodeURIComponent(gitInfo.projectPath);
    if (gitInfo.domain.indexOf('gitlab') === -1) {
        throw new Error('\x1b[31m[Is a not GitLab repository]')
    }
    return gitInfo;
}

function getToken() {
    const token = exeCommand('git config --get gitlab.token');
    if (token) {
        return token;
    }
    console.log('\x1b[33m%s\x1b[0m[Please, declare glmr.token git config \n git config --add gitlab.token "<GITLAB-ACCESS-TOKEN>"]');
    throw new Error()
}


function createMergeParams(mergeRequestDefaultUrl, optLocal) {
    const deafults = getDefaults();
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
    if (deafults.remove != '' && (optLocal['remove'] == null && !optLocal['not-remove'])) {
        mergeRequestDefaultUrl += `&remove_source_branch=${deafults.remove}`;
    } else if (optLocal['not-remove'] != null && optLocal['remove'] == null) {
        mergeRequestDefaultUrl += `&remove_source_branch=${!optLocal['not-remove']}`;
    } else if (optLocal['remove'] != null) {
        mergeRequestDefaultUrl += `&remove_source_branch=${optLocal['remove']}`;
    }
    return mergeRequestDefaultUrl;
}

function getDefaults() {
    return {
        remove: getDefaultValue('remove')
    }
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
                console.log(`\x1b[31m[Target branch '${targetBranch}' do not exists on remote repository]`);
                return;
            }
        });
    })
}

function getUser(userName, callback) {
    const urlGetMembers = `${gitInfo.domain}/${gitlabApiV}/users?username=${userName}&private_token=${getToken()}`;
    if (opt.verbose) {
        console.log('\x1b[36m[User Request URI]:\n ', urlGetMembers);
    }
    request.get(urlGetMembers, { json: true }, (err, res, body) => {
        if (err) { return console.log('\x1b[31mERROR: ', err); }
        if (res.statusCode === 200) {
            if (body.length > 0) {
                return callback(body[0]);
            } else {
                console.log(`\x1b[31m[User '${userName}' Not Found]`);
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
        console.log('\x1b[36m[Merge Request URI]:\n ', mergeRequestUrl);
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
    console.log('\tWeb URL:\x1b[33m%s\x1b[0m ', ` ${mrBody.web_url + '/diffs'}`);
    console.log('\x1b[36m%s\x1b[0m', '####### *');
}

function sendMergeRequest(mergeRequestUrl) {
    if (!mergeRequestUrl) return;
    if (opt['not-send']) {
        console.log('Web URI:\x1b[33m%s\x1b[0m ', ` ${mergeRequestUrl}`);
        return;
    }
    request.post(mergeRequestUrl, { json: true }, (err, res, body) => {
        if (err) { return console.log('\x1b[31mERROR: ', err); }
        if (res.statusCode === 404) {
            console.log('\x1b[31m[Error]\n ', mergeRequestUrl);
        }
        if (res.statusCode === 201) {
            logSuccessMr(body);
        }
        if (res.statusCode === 422) {
            console.log('\x1b[31m[Error]\n ', body.error);
        }
        if (body.message) {
            console.log(body.message);
        }
    });
}

function getDefaultValue(key) {
    return exeCommand(`git config --get glmr.${key}`)
}

var openMr = function (targetBranch, options = {}) {
    opt = options;
    gitInfo = getGitInfo();
    targetBranch = targetBranch || getDefaultValue('target');
    if (!targetBranch) {
        console.log('\x1b[31m', '[Default Target Branch not defined].');
        console.log('\x1b[33m%s\x1b[0m', 'Use:');
        console.log('glmr target-branch');
        console.log('\x1b[33m%s\x1b[0m', 'Or Set Default Branch:');
        console.log('git config --add glmr.target "target-branch"');
        return;
    }
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
            console.error('\x1b[31m', error.message);
        }
    }
};



exports.openMr = openMr;