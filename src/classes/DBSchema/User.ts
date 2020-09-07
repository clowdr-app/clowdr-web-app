import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface User extends Base {
    email: string;
    loginKey: string;
    passwordSet: boolean;
    username: string;
    isBanned: "Yes" | "No";
}

export const UserFields: Array<KnownKeys<User>> = [
    ...BaseFields,
    "email",
    "loginKey",
    "passwordSet",
    "username",
    "isBanned"
];
