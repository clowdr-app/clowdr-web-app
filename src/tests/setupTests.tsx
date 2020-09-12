import 'jest-localstorage-mock';
import { cleanup } from '@testing-library/react-hooks';
import mockIndexedDB from './mockIndexedDB';
import initParse from './initParse';
import { initTestDB, TestDBData } from './initTestDB';

export let testData: TestDBData;

beforeAll(async () => {
    await initTestDB().then((_testData) => {
        testData = _testData;

        initParse();
        mockIndexedDB();
    });
});

beforeEach(() => {
    localStorage.clear();
    jest.useRealTimers();
});

afterEach(() => {
});


afterEach(() => {
    cleanup();
});
