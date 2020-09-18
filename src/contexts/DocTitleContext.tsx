import React from 'react';

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useDocTitle` hook.
 */
const Context = React.createContext<((val: string) => void) | null>(null);

export default Context;
