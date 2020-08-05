import Parse from "parse";

export default class SocialSpace extends Parse.Object{
    constructor() {
        super("SocialSpace");
    }
}
Parse.Object.registerSubclass('SocialSpace', SocialSpace);
