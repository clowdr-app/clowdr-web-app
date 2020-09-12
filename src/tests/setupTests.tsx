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
    });
});

beforeEach(() => {
    localStorage.clear();
    mockIndexedDB();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.runAllImmediates();
    jest.runAllTimers();
});


afterEach(() => {
    cleanup();
});
