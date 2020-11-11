"use strict";

const { smartConcat } = require("./array");

// Merge two objects of form `{ key: [] }`.
const smartMerge = (obj1 = {}, obj2 = {}) =>
  // Get all unique missing package keys.
  smartConcat(Object.keys(obj1), Object.keys(obj2))
    // Smart merge unique missing values
    .reduce((obj, key) => {
      // Aggregate service and function unique missing values.
      obj[key] = smartConcat(obj1[key], obj2[key]);
      return obj;
    }, {});

module.exports = {
  smartMerge
};
