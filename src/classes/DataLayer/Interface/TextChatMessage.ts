import { TextChat } from ".";
import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticCachedBase, StaticBaseImpl, LocalDataT, CachedBase } from "./Base";

type SchemaT = Schema.TextChatMessage;
type K = "TextChatMessage";
const K_str: K = "TextChatMessage";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get attributes(): any | undefined {
        return this.data.attributes;
    }

    get sentAt(): Date {
        return this.data.sentAt;
    }

    get text(): string {
        return this.data.text;
    }

    get chat(): Promise<TextChat> {
        return this.uniqueRelated("chat");
    }


    static get(id: string, conferenceId: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId: string): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticCachedBase<K> = Class;
