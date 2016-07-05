'use strict';

const gulp = require('gulp');
const path = require('path');
const fs = require('fs');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const runSequence = require('run-sequence');
const del = require('del');
const open = require('open');

const tmpDirectory = path.resolve(__dirname, '../../.tmp');

gulp.task('clean', function(callback) {
    del([tmpDirectory], {
        'force': true
    }).then(function() {
        fs.mkdir(tmpDirectory, callback);
    }, callback)
});

gulp.task('browserify', function() {

    return browserify(path.resolve(__dirname, '../../lib/address.js'), {
            'standalone': 'multichain.address'
        })
        .bundle()
        .pipe(source('multichain-address.js'))
        .pipe(gulp.dest(tmpDirectory));
});

gulp.task('copy-html', function() {
    return fs.createReadStream(path.resolve(__dirname, 'multichain-address.html'))
        .pipe(fs.createWriteStream(path.resolve(tmpDirectory, 'multichain-address.html')));
});

gulp.task('open', function(callback) {
    open(path.resolve(tmpDirectory, 'multichain-address.html'));
    callback();
});

gulp.task('default', function(callback) {
    runSequence(
        'clean',
        ['browserify', 'copy-html'],
        'open',
        callback
    );
});