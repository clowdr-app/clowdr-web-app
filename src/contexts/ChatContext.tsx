import React from 'react';
import Chat from '../classes/Chat/Chat';

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useConference` hook.
 */
const Context = React.createContext<Chat | null>(null);

export default Context;
