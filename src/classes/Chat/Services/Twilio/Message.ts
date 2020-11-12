import { Message as TwilioMessage } from "twilio-chat/lib/message";
import IMessage from "../../IMessage";
import Channel from "./Channel";
import Member from "./Member";

export default class Message implements IMessage {
    constructor(
        private twilioMessage: TwilioMessage,
        private channel: Channel
    ) {
    }

    get sid(): string {
        return this.twilioMessage.sid;
    }
    get author(): string {
        return this.twilioMessage.author;
    }
    get body(): string {
        return this.twilioMessage.body;
    }
    get dateUpdated(): Date {
        return this.twilioMessage.dateUpdated;
    }
    get index(): number {
        return this.twilioMessage.index;
    }
    get lastUpdatedBy(): string {
        return this.twilioMessage.lastUpdatedBy;
    }
    get timestamp(): Date {
        return this.twilioMessage.timestamp;
    }
    get attributes(): any {
        return this.twilioMessage.attributes;
    }
    get memberSid(): string {
        return this.twilioMessage.memberSid;
    }
    async getMember(): Promise<Member | "system" | "unknown"> {
        try {
            return this.channel.getMember({ sid: this.twilioMessage.memberSid });
        }
        catch {
            return "unknown";
        }
    }
    async remove(): Promise<void> {
        await this.twilioMessage.remove();
    }
    updateBody(body: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    updateAttributes(attributes: any): Promise<this> {
        throw new Error("Method not implemented.");
    }
}
