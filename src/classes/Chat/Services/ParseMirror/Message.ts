import IMessage from "../../IMessage";
import Member from "./Member";

export default class Message implements IMessage {
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
    get attributes(): any {
        throw new Error("Method not implemented.");
    }
    get memberSid(): string {
        throw new Error("Method not implemented.");
    }
    getMember(): Promise<Member | "system" | "unknown"> {
        throw new Error("Method not implemented.");
    }
    remove(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    updateBody(body: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    updateAttributes(attributes: any): Promise<this> {
        throw new Error("Method not implemented.");
    }
}
