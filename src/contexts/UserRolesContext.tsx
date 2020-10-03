import React from 'react';

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useUserRoles` hook.
 */
const Context = React.createContext<{
    isAdmin: boolean,
    isManager: boolean
}>({
    isAdmin: false,
    isManager: false
});

export default Context;
