import React from 'react';
import { UserProfile } from 'clowdr-db-schema/src/classes/DataLayer';

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useUserProfile` or `useMaybeUserProfile` hooks.
 */
const Context = React.createContext<UserProfile | null>(null);

export default Context;
