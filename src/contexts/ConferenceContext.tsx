import React from 'react';
import { Conference } from '@clowdr-app/clowdr-db-schema/build/DataLayer';

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useConference` hook.
 */
const Context = React.createContext<Conference | null>(null);

export default Context;
