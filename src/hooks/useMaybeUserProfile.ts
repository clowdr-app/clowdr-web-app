import { useContext } from 'react';
import UserContext from '../contexts/UserProfileContext';
import { UserProfile } from 'clowdr-db-schema/src/classes/DataLayer';

/**
 * Use this hook to access the current user profile (if any).
 *
 * See also documentation in `useUser` to understand how to access the current
 * user, as opposed to the current user profile.
 *
 * Use this hook if your component can render even when the user is logged out.
 * Otherwise, use the `useUser` hook.
 */
export default function useMaybeUserProfile(): UserProfile | null {
    return useContext(UserContext);
}
