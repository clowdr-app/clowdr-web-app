import Parse from "parse";

// @ts-ignore     TS: @Jon/@Crista OK to ignore undefined?
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY);
// @ts-ignore     TS: OK to ignore undefined?
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

export {Parse};
