import { _User } from "clowdr-db-schema/src/classes/DataLayer";

export default interface IMember extends _User {
    getOnlineStatus(): Promise<boolean>;
}
