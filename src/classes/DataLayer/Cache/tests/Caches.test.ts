import { mocked } from 'ts-jest/utils';

import Caches from "../Caches";
import Cache from "../Cache";

jest.mock("../Cache");

const testId = "test_conference_id";

describe("Caches", () => {
    const mockedCache = mocked(Cache, true);

    beforeEach(() => {
        mockedCache.mockClear();
        Caches.clear();
    });

    describe("Count", () => {
        for (let cacheCount = 0; cacheCount < 5; cacheCount++) {
            it(`returns ${cacheCount} when ${cacheCount} caches have been created`, () => {
                for (let i = 0; i < cacheCount; i++) {
                    Caches.get(`${testId}_${i}`);
                }
                expect(Caches.Count).toBe(cacheCount);
            });
        }
    });

    describe("clear", () => {
        it("results in Count being zero", () => {
            // Make sure a cache exists
            Caches.get(testId);
            expect(Caches.Count).toBe(1);

            // Clear the caches
            Caches.clear();
            // Make sure that worked
            expect(Caches.Count).toBe(0);
        });
    });

    describe("get", () => {
        it("creates a cache if one doesn't exist", () => {
            let cache = Caches.get(testId);
            expect(cache).toBeTruthy();
            expect(Cache).toBeCalledTimes(1);
        });

        it("initialises a cache it creates", () => {
            let cache = Caches.get(testId);
            expect(cache).toBeTruthy();
            expect(Cache).toBeCalledTimes(1);
        });

        it("returns an existing cache", () => {
            Caches.get(testId);
            Caches.get(testId);
            expect(Cache).toBeCalledTimes(1);
        });
    });
});
