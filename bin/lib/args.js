"use strict";

const path = require("path");
const fs = require("fs");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);

const yargs = require("yargs/yargs");
const yaml = require("yaml");

const { version } = require("../../package.json");
const NAME = "trace-pkg";
const YAML_EXTS = [".json", ".yml", ".yaml"]; // YAML parser handles JSON too.

// Mockable JS loader.
const _loader = {
  require
};

const getArgs = async (args) => {
  args = args || yargs.hideBin(process.argv);

  // Parse
  const parsed = yargs(args)
    .usage(`Usage: ${NAME} [options]`)
    // Files
    .option("config", {
      alias: "c",
      describe: "Path to configuration file",
      type: "string",
      required: true
    })
    .option("concurrency", {
      describe: "Parallel processes to use (default: 1)",
      type: "number"
    })
    .option("dry-run", {
      alias: "d",
      describe: "Don't actually produce output bundle",
      type: "boolean"
    })
    .option("report", {
      alias: "r",
      describe: "Generate extended report",
      type: "boolean"
    })
    .option("silent", {
      alias: "s",
      describe: "Don't ouput logs to the console",
      type: "boolean"
    })
    // Logistical
    .exitProcess(false)
    .help()
    .alias("help", "h")
    .version(version)
    .alias("version", "v")
    .strict();

  // Validate
  const { argv } = parsed;
  const opts = {
    help: !!argv.help,
    version: !!argv.version,
    dryRun: !!argv.dryRun,
    concurrency: argv.concurrency,
    report: argv.report,
    silent: argv.silent
  };

  // Convert config file to full object.
  if (typeof argv.config !== "undefined") {
    try {
      if (YAML_EXTS.includes(path.extname(argv.config))) {
        // Try YAML first if suffix match.
        const buf = await readFile(argv.config);
        opts.config = opts.config || yaml.parse(buf.toString());
      } else {
        // Otherwise, just do a normal require().
        const jsCfg = _loader.require(path.resolve(argv.config));
        // Infer if async `config()` function present (and call it).
        opts.config = typeof jsCfg.config === "function" ? await jsCfg.config() : jsCfg;
      }
    } catch (err) {
      // Enhance message.
      err.message = `Failed to load --config file "${argv.config}" with error: ${err.message}`;
      throw err;
    }
  }

  return {
    opts
  };
};

module.exports = {
  NAME,
  getArgs,
  _loader
};
