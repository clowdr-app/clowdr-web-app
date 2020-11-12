import IMember from "../../IMember";
import { Member as TwilioMember } from "twilio-chat/lib/member";
import { MemberUpdatedEventArgs } from "./Channel";

export default class Member implements IMember {
    constructor(private member: TwilioMember) {
    }

    get sid(): string {
        return this.member.sid;
    }

    get profileId(): string {
        return this.member.identity;
    }

    async getOnlineStatus(): Promise<boolean> {
        const userD = await this.member.getUserDescriptor();
        return userD.online;
    }

    onUpdated(f: (arg: MemberUpdatedEventArgs) => Promise<void>) {
        this.member.on("updated", f);
    }

    offUpdated(f: (arg: MemberUpdatedEventArgs) => Promise<void>) {
        this.member.off("updated", f);
    }
}
