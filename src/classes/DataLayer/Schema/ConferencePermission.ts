import { Base } from ".";
import { Conference, PrivilegedAction } from "../Interface";

export default interface Schema extends Base {
    action: Promise<PrivilegedAction>;
    conference: Promise<Conference>;
}
