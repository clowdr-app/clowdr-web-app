import { Base } from './Base';

export interface User extends Base {
    email: string;
    loginKey: string;
    passwordSet: boolean;
    username: string;
}
