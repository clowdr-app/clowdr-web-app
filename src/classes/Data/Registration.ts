import Parse from "parse";
import { Registration as Schema, RegistrationFields } from "../DBSchema/Registration";
import { Base } from "./Base";

export class Registration extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("Registration", RegistrationFields, value, dbValue);
    }

    get affiliation(): string | Promise<string> {
        return this.get("affiliation");
    }

    get country(): string | Promise<string> {
        return this.get("country");
    }

    get email(): string | Promise<string> {
        return this.get("email");
    }

    get invitationSentDate(): number | Promise<number> {
        return this.get("invitationSentDate");
    }

    get name(): string | Promise<string> {
        return this.get("name");
    }

}
