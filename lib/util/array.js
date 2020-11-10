"use strict";

// Make sorted array unique.
const uniq = (val, i, arr) => i === 0 || val !== arr[i - 1];

// Concatenate two arrays and produce sorted, unique values.
const smartConcat = (arr1, arr2) => []
  // Aggregate in service-level includes first
  .concat(arr1 || [], arr2 || [])
  // Make unique.
  .sort()
  .filter(uniq);

module.exports = {
  uniq,
  smartConcat
};
