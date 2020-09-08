import React from 'react';
import { User } from '../classes/Data';

/**
 * Hint: You will never need to use this directly. Instead, use the `useUser` or
 * `useMaybeUser` hooks.
 */
const Context = React.createContext<User | null>(null);

export default Context;
