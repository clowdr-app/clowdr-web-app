import { Base } from ".";

export default interface Schema extends Base {
    isDNT: boolean;
    lastSeen: Date;
}
