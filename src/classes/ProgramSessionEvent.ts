import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class ProgramSessionEvent extends Parse.Object {
    constructor() {
        super("ProgramSessionEvent");
    }
    // TODO: Ed: This appears to be a copy-pasta error from ProgramSession?
    // TS: Is there a better way than writing this out manually???
    getItems() {
        return this.get("items") as ProgramItem[];
    }
}
Parse.Object.registerSubclass('ProgramSessionEvent', ProgramSessionEvent);
