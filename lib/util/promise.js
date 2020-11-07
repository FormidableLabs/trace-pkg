"use strict";

/* eslint-disable promise/no-nesting */

// Run array of promises in serial.
const serial = (proms) => proms.reduce(
  (prev, cur) => prev.then((pVals) => cur.then((cVals) => pVals.concat(cVals))),
  Promise.resolve([])
);

module.exports = {
  serial
};
