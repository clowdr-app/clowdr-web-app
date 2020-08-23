import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class ProgramSessionEvent extends Parse.Object {
    constructor() {
        super("ProgramSessionEvent");
    }
    // TS: Is there a better way than writing this out manually???
    getItems(){
        return this.get("items") as ProgramItem[];
    }
}
Parse.Object.registerSubclass('ProgramSessionEvent', ProgramSessionEvent);
