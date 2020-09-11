import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, PromisesRemapped, UncachedBase } from "./Base";

type SchemaT = Schema.Registration;
type K = "Registration";
const K_str: K = "Registration";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get affiliation(): string {
        return this.parse.get("affiliation");
    }

    get country(): string {
        return this.parse.get("country");
    }

    get email(): string {
        return this.parse.get("email");
    }

    get invitationSentDate(): number {
        return this.parse.get("invitationSentDate");
    }

    get name(): string {
        return this.parse.get("name");
    }

    static get(id: string, conferenceId?: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId?: string): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticUncachedBase<K> = Class;
