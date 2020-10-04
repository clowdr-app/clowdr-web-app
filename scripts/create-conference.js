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

main();

function readConferenceData(rootPath) {
    let conferenceDataStr = fs.readFileSync(path.join(rootPath, "conference.json")).toString();
    let conferenceData = JSON.parse(conferenceDataStr);
    return conferenceData;
}

function readDatas(rootPath, tableName) {
    const fileName = path.join(rootPath, `${tableName}.json`);
    const dataStr = fs.readFileSync(fileName);
    return JSON.parse(dataStr);
}

async function createConference(conferenceData) {
    const existingConfQ = new Parse.Query("Conference");
    const confs = await existingConfQ.filter(x => x.get("name").includes(conferenceData.conference.name), { useMasterKey: true });
    const existingConf = confs.length > 0 ? confs[0] : null;
    if (existingConf) {
        console.log("Conference already exists - re-using it.");
        return existingConf.id;
    }

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

    conferenceData.zoom = conferenceData.zoom ?? {};
    conferenceData.zoom.API_KEY = conferenceData.zoom.API_KEY ?? process.env.ZOOM_API_KEY;
    conferenceData.zoom.API_SECRET = conferenceData.zoom.API_SECRET ?? process.env.ZOOM_API_SECRET;

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

    return confId;
}

async function createObjects(confId, adminSessionToken, datas, objectName, keyName, tableName, verifyByField) {
    const results = {};
    for (const data of datas) {
        data.conference = confId;
        let finalData = { ...data };
        delete finalData.id;

        console.log(`Creating ${objectName}: ${data[keyName]}`);
        let shouldCreate = true;
        if (tableName && verifyByField) {
            const existingQ = new Parse.Query(tableName);
            existingQ.equalTo("conference", new Parse.Object("Conference", { id: confId }));
            existingQ.equalTo(verifyByField, data[verifyByField]);
            const existing = await existingQ.first({ useMasterKey: true });
            if (existing) {
                if (tableName === "ProgramPerson") {
                    results[data[keyName].toLowerCase()] = existing.id;
                }
                else {
                    results[data[keyName]] = existing.id;
                }
                shouldCreate = false;
            }
        }

        if (shouldCreate) {
            try {
                const id = await Parse.Cloud.run(`${objectName}-create`, finalData, {
                    sessionToken: adminSessionToken
                });
                if (tableName === "ProgramPerson") {
                    results[data[keyName].toLowerCase()] = id;
                }
                else {
                    results[data[keyName]] = id;
                }
            }
            catch (e) {
                console.warn(`Creating ${tableName}: ${data[keyName]} failed`, e);
            }
        }
    }
    return results;
}

function remapObjects(sourceMap, targetKey, targetDatas) {
    for (const data of targetDatas) {
        data[targetKey] = sourceMap[data[targetKey]];
    }
}

async function main() {
    const rootPath = argv.conference;

    let conferenceData = readConferenceData(rootPath);

    const attachmentTypesData = readDatas(rootPath, "attachmentTypes");
    const tracksData = readDatas(rootPath, "tracks");
    const personsData = readDatas(rootPath, "persons");
    const itemsData = readDatas(rootPath, "items");
    const itemAttachmentsData = readDatas(rootPath, "itemAttachments");
    const sessionsData = readDatas(rootPath, "sessions");
    const eventsData = readDatas(rootPath, "events");
    const registrationsData = readDatas(rootPath, "registrations");

    const youtubeFeedsData = [];
    const zoomRoomsData = [];
    const contentFeedsData = [];
    const textChatsData = [];
    const videoRoomsData = [];
    function extractFeeds(type) {
        return (item) => {
            if (item.feed) {
                let content;

                if (item.feed.zoomRoom) {
                    let feed = zoomRoomsData.find(x => x.url === item.feed.zoomRoom);
                    if (!feed) {
                        feed = {
                            id: zoomRoomsData.length,
                            url: item.feed.zoomRoom
                        };
                        zoomRoomsData.push(feed);
                    }
                    content = contentFeedsData.find(x => x.zoomRoom === feed.id && x.name === item.feed.name);
                    if (!content) {
                        content = {
                            id: contentFeedsData.length,
                            name: item.feed.name,
                            zoomRoom: feed.id
                        };
                        contentFeedsData.push(content);
                    }
                }
                else if (item.feed.youtube) {
                    let feed = youtubeFeedsData.find(x => x.videoId === item.feed.youtube);
                    if (!feed) {
                        feed = {
                            id: youtubeFeedsData.length,
                            videoId: item.feed.youtube
                        };
                        youtubeFeedsData.push(feed);
                    }
                    content = contentFeedsData.find(x => x.youtube === feed.id && x.name === item.feed.name);
                    if (!content) {
                        content = {
                            id: contentFeedsData.length,
                            name: item.feed.name,
                            youtube: feed.id
                        };
                        contentFeedsData.push(content);
                    }
                }
                else if (item.feed.videoRoom) {
                    content = contentFeedsData.find(x => x.name === item.feed.name);
                    if (!content) {
                        let textChatId = undefined;
                        if (item.feed.textChat) {
                            textChatId = textChatsData.find(x => x.name === item.feed.name)?.id;
                            if (!textChatId) {
                                textChatId = textChatsData.length;
                                const newTextChat = {
                                    id: textChatsData.length,
                                    name: item.feed.name,
                                    autoWatch: false
                                };
                                textChatsData.push(newTextChat);
                            }
                        }
                        const newVideoRoom = {
                            id: videoRoomsData.length,
                            name: item.feed.name,
                            capacity: 50,
                            ephemeral: false,
                            isPrivate: false,
                            textChat: textChatId
                        };
                        videoRoomsData.push(newVideoRoom);

                        content = {
                            id: contentFeedsData.length,
                            name: newVideoRoom.name,
                            videoRoom: newVideoRoom.id
                        };
                        contentFeedsData.push(content);
                    }
                }
                else if (item.feed.textChat) {
                    content = contentFeedsData.find(x => x.name === item.feed.name);
                    if (!content) {
                        const newTextChat = {
                            id: textChatsData.length,
                            name: item.feed.name,
                            autoWatch: false
                        };
                        textChatsData.push(newTextChat);

                        content = {
                            id: contentFeedsData.length,
                            name: newTextChat.name,
                            textChat: newTextChat.id
                        };
                        contentFeedsData.push(content);
                    }
                }

                item.feed = content.id;
            }
        }
    }
    tracksData.forEach(extractFeeds("Track"));
    itemsData.forEach(extractFeeds("Item"));
    sessionsData.forEach(extractFeeds("Session"));
    eventsData.forEach(extractFeeds("Event"));

    // Extract text chats for tracks
    tracksData.forEach(track => {
        if (track.textChat) {
            delete track.textChat;

            const newTextChat = {
                id: textChatsData.length,
                name: `Track: ${track.name}`,
                autoWatch: false
            };
            textChatsData.push(newTextChat);

            const newContentFeed = {
                id: contentFeedsData.length,
                name: newTextChat.name,
                textChat: newTextChat.id
            };
            contentFeedsData.push(newContentFeed);

            track.feed = newContentFeed.id;
        }
    });

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

    const confId = await createConference(conferenceData);

    const adminUser = await Parse.User.logIn(conferenceData.admin.username, conferenceData.admin.password);
    const adminSessionToken = adminUser.getSessionToken();

    const youtubeFeeds = await createObjects(confId, adminSessionToken, youtubeFeedsData, "youtubeFeed", "id", "YouTubeFeed", "videoId");
    const zoomRooms = await createObjects(confId, adminSessionToken, zoomRoomsData, "zoomRoom", "id", "ZoomRoom", "url");
    const textChats = await createObjects(confId, adminSessionToken, textChatsData, "textChat", "id", "TextChat", "name");
    remapObjects(textChats, "textChat", videoRoomsData);
    const videoRooms = await createObjects(confId, adminSessionToken, videoRoomsData, "videoRoom", "id", "VideoRoom", "name");
    remapObjects(youtubeFeeds, "youtube", contentFeedsData);
    remapObjects(zoomRooms, "zoomRoom", contentFeedsData);
    remapObjects(textChats, "textChat", contentFeedsData);
    remapObjects(videoRooms, "videoRoom", contentFeedsData);
    const contentFeeds = await createObjects(confId, adminSessionToken, contentFeedsData, "contentFeed", "id", "ContentFeed", "name");
    remapObjects(contentFeeds, "feed", tracksData);
    remapObjects(contentFeeds, "feed", itemsData);
    remapObjects(contentFeeds, "feed", sessionsData);
    remapObjects(contentFeeds, "feed", eventsData);

    const attachmentTypes = await createObjects(confId, adminSessionToken, attachmentTypesData, "attachmentType", "name", "AttachmentType", "name");
    const tracks = await createObjects(confId, adminSessionToken, tracksData, "track", "name", "ProgramTrack", "name");
    const persons = await createObjects(confId, adminSessionToken, personsData, "person", "name", "ProgramPerson", "name");

    remapObjects(tracks, "track", itemsData);
    itemsData.forEach(item => {
        item.authors = item.authors.map(authorName => {
            return persons[authorName.toLowerCase()];
        });
    });
    const items = await createObjects(confId, adminSessionToken, itemsData, "item", "title", "ProgramItem", "title");

    remapObjects(items, "programItem", itemAttachmentsData);
    remapObjects(attachmentTypes, "attachmentType", itemAttachmentsData);
    const itemAttachments = await createObjects(confId, adminSessionToken, itemAttachmentsData, "itemAttachment", "url", "ProgramItemAttachment", "url");

    remapObjects(tracks, "track", sessionsData);
    const sessions = await createObjects(confId, adminSessionToken, sessionsData, "session", "title");

    remapObjects(sessions, "session", eventsData);
    remapObjects(items, "item", eventsData);
    const events = await createObjects(confId, adminSessionToken, eventsData, "event", "startTime");

    const registrations = await createObjects(confId, adminSessionToken, registrationsData, "registration", "name", "Registration", "name");
}
