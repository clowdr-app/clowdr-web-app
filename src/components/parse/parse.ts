import Parse from "parse";

//  @ts-ignore  TS: @Jon/@Crista I guess it's OK to ignore undefined here?
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY);
// @ts-ignore     TS: ditto?
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

export {Parse};
