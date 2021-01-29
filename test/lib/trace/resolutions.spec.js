"use strict";

const path = require("path");

const { normalizeFileKeys } = require("../../../lib/util/path");
const { resolveMisses } = require("../../../lib/trace/resolutions");

const addResolveMisses = ({ resolved = [], missed = {} } = {}) => ({
  resolved,
  missed
});

describe("lib/trace/resolutions", () => {
  describe("#resolveMisses", () => {
    it("handles base cases", () => {
      expect(resolveMisses()).to.eql(addResolveMisses());
      expect(resolveMisses({ resolutions: {} })).to.eql(addResolveMisses());
    });

    it("detects application sources resolutions", () => {
      expect(resolveMisses({
        resolutions: normalizeFileKeys({
          map: {
            "./src/one/index.js": []
          }
        }),
        misses: {
          [path.resolve(path.normalize("src/one/index.js"))]: [
            {
              src: "require(process.env.DYNAMIC_ONE)"
            }
          ],
          [path.resolve(path.normalize("src/two/index.js"))]: [
            {
              src: "require(process.env.DYNAMIC_TWO)"
            }
          ]
        }
      })).to.eql(addResolveMisses({
        resolved: [
          path.resolve(path.normalize("src/one/index.js"))
        ],
        missed: {
          [path.resolve(path.normalize("src/two/index.js"))]: [
            {
              src: "require(process.env.DYNAMIC_TWO)"
            }
          ]
        }
      }));
    });

    it("detects package resolutions", () => {
      const onePath = path.resolve(path.normalize("node_modules/one/index.js"));
      const twoPath = path.resolve(path.normalize(
        "node_modules/one/node_modules/@scope/two/index.js"
      ));
      const twoMissPath = path.resolve(path.normalize("node_modules/@scope/two/miss.js"));
      expect(resolveMisses({
        resolutions: normalizeFileKeys({
          map: {
            "one/index.js": [],
            "@scope/two/index.js": []
          }
        }),
        misses: {
          [onePath]: [
            {
              src: "require(process.env.DYNAMIC_ONE)"
            }
          ],
          [twoPath]: [
            {
              src: "require(process.env.DYNAMIC_TWO)"
            }
          ],
          [twoMissPath]: [
            {
              src: "require(process.env.DYNAMIC_TWO_MISS)"
            }
          ]
        }
      })).to.eql(addResolveMisses({
        resolved: [
          onePath,
          twoPath
        ],
        missed: {
          [twoMissPath]: [
            {
              src: "require(process.env.DYNAMIC_TWO_MISS)"
            }
          ]
        }
      }));
    });
  });
});
