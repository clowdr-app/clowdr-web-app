import { useContext } from 'react';
import UserContext from '../contexts/UserContext';
import { User } from '../classes/Data';

export default function useMaybeUser(): User | null {
    return useContext(UserContext);
}
