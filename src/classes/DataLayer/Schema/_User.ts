import { Base } from ".";
import { UserProfile } from "../Interface";

export default interface Schema extends Base {
    authData: object;
    email: string;
    emailVerified: boolean;
    passwordSet: boolean;
    username: string;

    profiles: Promise<Array<UserProfile>>;
}
