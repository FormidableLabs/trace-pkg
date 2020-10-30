#!/usr/bin/env node

"use strict";

const fs = require("fs");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);

const yargs = require("yargs/yargs");
const yaml = require("js-yaml");

const { version } = require("../package.json");
const createPackage = require("../lib/actions/package").package;

const NAME = "trace-pkg";

// ============================================================================
// Helpers
// ============================================================================
// TODO: REMOVE? const log = (...args) => console.log(...args); // eslint-disable-line no-console
const error = (...args) => console.error(...args); // eslint-disable-line no-console

const getArgs = async (args) => {
  args = args || yargs.hideBin(process.argv);

  // Parse
  const parsed = yargs(args)
    .usage(`Usage: ${NAME} [options]`)
    // Files
    .option("config", {
      alias: "c",
      describe: "Path to configuration file",
      type: "string"
    })
    // Logistical
    .exitProcess(false)
    .help().alias("help", "h")
    .version(version).alias("version", "v")
    .strict();

  // Validate
  const { argv } = parsed;
  const opts = {
    help: !!argv.help,
    version: !!argv.version
  };

  // Convert config file to full object.
  if (typeof argv.config !== "undefined") {
    try {
      opts.config = yaml.safeLoad(await readFile(argv.config));
    } catch (err) {
      // Enhance message.
      err.message = `Failed to load --config file"${argv.config}" with error: ${err.message}`;
      throw err;
    }
  }

  return {
    opts
  };
};

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
  NAME,
  cli
};
