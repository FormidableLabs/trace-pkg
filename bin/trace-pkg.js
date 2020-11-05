#!/usr/bin/env node

"use strict";

const { getArgs } = require("./lib/args");
const { error } = require("../lib/log");
const createPackage = require("../lib/actions/package").package;

// ============================================================================
// Script
// ============================================================================
const cli = async ({ args } = {}) => {
  const { opts } = await getArgs(args);

  if (!(opts.help || opts.version)) {
    await createPackage({ opts });
  }
};

if (require.main === module) {
  cli().catch((err) => {
    error(err);
    process.exit(1); // eslint-disable-line no-process-exit
  });
}

module.exports = {
  cli
};
