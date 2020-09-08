import React from 'react';
import Cache from '../classes/Cache';

/**
 * Hint: You will never need to use this directly. Instead, use the `useCache`
 * hook.
 */
const Context = React.createContext<Cache | null>(null);

export default Context;
