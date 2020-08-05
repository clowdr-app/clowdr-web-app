import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class ProgramRoom extends Parse.Object{

    constructor() {
        super("ProgramRoom");
    }
}
Parse.Object.registerSubclass('ProgramRoom', ProgramRoom);
