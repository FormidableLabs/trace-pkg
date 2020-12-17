"use strict";

/* eslint-disable promise/no-nesting */

// Run array of functions returning promises in serial.
const serial = (fns) => fns.reduce(
  (prev, fn) => prev.then((pVals) => fn().then((fnVals) => pVals.concat(fnVals))),
  Promise.resolve([])
);

module.exports = {
  serial
};
