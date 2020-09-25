import IMember from "../../IMember";

export default class Member implements IMember {
    get profileId(): string {
        throw new Error("Method not implemented.");
    }

    getOnlineStatus(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}
