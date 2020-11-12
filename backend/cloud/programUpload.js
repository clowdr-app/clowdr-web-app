/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");
const { isUserInRoles, configureDefaultProgramACLs } = require("./role");
const { getProfileOfUser } = require("./user");

const { createContentFeed } = require("./contentFeed");
const {
    createAttachmentType,
    createProgramItem,
    createProgramItemAttachment,
    createProgramPerson,
    createProgramSession,
    createProgramSessionEvent,
    createProgramTrack,
} = require("./program");
const { createTextChat } = require("./textChat");
const { createVideoRoom } = require("./videoRoom");
const { createYouTubeFeed } = require("./youtube");
const { createZoomRoom } = require("./zoom");
const assert = require("assert");

Parse.Cloud.define("import-program", async request => {
    try {
        const { params, user } = request;
        const confId = params.conference;
        const authorized = !!user && (await isUserInRoles(user.id, confId, ["admin"]));
        if (authorized) {
            const conference = await new Parse.Object("Conference", { id: confId }).fetch({ useMasterKey: true });

            const existingJobStatusQ = await new Parse.Query("ConferenceConfiguration")
                .equalTo("conference", conference)
                .equalTo("key", "program-upload-job-id")
                .first({ useMasterKey: true });
            if (existingJobStatusQ) {
                throw new Error("Already importing!");
            }

            let newProgramUploadJobObj = new Parse.Object("ConferenceConfiguration");
            const newProgramUploadJobObjACL = new Parse.ACL();
            newProgramUploadJobObj.setACL(newProgramUploadJobObjACL);
            newProgramUploadJobObj.set("key", "program-upload-job-id");
            newProgramUploadJobObj.set("value", "<awaiting>");
            newProgramUploadJobObj.set("conference", conference);
            // TODO: Deal with consistency - Parse doesn't support transactions
            newProgramUploadJobObj = await newProgramUploadJobObj.save(null, { useMasterKey: true });

            const jobId = await Parse.Cloud.startJob("import-program-job", {
                conference: confId,
                data: JSON.stringify(params.data),
                userId: user.id,
            });

            await newProgramUploadJobObj.save({ value: jobId }, { useMasterKey: true });

            return true;
        }
    } catch (e) {
        console.error("Could not import program: " + e);
    }
    return false;
});

Parse.Cloud.define("import-program-progress", async request => {
    try {
        const { params, user } = request;
        const confId = params.conference;
        const authorized = !!user && (await isUserInRoles(user.id, confId, ["admin"]));
        if (authorized) {
            const conference = await new Parse.Object("Conference", { id: confId }).fetch({ useMasterKey: true });

            const existingJobStatusQ = await new Parse.Query("ConferenceConfiguration")
                .equalTo("conference", conference)
                .equalTo("key", "program-upload-job-id")
                .first({ useMasterKey: true });
            if (existingJobStatusQ) {
                const jobId = existingJobStatusQ.get("value");
                let jobStatusQ = new Parse.Query("_JobStatus");
                let jobStatusR = await jobStatusQ.get(jobId, { useMasterKey: true });
                if (!jobStatusR) {
                    throw new Error("Job not found!");
                }

                let message = jobStatusR.get("message");

                if (message === "100") {
                    await existingJobStatusQ.destroy({ useMasterKey: true });
                }

                return message;
            }

            return false;
        }
    } catch (e) {
        console.error("Could not import program: " + e);
    }
    return false;
});

Parse.Cloud.job("import-program-job", async request => {
    const { params, message: _message } = request;
    const message = msg => {
        console.log(msg);
        _message(msg);
    };
    message("0");

    try {
        const confId = params.conference;
        const programDataStr = params.data;
        const userId = params.userId;
        assert(confId);
        assert(programDataStr);
        assert(userId);

        const programData = JSON.parse(programDataStr);
        assert(programData);

        const user = await new Parse.User({ id: userId }).fetch({ useMasterKey: true });
        const adminProfile = await getProfileOfUser(user, confId);
        const conference = await new Parse.Object("Conference", { id: confId }).fetch({ useMasterKey: true });

        const { tracks, feeds, items, events, persons, sessions, attachmentTypes } = programData;

        for (const sessionSpec of Object.values(sessions)) {
            if (!sessionSpec.feed) {
                sessionSpec.feed = sessionSpec.id;
            }

            if (!feeds[sessionSpec.feed]) {
                feeds[sessionSpec.feed] = {
                    id: sessionSpec.feed,
                    name: sessionSpec.title,
                };
            }
        }

        const tracksMap = new Map();
        const feedsMap = new Map();
        const itemsMap = new Map();
        const eventsMap = new Map();
        const personsMap = new Map();
        const sessionsMap = new Map();
        const attachmentTypesMap = new Map();

        const trackIds = Object.keys(tracks);
        const feedIds = Object.keys(feeds);
        const itemIds = Object.keys(items);
        const eventIds = Object.keys(events);
        const personIds = Object.keys(persons);
        const sessionIds = Object.keys(sessions);
        const attachmentTypeIds = Object.keys(attachmentTypes);

        const existingTrackIds = await new Parse.Query("ProgramTrack")
            .equalTo("conference", conference)
            .map(x => x.id, { useMasterKey: true });
        const existingItemIds = await new Parse.Query("ProgramItem")
            .equalTo("conference", conference)
            .map(x => x.id, { useMasterKey: true });
        const existingEventIds = await new Parse.Query("ProgramSessionEvent")
            .equalTo("conference", conference)
            .map(x => x.id, { useMasterKey: true });
        const existingPersonIds = await new Parse.Query("ProgramPerson")
            .equalTo("conference", conference)
            .map(x => x.id, { useMasterKey: true });
        const existingSessionIds = await new Parse.Query("ProgramSession")
            .equalTo("conference", conference)
            .map(x => x.id, { useMasterKey: true });
        const existingAttachmentTypeIds = await new Parse.Query("AttachmentType")
            .equalTo("conference", conference)
            .map(x => x.id, { useMasterKey: true });

        // TODO: Validate that everything we try to look up in the maps actually exists.

        const totalWork =
            feedIds.length +
            attachmentTypeIds.length +
            personIds.length +
            trackIds.length +
            itemIds.length +
            sessionIds.length +
            eventIds.length +
            1;
        let progress = 0;

        const incrementProgress = () => {
            progress++;
            const progressPC = Math.round((1000 * progress) / totalWork) / 10;
            message(progressPC.toString());
        };

        for (const feedId of feedIds) {
            let youtubeObj;
            let zoomRoomObj;
            let textChatObj;
            let videoRoomObj;

            const feed = feeds[feedId];
            const feedName = feed.name;

            let existingContentFeed;
            if (feed.originatingID) {
                existingContentFeed
                    = await new Parse.Query("ContentFeed")
                        .equalTo("conference", conference)
                        .equalTo("originatingID", feed.originatingID)
                        .includeAll()
                        .first({ useMasterKey: true });
            }
            else {
                existingContentFeed
                    = await new Parse.Query("ContentFeed")
                        .equalTo("conference", conference)
                        .equalTo("name", feed.name)
                        .includeAll()
                        .first({ useMasterKey: true });
            }

            if (existingContentFeed) {
                // TODO: How should the youtube/zoomRoom/videoRoom/textChat fields be updated?
                await existingContentFeed.save({
                    name: feed.name,
                    originatingID: feed.originatingID
                }, { useMasterKey: true });

                feedsMap.set(feedId, existingContentFeed);
            }
            else {
                if (feed.youtube) {
                    youtubeObj = await createYouTubeFeed({
                        conference,
                        videoId: feed.youtube,
                    });
                }

                if (feed.zoomRoom) {
                    zoomRoomObj = await createZoomRoom({
                        conference,
                        url: feed.zoomRoom,
                    });
                }

                if (feed.textChat || feed.videoRoom) {
                    textChatObj = await new Parse.Query("TextChat")
                        .equalTo("conference", conference)
                        .equalTo("name", feedName)
                        .first({ useMasterKey: true });
                    if (!textChatObj) {
                        textChatObj = await createTextChat({
                            name: feedName,
                            conference,
                            isPrivate: false,
                            isDM: false,
                            autoWatch: false,
                            creator: adminProfile,
                            mode: "ordinary",
                        });
                    }
                }

                if (feed.videoRoom) {
                    videoRoomObj = await new Parse.Query("VideoRoom")
                        .equalTo("conference", conference)
                        .equalTo("name", feedName)
                        .first({ useMasterKey: true });
                    if (!videoRoomObj) {
                        videoRoomObj = await createVideoRoom(
                            {
                                capacity: 50,
                                ephemeral: false,
                                isPrivate: false,
                                name: feedName,
                                conference,
                                textChat: textChatObj,
                            },
                            user
                        );
                    } else {
                        await videoRoomObj.save({ textChat: textChatObj }, { useMasterKey: true });
                    }
                }

                feedsMap.set(
                    feedId,
                    await createContentFeed({
                        name: feedName,
                        conference,
                        youtube: youtubeObj,
                        zoomRoom: zoomRoomObj,
                        videoRoom: videoRoomObj,
                        textChat: !videoRoomObj ? textChatObj : undefined,
                        originatingID: feedId,
                    })
                );
            }

            incrementProgress();
        }

        for (const attachmentTypeId of attachmentTypeIds) {
            const attachmentTypeSpec = attachmentTypes[attachmentTypeId];
            attachmentTypesMap.set(
                attachmentTypeId,
                await createAttachmentType({
                    supportsFile: attachmentTypeSpec.supportsFile,
                    name: attachmentTypeSpec.name,
                    isCoverImage: attachmentTypeSpec.isCoverImage,
                    displayAsLink: attachmentTypeSpec.displayAsLink,
                    extra: attachmentTypeSpec.extra,
                    ordinal: attachmentTypeSpec.ordinal,
                    conference,
                    fileTypes: attachmentTypeSpec.fileTypes ? attachmentTypeSpec.fileTypes : [],
                })
            );

            incrementProgress();
        }

        for (const personId of personIds) {
            const personSpec = persons[personId];
            personsMap.set(
                personId,
                await createProgramPerson({
                    name: personSpec.name,
                    affiliation: personSpec.affiliation,
                    email: personSpec.email,
                    conference,
                })
            );

            incrementProgress();
        }

        for (const trackId of trackIds) {
            const trackSpec = tracks[trackId];
            tracksMap.set(
                trackId,
                await createProgramTrack({
                    shortName: trackSpec.shortName,
                    name: trackSpec.name,
                    colour: trackSpec.colour,
                    feed: trackSpec.feed ? feedsMap.get(trackSpec.feed) : undefined,
                    conference,
                })
            );

            incrementProgress();
        }

        for (const itemId of itemIds) {
            const itemSpec = items[itemId];
            itemsMap.set(
                itemId,
                await createProgramItem({
                    abstract: itemSpec.abstract,
                    exhibit: itemSpec.exhibit,
                    title: itemSpec.title,
                    authors: itemSpec.authors.map(x => personsMap.get(x).id),
                    feed: itemSpec.feed ? feedsMap.get(itemSpec.feed) : undefined,
                    track: tracksMap.get(itemSpec.track),
                    originatingID: itemSpec.id,
                    conference,
                })
            );

            incrementProgress();
        }

        for (const sessionId of sessionIds) {
            const sessionSpec = sessions[sessionId];
            sessionsMap.set(
                sessionId,
                await createProgramSession({
                    title: sessionSpec.title,
                    feed: sessionSpec.feed ? feedsMap.get(sessionSpec.feed) : undefined,
                    track: tracksMap.get(sessionSpec.track),
                    chair: sessionSpec.chair,
                    originatingID: sessionSpec.id,
                    conference,
                })
            );

            incrementProgress();
        }

        for (const eventId of eventIds) {
            const eventSpec = events[eventId];
            eventsMap.set(
                eventId,
                await createProgramSessionEvent({
                    directLink: eventSpec.directLink,
                    endTime: new Date(eventSpec.endTime),
                    startTime: new Date(eventSpec.startTime),
                    feed: eventSpec.feed ? feedsMap.get(eventSpec.feed) : undefined,
                    item: itemsMap.get(eventSpec.item),
                    session: sessionsMap.get(eventSpec.session),
                    chair: eventSpec.chair,
                    originatingID: eventSpec.id,
                    conference,
                })
            );

            incrementProgress();
        }

        const usedTrackIds = Array.from(tracksMap.values()).map(x => x.id);
        const usedItemIds = Array.from(itemsMap.values()).map(x => x.id);
        const usedEventIds = Array.from(eventsMap.values()).map(x => x.id);
        const usedPersonIds = Array.from(personsMap.values()).map(x => x.id);
        const usedSessionIds = Array.from(sessionsMap.values()).map(x => x.id);
        const usedAttachmentTypeIds = Array.from(attachmentTypesMap.values()).map(x => x.id);

        const unusedExistingTrackIds = existingTrackIds.filter(x => !usedTrackIds.includes(x));
        const unusedExistingItemIds = existingItemIds.filter(x => !usedItemIds.includes(x));
        const unusedExistingEventIds = existingEventIds.filter(x => !usedEventIds.includes(x));
        const unusedExistingPersonIds = existingPersonIds.filter(x => !usedPersonIds.includes(x));
        const unusedExistingSessionIds = existingSessionIds.filter(x => !usedSessionIds.includes(x));
        const unusedExistingAttachmentTypeIds = existingAttachmentTypeIds.filter(
            x => !usedAttachmentTypeIds.includes(x)
        );

        // The order of the following deletes matters, a lot.
        // Note: We trust the rest of the backend to delete unused content feeds automatically

        console.log(`Deleting ${unusedExistingEventIds.length} unused existing events...`);
        await Promise.all(
            unusedExistingEventIds.map(id =>
                new Parse.Object("ProgramSessionEvent", { id }).destroy({ useMasterKey: true })
            )
        );
        console.log(`Deleted ${unusedExistingEventIds.length} unused existing events.`);

        console.log(`Deleting ${unusedExistingSessionIds.length} unused existing sessions...`);
        await Promise.all(
            unusedExistingSessionIds.map(id =>
                new Parse.Object("ProgramSession", { id }).destroy({ useMasterKey: true })
            )
        );
        console.log(`Deleted ${unusedExistingSessionIds.length} unused existing sessions.`);

        console.log(`Deleting ${unusedExistingItemIds.length} unused existing items...`);
        await Promise.all(
            unusedExistingItemIds.map(id => new Parse.Object("ProgramItem", { id }).destroy({ useMasterKey: true }))
        );
        console.log(`Deleted ${unusedExistingItemIds.length} unused existing items.`);

        console.log(`Deleting ${unusedExistingTrackIds.length} unused existing tracks...`);
        await Promise.all(
            unusedExistingTrackIds.map(id => new Parse.Object("ProgramTrack", { id }).destroy({ useMasterKey: true }))
        );
        console.log(`Deleted ${unusedExistingTrackIds.length} unused existing tracks.`);

        console.log(`Deleting ${unusedExistingPersonIds.length} unused existing persons...`);
        await Promise.all(
            unusedExistingPersonIds.map(id => new Parse.Object("ProgramPerson", { id }).destroy({ useMasterKey: true }))
        );
        console.log(`Deleted ${unusedExistingPersonIds.length} unused existing persons.`);

        console.log(`Deleting ${unusedExistingAttachmentTypeIds.length} unused existing attachment types...`);
        await Promise.all(
            unusedExistingAttachmentTypeIds.map(id =>
                new Parse.Object("AttachmentType", { id }).destroy({ useMasterKey: true })
            )
        );
        console.log(`Deleted ${unusedExistingAttachmentTypeIds.length} unused existing attachment types.`);

        incrementProgress();

        message("100");
    } catch (e) {
        console.error("ERROR: " + e.stack, e);
        message(e);
        throw e;
    }
});

// Parse.Cloud.define("clear-conference", async (request) => {
//     try {
//         const { params, user } = request;
//         const confId = params.conference;
//         const authorized = !!user && await isUserInRoles(user.id, confId, ["admin"]);
//         if (authorized) {
//             const conference = await new Parse.Object("Conference", { id: confId }).fetch({ useMasterKey: true });

//             // TODO: Fire off a job
//             // TODO: How do we monitor job progress? Can we just query the jobs table?
//             // TODO: What stuff do we need to delete? Care needs to be taken around text chats and video rooms
//         }
//     }
//     catch (e) {
//         console.error("Could not clear conference: " + e);
//     }
//     return false;
// });

// Parse.Cloud.job("clear-program-job", async (request) => {

// });
