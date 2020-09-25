import IMember from "../../IMember";
import { Member as TwilioMember } from "twilio-chat/lib/member";

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
        let userD = await this.member.getUserDescriptor();
        return userD.online;
    }
}
