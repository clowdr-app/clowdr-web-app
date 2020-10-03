import { useContext } from 'react';
import UserRolesContext from '../contexts/UserRolesContext';

/**
 * Use this hook to access the current user's basic roles.
 */
export default function useUserRoles(): {
    isAdmin: boolean,
    isManager: boolean
} {
    return useContext(UserRolesContext);
}
