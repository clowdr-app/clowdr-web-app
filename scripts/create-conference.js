// tslint:disable:no-console

const yargs = require('yargs');
const Parse = require("parse/node");
const fs = require('fs');
const path = require('path');
const assert = require("assert");

const argv = yargs
    .option("conference", {
        alias: "c",
        description: "The path to the folder containing the conference spec.",
        type: "string"
    })
    .help()
    .alias("help", "h")
    .argv;

async function main() {
    const rootPath = argv.conference;

    assert(process.env.REACT_APP_PARSE_APP_ID, "REACT_APP_PARSE_APP_ID not provided.");
    assert(process.env.REACT_APP_PARSE_JS_KEY, "REACT_APP_PARSE_JS_KEY not provided.");
    assert(process.env.REACT_APP_PARSE_DATABASE_URL, "REACT_APP_PARSE_DATABASE_URL not provided.");
    assert(process.env.REACT_APP_TWILIO_CALLBACK_URL, "REACT_APP_TWILIO_CALLBACK_URL (Twilio callback (frontend -> clowdr-backend) url) not provided.");
    assert(process.env.REACT_APP_FRONTEND_URL, "REACT_APP_FRONTEND_URL not provided.");

    assert(process.env.TWILIO_MASTER_SID, "TWILIO_MASTER_SID : Twilio master-account SID not provided.");
    assert(process.env.TWILIO_MASTER_AUTH_TOKEN, "TWILIO_MASTER_AUTH_TOKEN : Twilio master-account authentication token not provided.")
    assert(process.env.TWILIO_CHAT_PRE_WEBHOOK_URL, "TWILIO_CHAT_PRE_WEBHOOK_URL : Twilio pre-webhook (Twilio -> clowdr-backend) url not provided.");
    assert(process.env.TWILIO_CHAT_POST_WEBHOOK_URL, "TWILIO_CHAT_POST_WEBHOOK_URL : Twilio post-webhook (Twilio -> clowdr-backend) url not provided.");

    Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
    Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

    let conferenceDataStr = fs.readFileSync(path.join(rootPath, "conference.json")).toString();
    let conferenceData = JSON.parse(conferenceDataStr);

    conferenceData.twilio = {};
    conferenceData.twilio.MASTER_SID = process.env.TWILIO_MASTER_SID;
    conferenceData.twilio.MASTER_AUTH_TOKEN = process.env.TWILIO_MASTER_AUTH_TOKEN;
    conferenceData.twilio.CHAT_PRE_WEBHOOK_URL = process.env.TWILIO_CHAT_PRE_WEBHOOK_URL;
    conferenceData.twilio.CHAT_POST_WEBHOOK_URL = process.env.TWILIO_CHAT_POST_WEBHOOK_URL;
    // data.twilio.removeExisting = true;

    conferenceData.react = {};
    conferenceData.react.TWILIO_CALLBACK_URL = process.env.REACT_APP_TWILIO_CALLBACK_URL;
    conferenceData.react.FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL;

    conferenceData.sendgrid = conferenceData.sendgrid ?? {};
    conferenceData.sendgrid.API_KEY = conferenceData.sendgrid.API_KEY ?? process.env.SENDGRID_API_KEY;
    conferenceData.sendgrid.SENDER = conferenceData.sendgrid.SENDER ?? process.env.SENDGRID_SENDER;

    const createConfJobID = await Parse.Cloud.startJob("conference-create", conferenceData);
    console.log(`Create conference job identity: ${createConfJobID}`);

    let confId = undefined;
    while (true) {
        let jobStatusQ = new Parse.Query("_JobStatus");
        let jobStatusR = await jobStatusQ.get(createConfJobID, { useMasterKey: true });
        if (!jobStatusR) {
            console.error("Could not fetch create conference job status!");
            break;
        }

        let jobStatus = jobStatusR.get("status");
        let message = jobStatusR.get("message");
        if (jobStatus === "failed") {
            throw new Error(`Create conference job failed! Last message before failure: ${message}`)
        }
        else if (jobStatus === "succeeded") {
            confId = message;
            console.log(`Create conference job succeeded. New conference id: ${confId}`);
            break;
        }
    }

    const adminUser = await Parse.User.logIn(conferenceData.admin.username, conferenceData.admin.password);
    const adminSessionToken = adminUser.getSessionToken();

    const attachmentTypesDir = path.join(rootPath, "attachmentTypes");
    const attachmentTypeFileNames = fs.readdirSync(attachmentTypesDir);
    for (const attachmentTypeFileName of attachmentTypeFileNames) {
        const attachmentTypeDataStr = fs.readFileSync(path.join(attachmentTypesDir, attachmentTypeFileName));
        const attachmentTypeData = JSON.parse(attachmentTypeDataStr);
        attachmentTypeData.conference = confId;
        console.log(`Creating attachment type: ${attachmentTypeData.name}`);
        await Parse.Cloud.run("attachmentType-create", attachmentTypeData, {
            sessionToken: adminSessionToken
        });
    }

    // TODO: Content feeds

    const tracksDir = path.join(rootPath, "tracks");
    const trackFileNames = fs.readdirSync(tracksDir);
    for (const trackFileName of trackFileNames) {
        const trackDataStr = fs.readFileSync(path.join(tracksDir, trackFileName));
        const trackData = JSON.parse(trackDataStr);
        trackData.conference = confId;
        console.log(`Creating track: ${trackData.name}`);
        await Parse.Cloud.run("track-create", trackData, {
            sessionToken: adminSessionToken
        });
    }

    // TODO: Persons
    // TODO: Items
    // TODO: Item Attachments
    // TODO: Sessions
    // TODO: Events

    // TODO: Registrations
}

main();
