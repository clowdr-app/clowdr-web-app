import React from 'react';

export type DocTitleState = {
    get(): string;
    set(val: string): Promise<void>;
}

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useDocTitle` hook.
 */
const Context = React.createContext<DocTitleState | null>(null);

export default Context;
