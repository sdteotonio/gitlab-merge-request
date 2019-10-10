#!/usr/bin/env node
var stdio = require('stdio');
var ops = stdio.getopt({
    'title': { key: 't', args: 1, description: 'Title for MR' },
    'user': { key: 'u', args: 1, description: 'Assignee user' },
    'source': { key: 's', args: 1, description: 'Source branch' },
    'version': { key: 'v', description: 'Version' },
    'wip': { key: 'w', description: 'Create MR with WIP status' },
    'remove': { key: 'r', description: 'Remove Source Branch' },
    'not-remove': { description: 'No Remove Source Branch', default: false },
    'not-send': { description: 'No Send Merge Request, and log URL' },
    'verbose': { description: 'Verbose Logs', default: false }
});
var myLibrary = require('../lib/index.js');
if (ops.version) {
    console.log('[GitLab Merge Request App]\n Version: ', require('../package.json').version);
} else if (ops) {
    myLibrary.openMr(ops['args'] ? ops['args'][0] : null, ops)
} else {
    console.log('Command not found.');

}