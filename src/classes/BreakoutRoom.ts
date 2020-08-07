import Parse from "parse";

export default class BreakoutRoom extends Parse.Object{
    constructor() {
        super("BreakoutRoom");
    }
}
Parse.Object.registerSubclass('BreakoutRoom', BreakoutRoom);
