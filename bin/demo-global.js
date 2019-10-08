#!/usr/bin/env node
var stdio = require('stdio');
var ops = stdio.getopt({
    'title': { key: 't', args: 1, description: 'Title for MR' },
    'no-remove': { description: 'Remove Source Branch', default: false },
    'verbose': { description: 'Verbose', default: false }
});
var myLibrary = require('../lib/index.js');
if (ops['args'] && ops['args'][0]) {
    myLibrary.openMr(ops['args'][0], ops)
} else {
    console.info('GitLab Merge Request App');
}