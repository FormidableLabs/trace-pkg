"use strict";

const AdmZip = require("adm-zip");

const zipContents = (zipPath) => {
  const zip = new AdmZip(zipPath);
  return zip.getEntries().map(({ entryName }) => entryName);
};

module.exports = {
  zipContents
};
