import { useContext } from 'react';
import UserContext from '../contexts/UserContext';
import { User } from '../classes/DataLayer';

/**
 * Use this hook to access the current user (if any).
 * 
 * Use this hook if your component can render even when the user is logged out.
 * Otherwise, use the `useUser` hook.
 */
export default function useMaybeUser(): User | null {
    return useContext(UserContext);
}
