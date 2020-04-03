/*
  General structure of the gulp tasks is the following:
    - "gulp.src(paths)" specifying the files we want to work on
    - Some commands of the form "pipe(command)", where command is run on each file transforming it as we see fit
    - "gulp.dest" specifying the target folder to put the output

  Methods prefixed with "export" can be run using gulp, e.g. "gulp less".
*/

var gulp = require('gulp')
var concat = require('gulp-concat')
var sourcemaps = require('gulp-sourcemaps')
var plumber = require('gulp-plumber')
var less = require('gulp-less')
var rename = require('gulp-rename')

function lessGeometry () {
  return gulp.src('resources/less/geometry/geometry-main.less')
    .pipe(plumber()) // Improve error handling
    .pipe(sourcemaps.init())
    .pipe(concat('geometry.css')) // Rename file
    .pipe(less()) // Run less
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('source/common/assets/css/'))
}

function lessThemes () {
  return gulp.src('resources/less/*/theme-main.less')
    .pipe(plumber()) // Improve error handling
    .pipe(sourcemaps.init())
    .pipe(less()) // Run less
    .pipe(rename(function (path) { // Rename files
      path.basename = path.dirname
      path.dirname = ''
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('source/common/assets/css/'))
}

exports.less = gulp.parallel(lessGeometry, lessThemes)
exports.watch = function () {
  gulp.watch('resources/less/**/*', { ignoreInitial: false }, exports.less)
}
