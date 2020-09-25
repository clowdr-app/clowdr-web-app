import { Message as TwilioMessage } from "twilio-chat/lib/message";
import IMessage from "../../IMessage";
import Member from "./Member";

export default class Message implements IMessage {
    constructor(private twilioMessage: TwilioMessage) {
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
    get attributes(): object {
        return this.twilioMessage.attributes;
    }
    get memberSid(): string {
        return this.twilioMessage.memberSid;
    }
    _update(data: any): void {
        throw new Error("Method not implemented.");
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
    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    on(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    once(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    off(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    removeAllListeners(event?: string | symbol): this {
        throw new Error("Method not implemented.");
    }
    setMaxListeners(n: number): this {
        throw new Error("Method not implemented.");
    }
    getMaxListeners(): number {
        throw new Error("Method not implemented.");
    }
    // tslint:disable-next-line:ban-types - Inherited from Twilio
    listeners(event: string | symbol): Function[] {
        throw new Error("Method not implemented.");
    }
    // tslint:disable-next-line:ban-types - Inherited from Twilio
    rawListeners(event: string | symbol): Function[] {
        throw new Error("Method not implemented.");
    }
    emit(event: string | symbol, ...args: any[]): boolean {
        throw new Error("Method not implemented.");
    }
    listenerCount(type: string | symbol): number {
        throw new Error("Method not implemented.");
    }
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    eventNames(): (string | symbol)[] {
        throw new Error("Method not implemented.");
    }
}
