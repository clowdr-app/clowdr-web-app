import Parse from "parse";

export default class ProgramRoom extends Parse.Object {

    constructor() {
        super("ProgramRoom");
    }
}
Parse.Object.registerSubclass('ProgramRoom', ProgramRoom);
