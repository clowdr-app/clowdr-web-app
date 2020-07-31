import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class ProgramSession extends Parse.Object{

    constructor() {
        super("ProgramSession");
    }
    getItems(){
        return <ProgramItem[]>this.get("items");
    }
}
Parse.Object.registerSubclass('ProgramSession', ProgramSession);
