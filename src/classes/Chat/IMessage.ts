import IMember from "./IMember";

export default interface IMessage {
    sid: string;
    author: string;
    body: string;
    dateUpdated: Date;
    index: number;
    lastUpdatedBy: string;
    timestamp: Date;
    attributes: Object;
    memberSid: string;
    getMember(): Promise<IMember>;
    remove(): Promise<void>;
    updateBody(body: string): Promise<void>;
    updateAttributes(attributes: Object): Promise<this>;
}
