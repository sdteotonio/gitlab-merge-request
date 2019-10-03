#!/usr/bin/env node
var stdio = require('stdio');
var ops = stdio.getopt({
    'title': { key: 't', args: 1, description: 'Title for MR' },
    'wip': { key: 'wip', description: 'Open MR With WIP' }
});
var myLibrary = require('../lib/index.js');
if (ops['args'] && ops['args'][0]) {
    myLibrary.openMr(ops['args'][0], ops)
} else {
    console.info('GitLab Merge Request App');
}