#!/usr/bin/env node
var stdio = require('stdio');
var ops = stdio.getopt({
    'title': { key: 't', args: 1, description: 'Title for MR' },
    'user': { key: 'u', args: 1, description: 'Assignee user' },
    'source': { key: 's', args: 1, description: 'Source branch' },
    'version': { key: 'v', description: 'Version' },
    'wip': { key: 'w', description: 'Create MR with WIP status' },
    'no-remove': { description: 'No Remove Source Branch', default: false },
    'verbose': { description: 'Verbose Logs', default: false }
});
var myLibrary = require('../lib/index.js');
if (ops.version) {
    console.log('[GitLab Merge Request App]\n Version: ', require('../package.json').version);
} else if (ops['args'] && ops['args'][0]) {
    myLibrary.openMr(ops['args'][0], ops)
} else {
    console.log('Command not found.');

}