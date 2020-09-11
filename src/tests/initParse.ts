import Parse from "parse";
import assert from "assert";

/**
 * Use in beforeAll to initialise parse.
 */
export default function initParse() {
    assert(process.env.REACT_APP_PARSE_APP_ID);
    assert(process.env.REACT_APP_PARSE_JS_KEY);
    assert(process.env.REACT_APP_PARSE_DATABASE_URL);

    Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY);
    Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;
}
