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
var handlebars = require('gulp-handlebars')
var wrap = require('gulp-wrap')

const lessDirectory = 'resources/less/'
const tplDirectory = 'resources/templates/'

function lessGeometry () {
  return gulp.src(lessDirectory + 'geometry/geometry-main.less')
    .pipe(plumber()) // Improve error handling
    .pipe(sourcemaps.init())
    .pipe(concat('geometry.css')) // Rename file
    .pipe(less()) // Run less
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('source/common/assets/css/'))
}

function lessThemes () {
  return gulp.src(lessDirectory + '*/theme-main.less')
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

/**
 * Precompile handlebar templates
 */
function handlebarTemplates () {
  return gulp.src(tplDirectory + '**/*.handlebars')
    .pipe(plumber()) // Improve error handling
    .pipe(handlebars({
      // Use same version of handlebars as specified in package.json
      handlebars: require('handlebars')
    }))
    // The precompilation does NOT generate standalone files, we
    // have to wrap this with module.exports to ensure it is possible to require
    // the template at runtime!
    .pipe(wrap('module.exports = <%= contents %>'))
    // Change the file name from ".js" to ".handlebars.js"
    .pipe(rename({ extname: '.handlebars.js' }))
    .pipe(gulp.dest('source/common/assets/tpl/'))
}

/**
 * Makes sure the runtime libraries are available to the renderer process
 * (as the full package won't be shipped to save space).
 */
function handlebarRuntime () {
  return gulp.src('node_modules/handlebars/dist/cjs/**/*')
    .pipe(gulp.dest('source/common/assets/handlebars/'))
}

exports.less = gulp.parallel(lessGeometry, lessThemes)
exports.handlebars = gulp.parallel(handlebarRuntime, handlebarTemplates)
exports.watch = function () {
  gulp.watch(lessDirectory + '**/*', { ignoreInitial: false }, exports.less)
  gulp.watch(tplDirectory + '**/*', { ignoreInitial: false }, handlebarTemplates)
}
