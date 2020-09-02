import Parse from "parse";
import { Registration as Schema } from "../DBSchema/Registration";

export default class Registration
    extends Parse.Object
    implements Schema {

    constructor() {
        super("Registration");
    }

    get affiliation(): string {
        return this.get("affiliation");
    }

    get country(): string {
        return this.get("country");
    }

    get email(): string {
        return this.get("email");
    }

    get invitationSentDate(): number {
        return this.get("invitationSentDate");
    }

    get name(): string {
        return this.get("name");
    }

}
Parse.Object.registerSubclass('Registration', Registration);
