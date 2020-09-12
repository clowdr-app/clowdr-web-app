import 'jest-localstorage-mock';
import { cleanup } from '@testing-library/react-hooks';
import initParse from './initParse';
import { initTestDB, TestDBData } from './initTestDB';
import dotenv from 'dotenv';

export let testData: TestDBData;

dotenv.config();

beforeAll(async () => {
    jest.useRealTimers();
    testData = await initTestDB();
    initParse();
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
