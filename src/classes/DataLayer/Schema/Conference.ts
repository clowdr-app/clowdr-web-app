import { Base } from ".";
import { PrivilegedInstanceDetails } from "../Interface";

export default interface Schema extends Base {
    conferenceName: string;

    loggedInText: Promise<PrivilegedInstanceDetails>;
}
