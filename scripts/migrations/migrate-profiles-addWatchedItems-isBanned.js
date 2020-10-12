// tslint:disable:no-console

const Parse = require("parse/node");
const assert = require("assert");

async function main() {
    assert(process.env.REACT_APP_PARSE_APP_ID, "REACT_APP_PARSE_APP_ID not provided.");
    assert(process.env.REACT_APP_PARSE_JS_KEY, "REACT_APP_PARSE_JS_KEY not provided.");
    assert(process.env.REACT_APP_PARSE_DATABASE_URL, "REACT_APP_PARSE_DATABASE_URL not provided.");

    Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
    Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

    await Parse.Cloud.startJob("migrate-watchedItems-isBanned-addToUserProfile", {});
}

main();
