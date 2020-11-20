"use strict";

const os = require("os");
const globby = require("globby");

const { smartConcat } = require("./util/array");
const { smartMerge } = require("./util/object");
const { normalizeResolutions } = require("./trace/resolutions");

// https://github.com/mrmlnc/fast-glob#options-3
const GLOBBY_OPTS = {
  dot: true,
  onlyFiles: true,
  followSymbolicLinks: true
};

// Glob wrapper
const glob = (patterns, opts) => globby(patterns, Object.assign({}, GLOBBY_OPTS, opts));

// Boolean config helper.
const getBoolean = (baseOpt, pkgOpt, defaultVal = false) => {
  if (typeof pkgOpt !== "undefined") { return pkgOpt; }
  if (typeof baseOpt !== "undefined") { return baseOpt; }
  return defaultVal;
};

// Validate configuration and create final plan.
const parseConfig = async ({
  config: { packages = {}, options = {} } = {},
  concurrency
} = {}) => {
  // Validate.
  if (!Object.keys(packages).length) {
    throw new Error("Must specify 1+ packages to create");
  }

  // Set concurrency
  if (typeof concurrency === "undefined") {
    concurrency = typeof options.concurrency !== "undefined" ? options.concurrency : 1;
  }
  if (concurrency < 1) {
    concurrency = os.cpus().length;
  }

  // Gather results in order to preserve key order for returned value.
  // eslint-disable-next-line complexity
  const results = await Promise.all(Object.entries(packages).map(async ([pkgKey, pkgCfg]) => {
    const cwd = pkgCfg.cwd || options.cwd || process.cwd();
    const output = pkgCfg.output || ((/\.zip$/).test(pkgKey) ? pkgKey : `${pkgKey}.zip`);

    // Match all trace + include files.
    const [trace, include] = await Promise.all([pkgCfg.trace, pkgCfg.include]
      .map((patterns) => patterns ? glob(patterns, { cwd }) : Promise.resolve([]))
    );

    // Validate have 1+ files to zip.
    if (!(trace.length || include.length)) {
      throw new Error(`Did not find any matching files for bundle: "${pkgKey}"`);
    }

    // Expand application resolutions to full path.
    const optsDynamic = options.dynamic || {};
    const pkgDynamic = pkgCfg.dynamic || {};

    return [pkgKey, {
      cwd,
      output,
      collapsed: {
        bail: getBoolean((options.collapsed || {}).bail, (pkgCfg.collapsed || {}).bail, true)
      },
      trace,
      traceOptions: {
        ignores: smartConcat(options.ignores, pkgCfg.ignores),
        allowMissing: smartMerge(options.allowMissing, pkgCfg.allowMissing),
        dynamic: {
          bail: getBoolean(optsDynamic.bail, pkgDynamic.bail),
          resolutions: normalizeResolutions({
            cwd,
            resolutions: smartMerge(optsDynamic.resolutions, pkgDynamic.resolutions)
          })
        }
      },
      include
    }];
  }));

  return {
    concurrency,
    packages: results.reduce((memo, [key, obj]) => {
      memo[key] = obj;
      return memo;
    }, {})
  };
};

module.exports = {
  parseConfig
};
