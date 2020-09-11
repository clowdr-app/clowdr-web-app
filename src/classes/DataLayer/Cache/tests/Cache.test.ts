import Cache from "../Cache";
import mockIndexedDB from "../../../../tests/mockIndexedDB";
import initParse from "../../../../tests/initParse";

const testId = "test_conference_id";

describe("Cache", () => {

    beforeAll(() => {
        initParse();
    });

    afterAll(() => {
    });

    beforeEach(() => {
        mockIndexedDB();
    });

    afterEach(() => {
        jest.runAllTimers()
    });

    it("can be constructed", () => {
        expect(new Cache(testId)).toBeDefined();
    });

    it("disables debug logging by default", () => {
        let cache = new Cache(testId);
        expect(cache.IsDebugEnabled).toBe(false);
    });

    it("enables debug logging when constructed", () => {
        // Avoid the "Debug enabled" message from the embedded Debug Logger
        const spyConsoleWarn = jest.spyOn(console, "warn").mockImplementation();

        let cache = new Cache(testId, true);
        expect(cache.IsDebugEnabled).toBe(true);

        spyConsoleWarn.mockRestore();
    });

    it("disables debug logging when constructed", () => {
        let cache = new Cache(testId, false);
        expect(cache.IsDebugEnabled).toBe(false);
    });

    describe("initialise", () => {
        it("sets IsInitialised to true", async () => {
            let cache = new Cache(testId);

            cache.initialise();

            jest.runAllImmediates();
            jest.runAllTimers();

            await cache.Ready;

            expect(cache.IsInitialised).toBe(true);
        });
    });
});
