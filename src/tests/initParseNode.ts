import Parse from "parse/node";
import assert from "assert";

/**
 * Use in beforeAll to initialise parse.
 */
export default function initParseNode() {
    assert(process.env.REACT_APP_PARSE_APP_ID);
    assert(process.env.REACT_APP_PARSE_JS_KEY);
    assert(process.env.REACT_APP_PARSE_DATABASE_URL);
    assert(process.env.PARSE_MASTER_KEY);

    Parse.initialize(
        process.env.REACT_APP_PARSE_APP_ID,
        process.env.REACT_APP_PARSE_JS_KEY
    );
    Parse.masterKey = process.env.PARSE_MASTER_KEY;
    Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;
}
