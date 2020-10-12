// tslint:disable:no-console

const Parse = require("parse/node");
const assert = require("assert");

async function main() {
    assert(process.env.REACT_APP_PARSE_APP_ID, "REACT_APP_PARSE_APP_ID not provided.");
    assert(process.env.REACT_APP_PARSE_JS_KEY, "REACT_APP_PARSE_JS_KEY not provided.");
    assert(process.env.REACT_APP_PARSE_DATABASE_URL, "REACT_APP_PARSE_DATABASE_URL not provided.");
    assert(process.env.TWILIO_MASTER_SID, "TWILIO_MASTER_SID was not provided");
    assert(process.env.TWILIO_MASTER_AUTH_TOKEN, "TWILIO_MASTER_AUTH_TOKEN was not provided");

    Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
    Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

    await Parse.Cloud.startJob("regenerate-global-chats", {
        conference: "17XdxehHk3",
        adminUserId: "FVIpRYE9dN",
        twilio: {
            MASTER_SID: process.env.TWILIO_MASTER_SID,
            MASTER_AUTH_TOKEN: process.env.TWILIO_MASTER_AUTH_TOKEN
        }
    });
}

main();
