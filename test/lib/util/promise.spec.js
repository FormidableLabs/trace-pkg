"use strict";

/* eslint-disable no-magic-numbers,promise/avoid-new,promise/no-nesting */

const { serial } = require("../../../lib/util/promise");

const delayPromise = (delayMs, val) => new Promise((resolve) => {
  setTimeout(() => resolve(val), delayMs);
});

describe("lib/util/promise", () => {
  describe("#serial", () => {
    it("handles base cases", async () => {
      await expect(serial([])).to.eventually.eql([]);
      await expect(serial([
        () => Promise.resolve(1)
      ])).to.eventually.eql([1]);
      await expect(serial([
        () => new Promise((resolve) => resolve(2))
      ])).to.eventually.eql([2]);
    });

    it("has each promise wait until previous done", async () => {
      let actuals = [];

      // Note: if the asserts _within_ the async functions fail you get an
      // extra unhandled rejection. We can clean up later as they are expected
      // to pass :)
      await expect(serial([
        async () => {
          expect(actuals).to.eql([]);
          await delayPromise(10);
          expect(actuals).to.eql([]);
          actuals.push(1);
          return 1;
        },
        async () => {
          expect(actuals).to.eql([1]);
          await delayPromise(1);
          expect(actuals).to.eql([1]);
          actuals.push(2);
          return 2;
        },
        async () => {
          expect(actuals).to.eql([1, 2]);
          await delayPromise(5);
          expect(actuals).to.eql([1, 2]);
          actuals.push(3);
          return 3;
        }
      ])).to.eventually.eql([1, 2, 3]);

      actuals = [];
      await expect(serial([
        () => Promise.resolve().then(() => {
          expect(actuals).to.eql([]);
          return delayPromise(10).then(() => {
            expect(actuals).to.eql([]);
            actuals.push(1);
            return 1;
          });
        }),
        () => Promise.resolve().then(() => {
          expect(actuals).to.eql([1]);
          return delayPromise(5).then(() => {
            expect(actuals).to.eql([1]);
            actuals.push(2);
            return 2;
          });
        }),
        () => Promise.resolve().then(() => {
          expect(actuals).to.eql([1, 2]);
          return delayPromise(1).then(() => {
            expect(actuals).to.eql([1, 2]);
            actuals.push(3);
            return 3;
          });
        })
      ])).to.eventually.eql([1, 2, 3]);
    });

    it("handles various promises", async () => {
      await expect(serial([
        () => Promise.resolve(1),
        () => new Promise((resolve) => resolve(2)),
        () => Promise.resolve(3)
      ])).to.eventually.eql([1, 2, 3]);
    });

    it("handles delayed promises", async () => {
      await expect(serial([
        () => delayPromise(5, 1),
        () => delayPromise(10, 2),
        () => delayPromise(1, 3)
      ])).to.eventually.eql([1, 2, 3]);
    });
  });
});
