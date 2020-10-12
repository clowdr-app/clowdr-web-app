import React from 'react';

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useChat` hook.
 */
const Context = React.createContext<EmojiContext>({ element: null });

export default Context;

export interface EmojiContext {
    element: Element | null;
}