import { Base } from ".";

export default interface Schema extends Base {
    authData: object;
    email: string;
    emailVerified: boolean;
    passwordSet: boolean;
    username: string;
}
