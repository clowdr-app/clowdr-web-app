import { useContext } from 'react';
import UserContext from '../contexts/UserContext';
import { User } from '../classes/Data';
import assert from 'assert';

export default function useMaybeUser(): User {
    let ctx = useContext(UserContext);
    assert(ctx, "User should be defined.");
    return ctx;
}
