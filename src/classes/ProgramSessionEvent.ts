import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class ProgramSessionEvent extends Parse.Object{
    constructor() {
        super("ProgramSessionEvent");
    }
    // TS: Is there a better way than writing this out manually???
    getItems(){
        return <ProgramItem[]>this.get("items");
    }
}
Parse.Object.registerSubclass('ProgramSessionEvent', ProgramSessionEvent);
