import * as Schema from "../Schema";
import { CachedBase, StaticCachedBase, StaticBaseImpl, PromisesRemapped, FieldDataT } from "./Base";
import { Conference } from ".";
import { Exhibits } from "../Schema/ProgramTrack";

type SchemaT = Schema.ProgramTrack;
type K = "ProgramTrack";
const K_str: K = "ProgramTrack";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }
    get badgeText(): string {
        return this.data.badgeText;
    }

    get badgeColor(): string {
        return this.data.badgeColor;
    }

    get displayName(): string {
        return this.data.displayName;
    }

    get exhibit(): Exhibits {
        return this.data.exhibit;
    }

    get name(): string {
        return this.data.name;
    }

    get perProgramItemChat(): boolean {
        return this.data.perProgramItemChat;
    }

    get perProgramItemVideo(): boolean {
        return this.data.perProgramItemVideo;
    }

    get showAsEvents(): boolean {
        return this.data.showAsEvents;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
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
