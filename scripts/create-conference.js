// tslint:disable:no-console

const yargs = require("yargs");
const Parse = require("parse/node");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const argv = yargs
    .option("conference", {
        alias: "c",
        description: "The path to the folder containing the conference spec.",
        type: "string",
    })
    .option("registration", {
        alias: "r",
        description: "Only create registrations.",
        type: "boolean",
    })
    .option("identities-map", {
        alias: "i",
        description: "Map of input identities to Parse identities from a previous upload run.",
        type: "string",
    })
    .help()
    .alias("help", "h").argv;

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

async function getConference(name) {
    const existingConfQ = new Parse.Query("Conference");
    const confs = await existingConfQ.filter(x => x.get("name").includes(name), { useMasterKey: true });
    const existingConf = confs.length > 0 ? confs[0] : null;
    if (existingConf) {
        return existingConf.id;
    }
    return undefined;
}

async function createConference(conferenceData) {
    const existingConfId = await getConference(conferenceData.conference.name);
    if (existingConfId) {
        console.log("Conference already exists - re-using it.");
        return existingConfId;
    }

    conferenceData.twilio = conferenceData.twilio ?? {};
    conferenceData.twilio.MASTER_SID = process.env.TWILIO_MASTER_SID;
    conferenceData.twilio.MASTER_AUTH_TOKEN = process.env.TWILIO_MASTER_AUTH_TOKEN;
    conferenceData.twilio.CHAT_PRE_WEBHOOK_URL = process.env.TWILIO_CHAT_PRE_WEBHOOK_URL;
    conferenceData.twilio.CHAT_POST_WEBHOOK_URL = process.env.TWILIO_CHAT_POST_WEBHOOK_URL;
    // data.twilio.removeExisting = true;

    conferenceData.react = conferenceData.react ?? {};
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
            throw new Error(`Create conference job failed! Last message before failure: ${message}`);
        } else if (jobStatus === "succeeded") {
            confId = message;
            console.log(`Create conference job succeeded. New conference id: ${confId}`);
            break;
        }
    }

    return confId;
}

const objectCache = {};
let previousIds = {};

async function createObjects(confId, adminSessionToken, datas, objectName, keyName, tableName, verifyByField) {
    let tableCache = tableName && objectCache[tableName];
    if (tableName && !tableCache) {
        objectCache[tableName] = tableCache = {};
        const existingQ = new Parse.Query(tableName);
        existingQ.equalTo("conference", new Parse.Object("Conference", { id: confId }));
        await existingQ.eachBatch(
            xs => {
                xs.forEach(x => {
                    if (verifyByField === "id") {
                        tableCache[x.id] = x.id;
                    } else {
                        tableCache[x.get(verifyByField).toLowerCase()] = x.id;
                    }
                });
            },
            { batchSize: 1000, useMasterKey: true }
        );
    }

    const results = {};
    for (const data of datas) {
        data.conference = confId;
        let finalData = { ...data };
        delete finalData.id;

        console.log(`Creating or getting ${objectName}: ${data[keyName]}`);
        let shouldCreate = true;
        if (tableName && verifyByField) {
            let existing;
            if (typeof data[verifyByField] === "string") {
                existing = tableCache[data[verifyByField].toLowerCase()];
            } else {
                existing = tableCache[data[verifyByField]];
            }

            // TODO: An object might have the same key but its other fields could have changed
            //       so it may still need updating
            if (existing) {
                if (typeof data[keyName] === "string") {
                    results[data[keyName].toLowerCase()] = existing;
                } else {
                    results[data[keyName]] = existing;
                }

                console.log(` - Already exists: ${existing}`);
                shouldCreate = false;
            }
        }

        if (shouldCreate) {
            await new Promise(resolve => setTimeout(resolve, 50));

            try {
                const id = await Parse.Cloud.run(`${objectName}-create`, finalData, {
                    sessionToken: adminSessionToken,
                });

                if (typeof data[keyName] === "string") {
                    results[data[keyName].toLowerCase()] = id;
                } else {
                    results[data[keyName]] = id;
                }

                if (tableCache) {
                    if (typeof finalData[verifyByField] === "string") {
                        tableCache[finalData[verifyByField].toLowerCase()] = id;
                    } else {
                        tableCache[finalData[verifyByField]] = id;
                    }
                }
            } catch (e) {
                console.error(`Creating ${tableName}: ${data[keyName]} failed`, e);
            }
        }
    }
    return results;
}

function remapObjects(sourceMap, targetKey, targetDatas) {
    for (const data of targetDatas) {
        if (typeof data[targetKey] === "string") {
            data[targetKey] = sourceMap[data[targetKey].toLowerCase()];
        } else {
            data[targetKey] = sourceMap[data[targetKey]];
        }
    }
}

async function main() {
    const rootPath = argv.conference;
    const regsOnly = argv.registration;
    const previousIdsFile = argv["identities-map"];

    if (previousIdsFile) {
        // const lines = fs.readFileSync(previousIdsFile).toString().split("\n");
        // for (let idx = 0; idx < lines.length; idx++) {
        //     if (lines[idx].startsWith("{")) {
        //         const tableName = lines[idx - 1].split(":")[0].toLowerCase();
        //         switch (tableName) {
        //             case "youtube feeds":
        //                 // Ignore
        //                 break;
        //             case "zoom rooms":
        //                 // Ignore
        //                 break;
        //             case "text chats":
        //                 // Ignore
        //                 break;
        //             case "video rooms":
        //                 // Ignore
        //                 break;
        //             case "content feeds":
        //                 // Ignore
        //                 break;
        //             case "attachment types":
        //                 // Ignore
        //                 break;
        //             case "tracks":
        //                 // Ignore
        //                 break;
        //             case "persons":
        //                 // Ignore
        //                 break;
        //             case "items":
        //                 previousIds.items = JSON.parse(lines[idx]);
        //                 break;
        //             case "item attachments":
        //                 // Ignore
        //                 break;
        //             case "sessions":
        //                 previousIds.sessions = JSON.parse(lines[idx]);
        //                 break;
        //             case "events":
        //                 previousIds.events = JSON.parse(lines[idx]);
        //                 break;
        //             default:
        //                 break;
        //         }
        //     }
        //     // previousIds = JSON.parse();
        // }
    }

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
        return item => {
            if (item.feed) {
                let content;

                if (item.feed.zoomRoom) {
                    let feed = zoomRoomsData.find(x => x.url === item.feed.zoomRoom);
                    if (!feed) {
                        feed = {
                            id: zoomRoomsData.length,
                            url: item.feed.zoomRoom,
                        };
                        zoomRoomsData.push(feed);
                    }
                    if (!content) {
                        content = {
                            id: contentFeedsData.length,
                            name: item.feed.name,
                            zoomRoom: feed.id,
                        };
                        contentFeedsData.push(content);
                    } else {
                        content.zoomRoom = feed.id;
                    }
                }
                if (item.feed.youtube) {
                    let feed = youtubeFeedsData.find(x => x.videoId === item.feed.youtube);
                    if (!feed) {
                        feed = {
                            id: youtubeFeedsData.length,
                            videoId: item.feed.youtube,
                        };
                        youtubeFeedsData.push(feed);
                    }
                    if (!content) {
                        content = {
                            id: contentFeedsData.length,
                            name: item.feed.name,
                            youtube: feed.id,
                        };
                        contentFeedsData.push(content);
                    } else {
                        content.youtube = feed.id;
                    }
                }
                if (item.feed.videoRoom) {
                    let textChatId = undefined;
                    if (item.feed.textChat) {
                        textChatId = textChatsData.find(x => x.name === item.feed.name)?.id;
                        if (!textChatId) {
                            textChatId = textChatsData.length;
                            const newTextChat = {
                                id: textChatsData.length,
                                name: item.feed.name,
                                autoWatch: false,
                                isPrivate: false,
                                isDM: false,
                            };
                            textChatsData.push(newTextChat);
                        }
                    }
                    const newVideoRoom = {
                        id: videoRoomsData.length,
                        name: item.feed.name,
                        capacity: item.feed.roomCapacity ?? 50,
                        ephemeral: false,
                        isPrivate: false,
                        textChat: textChatId,
                    };
                    videoRoomsData.push(newVideoRoom);

                    if (!content) {
                        content = {
                            id: contentFeedsData.length,
                            name: newVideoRoom.name,
                            videoRoom: newVideoRoom.id,
                        };
                        contentFeedsData.push(content);
                    } else {
                        content.videoRoom = newVideoRoom.id;
                    }
                } else if (item.feed.textChat) {
                    const newTextChat = {
                        id: textChatsData.length,
                        name: item.feed.name,
                        autoWatch: false,
                        isPrivate: false,
                        isDM: false,
                    };
                    textChatsData.push(newTextChat);
                    if (!content) {
                        content = {
                            id: contentFeedsData.length,
                            name: newTextChat.name,
                            textChat: newTextChat.id,
                        };
                        contentFeedsData.push(content);
                    } else {
                        content.textChat = newTextChat.id;
                    }
                }

                item.feed = content.id;
            }
        };
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
                autoWatch: false,
                isPrivate: false,
                isDM: false,
            };
            textChatsData.push(newTextChat);

            const newContentFeed = {
                id: contentFeedsData.length,
                name: newTextChat.name,
                textChat: newTextChat.id,
            };
            contentFeedsData.push(newContentFeed);

            track.feed = newContentFeed.id;
        }
    });

    assert(process.env.REACT_APP_PARSE_APP_ID, "REACT_APP_PARSE_APP_ID not provided.");
    assert(process.env.REACT_APP_PARSE_JS_KEY, "REACT_APP_PARSE_JS_KEY not provided.");
    assert(process.env.REACT_APP_PARSE_DATABASE_URL, "REACT_APP_PARSE_DATABASE_URL not provided.");
    assert(
        process.env.REACT_APP_TWILIO_CALLBACK_URL,
        "REACT_APP_TWILIO_CALLBACK_URL (Twilio callback (frontend -> clowdr-backend) url) not provided."
    );
    assert(process.env.REACT_APP_FRONTEND_URL, "REACT_APP_FRONTEND_URL not provided.");

    assert(process.env.TWILIO_MASTER_SID, "TWILIO_MASTER_SID : Twilio master-account SID not provided.");
    assert(
        process.env.TWILIO_MASTER_AUTH_TOKEN,
        "TWILIO_MASTER_AUTH_TOKEN : Twilio master-account authentication token not provided."
    );
    assert(
        process.env.TWILIO_CHAT_PRE_WEBHOOK_URL,
        "TWILIO_CHAT_PRE_WEBHOOK_URL : Twilio pre-webhook (Twilio -> clowdr-backend) url not provided."
    );
    assert(
        process.env.TWILIO_CHAT_POST_WEBHOOK_URL,
        "TWILIO_CHAT_POST_WEBHOOK_URL : Twilio post-webhook (Twilio -> clowdr-backend) url not provided."
    );

    Parse.initialize(
        process.env.REACT_APP_PARSE_APP_ID,
        process.env.REACT_APP_PARSE_JS_KEY,
        process.env.PARSE_MASTER_KEY
    );
    Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

    const confId = regsOnly
        ? await getConference(conferenceData.conference.name)
        : await createConference(conferenceData);
    console.log(`Conference id: ${confId}`);

    const adminUser = await Parse.User.logIn(conferenceData.admin.username, conferenceData.admin.password);
    const adminSessionToken = adminUser.getSessionToken();
    console.log(`Admin user id: ${adminUser.id}`);

    if (!regsOnly) {
        // TODO: An object might have the same key but its other fields could have changed
        //       so it may still need updating
        const youtubeFeeds = await createObjects(
            confId,
            adminSessionToken,
            youtubeFeedsData,
            "youtubeFeed",
            "id",
            "YouTubeFeed",
            "videoId"
        );
        console.log(`YouTube feeds:\n${JSON.stringify(youtubeFeeds)}`);

        const zoomRooms = await createObjects(
            confId,
            adminSessionToken,
            zoomRoomsData,
            "zoomRoom",
            "id",
            "ZoomRoom",
            "url"
        );
        console.log(`Zoom rooms:\n${JSON.stringify(zoomRooms)}`);

        const textChats = await createObjects(
            confId,
            adminSessionToken,
            textChatsData,
            "textChat",
            "id",
            "TextChat",
            "name"
        );
        console.log(`Text chats:\n${JSON.stringify(textChats)}`);

        remapObjects(textChats, "textChat", videoRoomsData);
        const videoRooms = await createObjects(
            confId,
            adminSessionToken,
            videoRoomsData,
            "videoRoom",
            "id",
            "VideoRoom",
            "name"
        );
        console.log(`Video rooms:\n${JSON.stringify(videoRooms)}`);

        remapObjects(youtubeFeeds, "youtube", contentFeedsData);
        remapObjects(zoomRooms, "zoomRoom", contentFeedsData);
        remapObjects(textChats, "textChat", contentFeedsData);
        remapObjects(videoRooms, "videoRoom", contentFeedsData);
        const contentFeeds = await createObjects(
            confId,
            adminSessionToken,
            contentFeedsData,
            "contentFeed",
            "id",
            "ContentFeed",
            "name"
        );
        console.log(`Content feeds:\n${JSON.stringify(contentFeeds)}`);

        remapObjects(contentFeeds, "feed", tracksData);
        remapObjects(contentFeeds, "feed", itemsData);
        remapObjects(contentFeeds, "feed", sessionsData);
        remapObjects(contentFeeds, "feed", eventsData);

        const attachmentTypes = await createObjects(
            confId,
            adminSessionToken,
            attachmentTypesData,
            "attachmentType",
            "name",
            "AttachmentType",
            "name"
        );
        console.log(`Attachment types:\n${JSON.stringify(attachmentTypes)}`);

        const tracks = await createObjects(
            confId,
            adminSessionToken,
            tracksData,
            "track",
            "name",
            "ProgramTrack",
            "name"
        );
        console.log(`Tracks:\n${JSON.stringify(tracks)}`);

        const persons = await createObjects(
            confId,
            adminSessionToken,
            personsData,
            "person",
            "name",
            "ProgramPerson",
            "name"
        );
        console.log(`Persons:\n${JSON.stringify(persons)}`);

        remapObjects(tracks, "track", itemsData);
        itemsData.forEach(item => {
            item.authors = item.authors.map(authorName => {
                return persons[authorName.toLowerCase()];
            });
        });

        // TODO: For updates: Load in the ID maps and use them to pre-remap the id fields so they can be merged with existing data

        const items = await createObjects(
            confId,
            adminSessionToken,
            itemsData,
            "item",
            "title",
            "ProgramItem",
            "title"
        );
        console.log(`Items:\n${JSON.stringify(items)}`);

        remapObjects(items, "programItem", itemAttachmentsData);
        remapObjects(attachmentTypes, "attachmentType", itemAttachmentsData);
        const itemAttachments = await createObjects(
            confId,
            adminSessionToken,
            itemAttachmentsData,
            "itemAttachment",
            "url"
        );
        console.log(`Item attachments:\n${JSON.stringify(itemAttachments)}`);

        remapObjects(tracks, "track", sessionsData);
        const sessions = await createObjects(
            confId,
            adminSessionToken,
            sessionsData,
            "session",
            "title",
            "ProgramSession",
            "title"
        );
        console.log(`Sessions:\n${JSON.stringify(sessions)}`);

        remapObjects(sessions, "session", eventsData);
        remapObjects(items, "item", eventsData);
        const events = await createObjects(
            confId,
            adminSessionToken,
            eventsData,
            "event",
            "item",
            "ProgramSessionEvent",
            "item"
        );
        console.log(`Events:\n${JSON.stringify(events)}`);
    }

    const registrations = await createObjects(
        confId,
        adminSessionToken,
        registrationsData,
        "registration",
        "name",
        "Registration",
        "email"
    );
    console.log(`Registrations:\n${JSON.stringify(registrations)}`);
}
