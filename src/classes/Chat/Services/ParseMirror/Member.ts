import { _User } from "clowdr-db-schema/src/classes/DataLayer";
import IMember from "../../IMember";

export default class Member extends _User implements IMember {
    getOnlineStatus(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}
