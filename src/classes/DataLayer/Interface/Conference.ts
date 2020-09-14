import * as Schema from "../Schema";
import { StaticCachedBase, StaticBaseImpl, CachedBase, LocalDataT } from "./Base";
import { PrivilegedConferenceDetails } from ".";
import { PromisesRemapped } from "../WholeSchema";

type SchemaT = Schema.Conference;
type K = "Conference";
const K_str: K = "Conference";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }
    get adminEmail(): string {
        return this.data.adminEmail;
    }

    get adminName(): string {
        return this.data.adminName;
    }

    get headerImage(): Parse.File | null {
        return this.data.headerImage;
    }

    get isInitialized(): boolean {
        return this.data.isInitialized;
    }

    get landingPage(): string {
        return this.data.landingPage;
    }

    get welcomeText(): string {
        return this.data.welcomeText;
    }

    get conferenceName(): string {
        return this.data.conferenceName;
    }

    get loggedInText(): Promise<PrivilegedConferenceDetails> {
        return this.uniqueRelated("loggedInText");
    }

    static get(id: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id);
    }

    static getAll(): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticCachedBase<K> = Class;
