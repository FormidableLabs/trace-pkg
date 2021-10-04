"use strict";

// Wrapper for dynamic import() of ESM-only packages.
// Only works in later versions of Node.js 12+

let _globby;
const _getGlobby = async () => {
  if (!_globby) {
    _globby = await import("globby");
  }

  return _globby;
};

const globby = async (...args) => {
  const _globbyImpl = await _getGlobby();
  return _globbyImpl.globby(...args);
};

// Test helper: We need to resolve all ESM-only dynamic imports before
// mocking, so just call them here.
const _resolve = async () => Promise.all([
  _getGlobby()
]);

module.exports = {
  _resolve,
  globby
};
