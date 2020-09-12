export type ParseObject = Parse.Object<Parse.Attributes>;

export type KnownKeys<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends {
        [_ in keyof T]: infer U;
    } ? U : never;

export function objectKeys<T>(o: T): Array<KnownKeys<T>> {
    return Object.keys(o) as Array<KnownKeys<T>>;
}

export type NotPromisedKeys<T> = {
    [K in keyof T]: T[K] extends Promise<infer S> ? never : K;
}[keyof T];

export type NotPromisedFields<T> = {
    [K in NotPromisedKeys<T>]: T[K];
};

export type PromisedKeys<T> = {
    [K in keyof T]: T[K] extends Promise<infer S> ? K : never;
}[keyof T];

export type PromisedFields<T> = {
    [K in PromisedKeys<T>]: T[K] extends Promise<infer S> ? S : never;
};

export type PromisedKeysExtending<T, S> = {
    [K in keyof T]:
    T[K] extends Promise<infer U>
    ? (U extends S ? K
        : U extends Array<S> ? K
        : never)
    : never;
}[keyof T];

export type PromisedFieldsExtending<T, S> = {
    [K in PromisedKeysExtending<T, S>]: T[K] extends Promise<infer U> ? U : never;
};

export type PromisedNonArrayKeys<T> = {
    [K in keyof T]:
    T[K] extends Promise<Array<infer S>> ? never :
    T[K] extends Promise<infer S> ? K : never;
}[keyof T];

export type PromisedNonArrayFields<T> = {
    [K in PromisedNonArrayKeys<T>]:
    T[K] extends Promise<Array<infer S>> ? never :
    T[K] extends Promise<infer S> ? S : never;
};

export type PromisedArrayKeys<T> = {
    [K in keyof T]: T[K] extends Promise<Array<infer S>> ? K : never;
}[keyof T];

export type PromisedArrayFields<T> = {
    [K in PromisedArrayKeys<T>]: T[K] extends Promise<Array<infer S>> ? S : never;
};


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

export function removeNull<T>(array: Array<T | null>): Array<T> {
    return array.filter(x => x !== null) as Array<T>;
}

export function getTimeString(time: Date): string {
    const hours = time.getHours().toString().padStart(2, "0");
    const minutes = time.getMinutes().toString().padStart(2, "0");
    const seconds = time.getSeconds().toString().padStart(2, "0");
    const milliseconds = time.getMilliseconds().toString().padStart(3, "0");

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}
