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
    createProgramTrack
} = require("./program");
const { createTextChat } = require("./textChat");
const { createVideoRoom } = require("./videoRoom");
const { createYouTubeFeed } = require("./youtube");
const { createZoomRoom } = require("./zoom");

Parse.Cloud.define("import-program", async (request) => {
    try {
        const { params, user } = request;
        const confId = params.conference;
        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin"]);
        if (authorized) {
            const adminProfile = await getProfileOfUser(user, confId);

            const programData = params.data;

            const conference = await new Parse.Object("Conference", { id: confId }).fetch({ useMasterKey: true });

            const {
                tracks,
                feeds,
                items,
                events,
                persons,
                sessions,
                attachmentTypes
            } = programData;

            for (const sessionSpec of Object.values(sessions)) {
                if (!sessionSpec.feed) {
                    sessionSpec.feed = sessionSpec.id;
                }

                if (!feeds[sessionSpec.feed]) {
                    feeds[sessionSpec.feed] = {
                        id: sessionSpec.feed,
                        name: sessionSpec.title
                    };
                }
            }

            const tracksMap = {};
            const feedsMap = {};
            const itemsMap = {};
            const eventsMap = {};
            const personsMap = {};
            const sessionsMap = {};
            const attachmentTypesMap = {};

            const trackIds = Object.keys(tracks);
            const feedIds = Object.keys(feeds);
            const itemIds = Object.keys(items);
            const eventIds = Object.keys(events);
            const personIds = Object.keys(persons);
            const sessionIds = Object.keys(sessions);
            const attachmentTypeIds = Object.keys(attachmentTypes);

            // TODO: Validate that everything we try to look up in the maps actually exists.

            for (const feedId of feedIds) {
                let youtubeObj;
                let zoomRoomObj;
                let textChatObj;
                let videoRoomObj;

                const feed = feeds[feedId];
                const feedName = feed.name;

                if (feed.youtube) {
                    youtubeObj = await createYouTubeFeed({
                        conference,
                        videoId: feed.youtube
                    });
                }

                if (feed.zoomRoom) {
                    zoomRoomObj = await createZoomRoom({
                        conference,
                        url: feed.zoomRoom
                    });
                }

                if (feed.textChat || feed.videoRoom) {
                    textChatObj
                        = await new Parse.Query("TextChat")
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
                            mode: "ordinary"
                        });
                    }
                }

                if (feed.videoRoom) {
                    videoRoomObj
                        = await new Parse.Query("VideoRoom")
                            .equalTo("conference", conference)
                            .equalTo("name", feedName)
                            .first({ useMasterKey: true });
                    if (!videoRoomObj) {
                        videoRoomObj = await createVideoRoom({
                            capacity: 50,
                            ephemeral: false,
                            isPrivate: false,
                            name: feedName,
                            conference,
                            textChat: textChatObj
                        }, user);
                    }
                    else {
                        await videoRoomObj.save({ textChat: textChatObj }, { useMasterKey: true });
                    }
                }

                feedsMap[feedId] = await createContentFeed({
                    name: feedName,
                    conference,
                    youtube: youtubeObj,
                    zoomRoom: zoomRoomObj,
                    videoRoom: videoRoomObj,
                    textChat: !videoRoomObj ? textChatObj : undefined,
                    originatingID: feedId
                });
            }

            for (const attachmentTypeId of attachmentTypeIds) {
                const attachmentTypeSpec = attachmentTypes[attachmentTypeId];
                attachmentTypesMap[attachmentTypeId] = await createAttachmentType({
                    supportsFile: attachmentTypeSpec.supportsFile,
                    name: attachmentTypeSpec.name,
                    isCoverImage: attachmentTypeSpec.isCoverImage,
                    displayAsLink: attachmentTypeSpec.displayAsLink,
                    extra: attachmentTypeSpec.extra,
                    ordinal: attachmentTypeSpec.ordinal,
                    conference,
                    fileTypes: attachmentTypeSpec.fileTypes ? attachmentTypeSpec.fileTypes : [],
                });
            }

            for (const personId of personIds) {
                const personSpec = persons[personId];
                personsMap[personId] = await createProgramPerson({
                    name: personSpec.name,
                    affiliation: personSpec.affiliation,
                    conference
                });
            }

            for (const trackId of trackIds) {
                const trackSpec = tracks[trackId];
                tracksMap[trackId] = await createProgramTrack({
                    shortName: trackSpec.shortName,
                    name: trackSpec.name,
                    colour: trackSpec.colour,
                    feed: trackSpec.feed ? feedsMap[trackSpec.feed] : undefined,
                    conference
                });
            }

            for (const itemId of itemIds) {
                const itemSpec = items[itemId];
                itemsMap[itemId] = await createProgramItem({
                    abstract: itemSpec.abstract,
                    exhibit: itemSpec.exhibit,
                    title: itemSpec.title,
                    authors: itemSpec.authors,
                    feed: itemSpec.feed ? feedsMap[itemSpec.feed] : undefined,
                    track: tracksMap[itemSpec.track],
                    originatingID: itemSpec.id,
                    conference
                });
            }

            for (const sessionId of sessionIds) {
                const sessionSpec = sessions[sessionId];
                sessionsMap[sessionId] = await createProgramSession({
                    title: sessionSpec.title,
                    feed: sessionSpec.feed ? feedsMap[sessionSpec.feed] : undefined,
                    track: tracksMap[sessionSpec.track],
                    chair: sessionSpec.chair,
                    originatingID: sessionSpec.id,
                    conference
                });
            }

            for (const eventId of eventIds) {
                const eventSpec = events[eventId];
                eventsMap[eventId] = await createProgramSessionEvent({
                    directLink: eventSpec.directLink,
                    endTime: new Date(eventSpec.endTime),
                    startTime: new Date(eventSpec.startTime),
                    feed: eventSpec.feed ? feedsMap[eventSpec.feed] : undefined,
                    item: itemsMap[eventSpec.item],
                    session: sessionsMap[eventSpec.session],
                    chair: eventSpec.chair,
                    originatingID: eventSpec.id,
                    conference
                });
            }

            // TODO: Delete any not present in the upload (in correct order)

            return true;
        }
    }
    catch (e) {
        console.error("Could not import program: " + e);
    }
    return false;
});
