import { Message as TwilioMessage } from "twilio-chat/lib/message";
import IMessage from "../../IMessage";
import Member from "./Member";

export default class Message implements IMessage {
    constructor(private twilioMessage: TwilioMessage) {
    }

    // TODO: Reactions

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
    get attributes(): object {
        return this.twilioMessage.attributes;
    }
    get memberSid(): string {
        return this.twilioMessage.memberSid;
    }
    getMember(): Promise<Member> {
        throw new Error("Method not implemented.");
    }
    remove(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    updateBody(body: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    updateAttributes(attributes: object): Promise<this> {
        throw new Error("Method not implemented.");
    }
}
