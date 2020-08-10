import Parse from "parse";

export default class Conversation extends Parse.Object{
    constructor() {
        super("Conversation");
    }
}
Parse.Object.registerSubclass('Conversation', Conversation);
