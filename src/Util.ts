import dotenv from 'dotenv';

dotenv.config();

// TS: IS this already defined somewhere else??
export function assert(input: any): asserts input { // <-- not a typo
    if (!input) throw new Error('Assertion failed!');
}
