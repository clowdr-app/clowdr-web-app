import React from 'react';
import { Conference } from '../classes/Data';

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useConference` hook.
 */
const Context = React.createContext<Conference | null>(null);

export default Context;
