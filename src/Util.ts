import dotenv from 'dotenv';

dotenv.config();

// TS: IS this already defined somewhere else??
export function assert(input: any): asserts input { // <-- not a typo
    if (!input) throw new Error('Assertion failed!');
}

export type PropertyNames<S, T> = {
    [K in keyof S]: S[K] extends T ? K : never;
}[keyof S];

export type Properties<S, T> = Pick<S, PropertyNames<S, T>>;

export function PromiseNull<T>(): Promise<T | null> {
    return new Promise((resolve) => resolve(null));
}

export function PromiseInjectNull<T>(p: Promise<T> | undefined | null): Promise<T | null> {
    return p || PromiseNull();
}
