import { useContext } from 'react';
import UserContext from '../contexts/UserContext';
import { User } from '../classes/DataLayer';
import assert from 'assert';

/**
 * Use this hook to access the current user.
 * 
 * Use this hook if your component can only render when the user is logged in.
 * Otherwise, use the `useMaybeUser` hook.
 */
export default function useUser(): User {
    let ctx = useContext(UserContext);
    assert(ctx, "User should be defined.");
    return ctx;
}
