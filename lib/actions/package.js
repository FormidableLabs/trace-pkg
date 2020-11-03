"use strict";

const { parseConfig } = require("../config");

const createPackage = async ({ opts } = {}) => {
  const config = await parseConfig({ config: opts.config });

  // TODO: IMPLEMENT
  // eslint-disable-next-line no-console
  console.log(require("util").inspect({
    msg: "TODO: IMPLEMENT PACKAGE",
    config
  }, {
    colors: true,
    depth: null
  }));
};

module.exports = {
  "package": createPackage
};
