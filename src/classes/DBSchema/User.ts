import { Base } from './Base';

export interface User extends Base {
    username: string;
    email: string;
    id: string;
    loginKey: string;
    passwordSet: boolean;
}
