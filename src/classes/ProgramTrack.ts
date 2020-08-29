import Parse from "parse";

export default class ProgramTrack extends Parse.Object {

    constructor() {
        super("ProgramTrack");
    }
}
Parse.Object.registerSubclass('ProgramTrack', ProgramTrack);
