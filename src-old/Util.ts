import dotenv from 'dotenv';

dotenv.config();

export type ParseObject = Parse.Object<Parse.Attributes>;

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

export function intersperse<T>(array: Array<T>, inter: T): Array<T> {
    return array.flatMap(e => [inter, e]).slice(1);
}
