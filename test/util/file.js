"use strict";

const path = require("path");

const AdmZip = require("adm-zip");

const zipContents = (zipPath, { cwd } = {}) => {
  const zip = new AdmZip(cwd ? path.resolve(cwd, zipPath) : zipPath);
  return zip.getEntries().map(({ entryName }) => entryName);
};

module.exports = {
  zipContents
};
