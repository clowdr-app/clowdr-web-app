import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class BreakoutRoom extends Parse.Object{
    constructor() {
        super("BreakoutRoom");
    }
}
Parse.Object.registerSubclass('BreakoutRoom', BreakoutRoom);
