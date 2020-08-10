import Parse from "parse";

// @ts-ignore   We (Jon/Crista) think it's OK to ignore undefined here
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY);
// @ts-ignore    
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

export {Parse};
