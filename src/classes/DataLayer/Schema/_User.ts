import { Base } from ".";
import { UserProfile } from "../Interface";

export default interface Schema extends Base {
    email: string;
    loginKey: string | null;
    passwordSet: boolean;
    username: string;
    isBanned: "Yes" | "No";
    profiles: Promise<Array<UserProfile>>;
}
