import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class ProgramTrack extends Parse.Object{

    constructor() {
        super("ProgramTrack");
    }
}
Parse.Object.registerSubclass('ProgramTrack', ProgramTrack);
