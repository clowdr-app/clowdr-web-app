import React from 'react';
import { UserProfile } from '@clowdr-app/clowdr-db-schema/build/DataLayer';

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useUserProfile` or `useMaybeUserProfile` hooks.
 */
const Context = React.createContext<UserProfile | null>(null);

export default Context;
