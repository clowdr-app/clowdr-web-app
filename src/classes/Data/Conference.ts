import Parse from "parse";
import { Conference as Schema, ConferenceFields } from "../DBSchema/Conference";
import { PrivilegedInstanceDetails } from "./PrivilegedInstanceDetails";
import { Base } from "./Base";
import { PrivilegedInstanceDetails as PrivilegedInstanceDetailsSchema, PrivilegedInstanceDetailsFields } from "../DBSchema/PrivilegedInstanceDetails";

export class Conference extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ClowdrInstance", ConferenceFields, value, dbValue);
    }

    get adminEmail(): string | Promise<string> {
        return this.get("adminEmail");
    }

    get adminName(): string | Promise<string> {
        return this.get("adminName");
    }

    get conferenceName(): string | Promise<string> {
        return this.get("conferenceName");
    }

    get headerImage(): Parse.File | null | Promise<Parse.File | null> {
        return this.get("headerImage");
    }

    get isInitialized(): boolean | Promise<boolean> {
        return this.get("isInitialized");
    }

    get landingPage(): string | Promise<string> {
        return this.get("landingPage");
    }

    get welcomeText(): string | Promise<string> {
        return this.get("welcomeText");
    }

    get loggedInText(): PrivilegedInstanceDetails | Promise<PrivilegedInstanceDetails> {
        return this.related<PrivilegedInstanceDetailsSchema, PrivilegedInstanceDetails>("loggedInText", PrivilegedInstanceDetailsFields, PrivilegedInstanceDetails);
    }
}
