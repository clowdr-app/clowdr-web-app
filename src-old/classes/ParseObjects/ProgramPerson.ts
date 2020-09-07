import Parse from "parse";
import { ProgramPerson as Schema } from "../DBSchema/ProgramPerson";
import { ProgramItem } from "./ProgramItem";
import { UserProfile } from "./UserProfile";

export class ProgramPerson
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ProgramPerson");
    }

    get confKey(): string {
        return this.get("confKey");
    }

    get name(): string {
        return this.get("name");
    }

    get programItems(): Array<ProgramItem> {
        return this.get("programItems");
    }

    get userProfile(): UserProfile {
        return this.get("userProfile");
    }

}

Parse.Object.registerSubclass('ProgramPerson', ProgramPerson);
