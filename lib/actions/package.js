"use strict";

const createPackage = async ({ opts }) => {
  // TODO: IMPLEMENT
  // eslint-disable-next-line no-console
  console.log(require("util").inspect({
    msg: "TODO: IMPLEMENT PACKAGE",
    opts
  }, {
    colors: true,
    depth: null
  }));
};

module.exports = {
  "package": createPackage
};
