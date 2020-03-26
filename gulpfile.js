var gulp = require('gulp')
var concat = require('gulp-concat')
var sourcemaps = require('gulp-sourcemaps')
var plumber = require('gulp-plumber')
var less = require('gulp-less')
var rename = require('gulp-rename')

gulp.task('less-geometry', function () {
  return gulp.src('resources/less/geometry/geometry-main.less')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(concat('geometry.css'))
    .pipe(less())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('source/common/assets/css/'))
})

gulp.task('less-themes', function () {
  return gulp.src('resources/less/*/theme-main.less')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(rename(function (path) {
      path.basename = path.dirname
      path.dirname = ''
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('source/common/assets/css/'))
})

gulp.task('less', function () {
  gulp.watch('resources/less/**/*', { ignoreInitial: false }, gulp.parallel('less-geometry', 'less-themes'))
})
