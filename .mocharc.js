'use strict';

module.exports = {
  require: ['./test/setup.js'],
  extension: ["ts"],
  spec: ["test/**/*.js", "test/**/*.spec.ts"],
  require: "ts-node/register/transpile-only"
};
