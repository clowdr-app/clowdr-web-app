import 'jest-localstorage-mock';
import { cleanup } from '@testing-library/react-hooks';
import initParse from './initParse';
import { generateTestData } from './initTestDB';
import dotenv from 'dotenv';
import { IBase, WholeSchema, WholeSchemaKeys } from '../classes/DataLayer/WholeSchema';

type SchemaRemapped<T> = {
    [K in keyof T]:
    T[K] extends Promise<Array<infer S>>
    ? (S extends IBase<any> ? Array<string> : never) // multiple ids
    : T[K] extends Promise<NonNullable<infer S>>
    ? (S extends IBase<any> ? string : never) // nullable id
    : T[K] extends Promise<infer S | null>
    ? (S extends IBase<any> ? string | null : never) // id
    : T[K]
};

export type TestDataT<K extends WholeSchemaKeys> = SchemaRemapped<WholeSchema[K]["value"]>;

export type TestDBData = {
    [K in WholeSchemaKeys]: Array<TestDataT<K>>
};

export let testData: TestDBData;


dotenv.config();

jest.setTimeout(60000);

beforeAll(async () => {
    jest.useRealTimers();
    testData = generateTestData().data;
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
