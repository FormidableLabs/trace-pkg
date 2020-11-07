"use strict";

// This will cause an unhandled trace failure.
// eslint-disable-next-line import/no-unresolved
module.exports = require("./does-not-exist.js");
