import Parse from "parse";

export default class ProgramPerson extends Parse.Object{
    constructor() {
        super("ProgramPerson");
    }
}
Parse.Object.registerSubclass('ProgramPerson', ProgramPerson);
