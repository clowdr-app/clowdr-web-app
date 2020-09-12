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

    if (!process.env.REACT_APP_PARSE_DATABASE_URL.includes("localhost")) {
        throw new Error(`I refuse to run tests against non-local databases.
These tests will PURGE ALL THE DATA IN THE DATABASE. That means everything is
irreversibly deleted, including data in protected tables. Do not, ever, run
this test framework against a remote database - there's too high a risk that
you accidentally run it against a production database.`);
    }

    Parse.initialize(
        process.env.REACT_APP_PARSE_APP_ID,
        process.env.REACT_APP_PARSE_JS_KEY
    );
    Parse.masterKey = process.env.PARSE_MASTER_KEY;
    Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

    Parse.Cloud.useMasterKey();
}
