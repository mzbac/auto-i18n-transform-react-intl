#!/usr/bin/env node
var path = require("path");
var fs = require("fs");
var lib = path.join(
  path.dirname(fs.realpathSync(__filename)),
  "../src/index.js"
);
require(lib);
