'use strict';
const MongoClient = require('mongodb').MongoClient;
const gulp        = require('gulp');
// tests
const istanbul    = require('gulp-istanbul');
const mocha       = require('gulp-mocha');

const DEV_DB_URI = 'mongodb://localhost:27017/h-workspace-dev';

gulp.task('pre-test', function () {
  return gulp.src(['server/controllers/**/*.js', 'server/models/**/*.js', 'shared/**/*.js'])
    // Covering files
    .pipe(istanbul())
    // Force `require` to return covered files
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function () {
  return gulp.src(['test/tests/**/*.js'])
    .pipe(mocha())
    // Creating the reports after tests ran
    .pipe(istanbul.writeReports())
    // Enforce a coverage of at least 90%
    .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});

/**
 * Drops the database
 */
gulp.task('drop-db', function (done) {
  // connect
  var _db;

  MongoClient.connect(DEV_DB_URI)
    .then((db) => {
      _db = db;
      return db.dropDatabase();
    })
    .then(() => {
      return _db.close(true, done);
    })
    .catch(done);
});
