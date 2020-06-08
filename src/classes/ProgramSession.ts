import Parse from "parse";
import ProgramItem from "./ProgramItem";

class ProgramSession extends Parse.Object{

    constructor() {
        super("ProgramSession");
    }
    getItems(){
        return <Parse.Pointer[]>this.get("items");
    }
}
Parse.Object.registerSubclass('ProgramSession', ProgramSession);
