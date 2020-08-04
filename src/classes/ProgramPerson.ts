import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class ProgramPerson extends Parse.Object{

    constructor() {
        super("ProgramPerson");
    }
}
Parse.Object.registerSubclass('ProgramPerson', ProgramPerson);
