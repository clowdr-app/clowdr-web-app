import Parse from "parse";

Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY);
Parse.serverURL = 'https://parseapi.back4app.com/'


export {Parse};
