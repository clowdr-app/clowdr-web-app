import Parse from "parse";

Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;


export {Parse};
