const Parse = require("parse/node");
const axios = require('axios')
const fs = require('fs');

let dataStr = fs.readFileSync("./scripts/request-samples/conference-create.json").toString();
let data = JSON.parse(dataStr);

Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

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

