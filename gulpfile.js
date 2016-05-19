/*jslint node: true */
"use strict";
var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var jshint = require('gulp-jshint');

gulp.task('lint', function () {
    gulp.src(['./**/*.js', "!./node_modules/**/*"])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('develop', function () {
    nodemon({
        script: 'server.js', ext: 'html js', ignore: ['ignored.js'], tasks: ['lint']
    }).on('restart', function () {
        console.log('restarted!');
    });
});