const Parse = require("parse/node");
const axios = require('axios')
const fs = require('fs');
const assert = require("assert");

let dataStr = fs.readFileSync("./scripts/request-samples/conference-create.json").toString();
let data = JSON.parse(dataStr);

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

data.twilio = {};
data.twilio.MASTER_SID = process.env.TWILIO_MASTER_SID;
data.twilio.MASTER_AUTH_TOKEN = process.env.TWILIO_MASTER_AUTH_TOKEN;
data.twilio.CHAT_PRE_WEBHOOK_URL = process.env.TWILIO_CHAT_PRE_WEBHOOK_URL;
data.twilio.CHAT_POST_WEBHOOK_URL = process.env.TWILIO_CHAT_POST_WEBHOOK_URL;

data.react = {};
data.react.TWILIO_CALLBACK_URL = process.env.REACT_APP_TWILIO_CALLBACK_URL;
data.react.FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL;

data.sendgrid = data.sendgrid ?? {};
data.sendgrid.API_KEY = data.sendgrid.API_KEY ?? process.env.SENDGRID_API_KEY;
data.sendgrid.SENDER = data.sendgrid.SENDER ?? process.env.SENDGRID_SENDER;

Parse.Cloud.startJob("conference-create", data)
    .then(async (res) => {
        console.log(`Job identity: ${res}`);

        while (true) {
            let jobStatusQ = new Parse.Query("_JobStatus");
            let jobStatusR = await jobStatusQ.get(res, { useMasterKey: true });
            if (!jobStatusR) {
                console.error("Could not fetch job status!");
                break;
            }
            
            let jobStatus = jobStatusR.get("status");
            let message = jobStatusR.get("message");
            if (jobStatus === "failed") {
                console.error(`Job failed! Last message before failure: ${message}`);
                break;
            }
            else if (jobStatus === "succeeded") {
                console.log(`Job succeeded: ${message}`);
                break;
            }
        }
    })
    .catch((error) => {
        console.error(error)
    });

