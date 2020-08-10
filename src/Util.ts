import dotenv from 'dotenv';

dotenv.config();

// TS: IS this already defined somewhere else??
export function assert(input: any): asserts input { // <-- not a typo
    if (!input) throw new Error('Assertion failed!');
}

// @Jon: Why does a module called Utils have an export default??
export default {YOUTUBE_API_KEY: process.env.REACT_APP_YOUTUBE_API_KEY};
