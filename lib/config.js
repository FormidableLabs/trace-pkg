"use strict";

const validate = async ({ config } = {}) => {
  if (!Object.keys((config || {}).packages || {}).length) {
    throw new Error("Must specify 1+ packages to create");
  }

  return config;
};

// Validate configuration and create final plan
const parseConfig = async ({ config }) => {
  config = await validate({ config });

  return config;
};

module.exports = {
  parseConfig
};
