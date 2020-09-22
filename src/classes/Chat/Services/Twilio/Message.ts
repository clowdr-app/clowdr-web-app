import { Message as TwilioMessage } from "twilio-chat/lib/message";
import IMessage from "../../IMessage";
import Member from "./Member";

export default class Message implements IMessage {
    constructor(private twilioMessage: TwilioMessage) {
    }

    get sid(): string {
        throw new Error("Method not implemented.");
    }
    get author(): string {
        throw new Error("Method not implemented.");
    }
    get body(): string {
        throw new Error("Method not implemented.");
    }
    get dateUpdated(): Date {
        throw new Error("Method not implemented.");
    }
    get index(): number {
        throw new Error("Method not implemented.");
    }
    get lastUpdatedBy(): string {
        throw new Error("Method not implemented.");
    }
    get timestamp(): Date {
        throw new Error("Method not implemented.");
    }
    get attributes(): Object {
        throw new Error("Method not implemented.");
    }
    get memberSid(): string {
        throw new Error("Method not implemented.");
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
    updateAttributes(attributes: Object): Promise<this> {
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
    listeners(event: string | symbol): Function[] {
        throw new Error("Method not implemented.");
    }
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
