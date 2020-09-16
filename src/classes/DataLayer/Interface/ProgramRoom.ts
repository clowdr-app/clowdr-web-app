import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticCachedBase, StaticBaseImpl, LocalDataT, CachedBase } from "./Base";
import { Conference, ProgramSession, TextChat, VideoRoom, ZoomRoom } from ".";

type SchemaT = Schema.ProgramRoom;
type K = "ProgramRoom";
const K_str: K = "ProgramRoom";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get name(): string {
        return this.data.name;
    }

    // get id1(): string {
    //     return this.data.id1;
    // }

    // get src1(): string {
    //     return this.data.src1;
    // }

    // get pwd1(): string {
    //     return this.data.pwd1;
    // }

    // get id2(): string {
    //     return this.data.id2;
    // }

    // get src2(): string {
    //     return this.data.src2;
    // }

    // get pwd2(): string {
    //     return this.data.pwd2;
    // }

    // get qa(): string {
    //     return this.data.qa;
    // }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get textChat(): Promise<TextChat | undefined> {
        return this.uniqueRelated("textChat");
    }

    get videoRoom(): Promise<VideoRoom | undefined> {
        return this.uniqueRelated("videoRoom");
    }

    get zoomRoom(): Promise<ZoomRoom | undefined> {
        return this.uniqueRelated("zoomRoom");
    }

    get sessions(): Promise<Array<ProgramSession>> {
        return StaticBaseImpl.getAllByField("ProgramSession", "room", this.id, this.conferenceId);
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
