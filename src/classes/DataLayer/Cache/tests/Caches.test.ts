import Caches from "../Caches";

jest.mock("../Cache", () => {
    return function () {
        return {
            initialise: () => { }
        };
    };
});

const testId = "test_conference_id";

describe("Caches", () => {
    beforeEach(() => {
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
        it("creates a cache if one doesn't exist", async () => {
            let cache = await Caches.get(testId);
            expect(cache).toBeTruthy();
        });
    });
});
