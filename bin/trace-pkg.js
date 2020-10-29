#!/usr/bin/env node

"use strict";

const yargs = require("yargs/yargs");

const { version } = require("../package.json");
const createPackage = require("../lib/actions/package").package;

const NAME = "trace-pkg";

// ============================================================================
// Helpers
// ============================================================================
// TODO: REMOVE? const log = (...args) => console.log(...args); // eslint-disable-line no-console
const error = (...args) => console.error(...args); // eslint-disable-line no-console

const getArgs = (args) => {
  args = args || yargs.hideBin(process.argv);

  // Parse
  const parsed = yargs(args)
    .usage(`Usage: ${NAME} [options]`)
    // TODO: Other examples? Report?
    // Logistical
    .exitProcess(false)
    .help().alias("help", "h")
    .version(version).alias("version", "v")
    .strict();

  // Validate
  const { argv } = parsed;
  const opts = argv;

  return {
    opts
  };
};

// ============================================================================
// Script
// ============================================================================
const cli = async ({ args } = {}) => {
  const { opts } = getArgs(args);

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
  NAME,
  cli
};
