import dotenv from 'dotenv';

dotenv.config();

export type ParseObject = Parse.Object<Parse.Attributes>;

export type KnownKeys<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends {
    [_ in keyof T]: infer U;
} ? U : never;

export function objectKeys<T>(o: T): Array<KnownKeys<T>> {
    return Object.keys(o) as Array<KnownKeys<T>>;
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

export function intersperse<T>(array: Array<T>, inter: T): Array<T> {
    return array.flatMap(e => [inter, e]).slice(1);
}

export function removeUndefined<T>(array: Array<T | undefined>): Array<T> {
    return array.filter(x => x !== undefined) as Array<T>;
}

export function getTimeString(time: Date): string {
    const hours = time.getHours().toString().padStart(2, "0");
    const minutes = time.getMinutes().toString().padStart(2, "0");
    const seconds = time.getSeconds().toString().padStart(2, "0");
    const milliseconds = time.getMilliseconds().toString().padStart(3, "0");

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}
