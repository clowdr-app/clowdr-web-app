/* global Parse */
// ^ for eslint

// tslint:disable:no-console

const { getRoleByName, isUserInRoles } = require("./role");
const { getUserById, getUserProfileById, getProfileOfUser, getProfileOfUserId } = require("./user");
const { getConferenceConfigurationByKey } = require("./conference");
const { getConfig } = require("./config");
const { callWithRetry, validateRequest } = require("./utils");

const { v4: uuidv4 } = require("uuid");
const assert = require("assert");
const Twilio = require("twilio");

// TODO: Before delete: Prevent delete if still in use anywhere
// TODO: Before delete: Delete channel in Twilio
// TODO: Before delete: Delete mirrored TextChatMessage
// WATCH_TODO: Before delete: Remove from user's watched items

async function ensureTwilioUsersExist(service, profiles) {
    const existingUserProfileIds = (await service.users.list()).map(x => x.identity);
    await Promise.all(profiles.map(x => {
        if (!existingUserProfileIds.includes(x.id)) {
            return service.users.create({
                identity: x.id,
                friendlyName: x.get("displayName")
            });
        }
        return null;
    }));
}

const validChannelModes = [
    "moderation_hub", "moderation", "moderation_completed", "ordinary"
];

Parse.Cloud.beforeSave("TextChat", async (req) => {
    const textChat = req.object;
    const conference = textChat.get("conference");

    // May be undefined or null
    if (!textChat.get("mirrored")) {
        textChat.set("mirrored", false);
    }

    // May be undefined or null
    if (!textChat.get("mode")) {
        textChat.set("mode", "ordinary");
    }

    let isDM = textChat.get("isDM");
    const mode = textChat.get("mode");
    if (!validChannelModes.includes(mode)) {
        throw new Error("Invalid mode");
    }
    const isModerationHub = mode === "moderation_hub";
    const isModeration = mode === "moderation" || mode === "moderation_completed";

    let acl = textChat.getACL();
    const attendeeRole = await getRoleByName(conference.id, "attendee");
    const managerRole = await getRoleByName(conference.id, "manager");
    const adminRole = await getRoleByName(conference.id, "admin");

    let isPrivate;
    if (isModeration || isModerationHub) {
        isPrivate = true;
        acl.setRoleReadAccess(attendeeRole, false);
        acl.setRoleWriteAccess(attendeeRole, false);
    }
    else {
        isPrivate = !acl.getRoleReadAccess(attendeeRole);
    }

    const userIdsWithAccess = Object.keys(acl.permissionsById).filter(x => !x.startsWith("role:"));
    const profilesWithAccess = await Promise.all(userIdsWithAccess.map(userId => getProfileOfUserId(userId, conference.id)));
    assert(profilesWithAccess.every(profile => !!profile));

    if (!textChat.isNew()) {
        assert(req.original, "Why does the original text chat not exist on this request?");

        const originalTextChat = req.original;
        const originalACL = originalTextChat.getACL();

        const originalConference = originalTextChat.get("conference");
        const originalIsPrivate = !originalACL.getRoleReadAccess(attendeeRole);
        const originalIsDM = originalTextChat.get("isDM");
        const originalName = originalTextChat.get("name");
        const originalMirrored = originalTextChat.get("mirrored");
        const originalTwilioID = originalTextChat.get("twilioID");
        const originalMode = originalTextChat.get("mode");
        const originalCreator = originalTextChat.get("creator");

        if (originalConference.id !== conference.id) {
            throw new Error("Cannot change the associated conference.");
        }

        if (originalMode === "moderation_hub" ||
            originalMode === "ordinary" ||
            originalMode === "moderation_completed") {
            if (mode !== originalMode) {
                throw new Error("Invalid mode transition.");
            }
        }
        else if (originalMode === "moderation") {
            if (mode !== "moderation" && mode !== "moderation_completed") {
                throw new Error("Invalid mode transition.");
            }
        }

        if (originalIsPrivate !== isPrivate) {
            if (originalIsPrivate) {
                throw new Error("Cannot make a private chat public.");
            }
            else {
                throw new Error("Cannot make a public chat private.");
            }
        }

        if (originalIsDM !== isDM) {
            if (originalIsDM) {
                throw new Error("Cannot make a DM into a group chat.");
            }
            else {
                throw new Error("Cannot make a group chat into a DM.");
            }
        }

        if (originalIsDM && originalName !== textChat.get("name")) {
            throw new Error("Cannot change the name of a DM chat.");
        }

        if (originalMirrored && !textChat.get("mirrored")) {
            throw new Error("Cannot un-mirror");
        }

        if (originalTwilioID && originalTwilioID !== textChat.get("twilioID")) {
            throw new Error("Cannot change to a different Twilio ID.");
        }

        if (originalCreator.id !== textChat.get("creator").id) {
            throw new Error("Cannot change creator!");
        }
    }

    if (isModerationHub || isModeration) {
        isDM = false;
        textChat.set("isDM", false);
    }
    else if (isDM) {
        if (!isPrivate) {
            throw new Error("DMs must be private.");
        }

        if (userIdsWithAccess.length !== 2) {
            throw new Error("DMs must be accessible by exactly two users.");
        }

        const profile1 = profilesWithAccess[0];
        const profile2 = profilesWithAccess[1];
        textChat.set("name",
            profile1.id.localeCompare(profile2.id) === -1
                ? `${profile1.id}-${profile2.id}`
                : `${profile2.id}-${profile1.id}`);
    }

    const name = textChat.get("name").trim();
    if (!name || name === "") {
        throw new Error("Name cannot be blank");
    }
    if (name.length < 5) {
        throw new Error("Name is too short");
    }
    textChat.set("name", name);

    if (isModerationHub || isModeration) {
        textChat.set("autoWatch", true);
    }
    else {
        const announcementsSIDConfig = await getConferenceConfigurationByKey(conference, "TWILIO_ANNOUNCEMENTS_CHANNEL_SID");
        const announcementsSID = announcementsSIDConfig.get("value");
        if (textChat.get("twilioID") && textChat.get("twilioID") === announcementsSID) {
            textChat.set("autoWatch", true);
        }
        else if (isDM) {
            textChat.set("autoWatch", true);
        }
    }

    const config = await getConfig(conference.id);
    const accountSID = config.TWILIO_ACCOUNT_SID;
    const accountAuth = config.TWILIO_AUTH_TOKEN;
    const twilioClient = Twilio(accountSID, accountAuth);
    const serviceSID = config.TWILIO_CHAT_SERVICE_SID;
    const service = twilioClient.chat.services(serviceSID);

    if (!textChat.get("twilioID")) {
        // Twilio max-length 64 chars
        const uniqueName
            = (isDM
                ? name
                : uuidv4())
                .substr(0, 64);
        const friendlyName = name;
        const requester = req.user ? await getProfileOfUser(req.user, conference.id) : null;
        const createdBy = isDM ? "system" : requester ? requester.id : "system";
        const attributes = {};

        const existingChannels
            = isDM
                ? (await service.channels.list()).filter(x => x.uniqueName === uniqueName)
                : [];

        let newChannel;
        if (existingChannels.length > 0) {
            newChannel = existingChannels[0];
            const existingTextChatsQ = new Parse.Query("TextChat");
            existingTextChatsQ.equalTo("twilioID", newChannel.sid);
            const existingTextChat = await existingTextChatsQ.first({ useMasterKey: true });
            if (existingTextChat) {
                throw new Error("Text chat for channel already exists.");
            }
        }
        else {
            newChannel = await callWithRetry(() => service.channels.create({
                friendlyName,
                uniqueName,
                createdBy,
                type: isPrivate ? "private" : "public",
                attributes: JSON.stringify(attributes)
            }));

            console.log(`Created Twilio channel '${friendlyName}' (${newChannel.sid})`);
        }

        if (!newChannel) {
            throw new Error("Could not get or create Twilio channel for the chat");
        }

        textChat.set("twilioID", newChannel.sid);
    }

    const channel = service.channels(textChat.get("twilioID"));

    try {
        // We're only going to force membership/non-membership if the chat is private
        // For public chats, we'll let the client side and/or mirroring code take
        // care of things.
        if (isPrivate) {
            // We're going to reconstruct the ACL as we go to make sure we're in sync
            // with Twilio even if something goes wrong.
            const newACL = new Parse.ACL();
            textChat.setACL(newACL);
            if (!isModeration) {
                newACL.setRoleWriteAccess(managerRole, true);
                newACL.setRoleReadAccess(managerRole, true);
            }
            newACL.setRoleWriteAccess(adminRole, true);
            newACL.setRoleReadAccess(adminRole, true);

            await ensureTwilioUsersExist(service, profilesWithAccess);

            const membersProp = channel.members;
            const invitesProp = channel.invites;

            const members = await membersProp.list();
            const membersWithProfiles = await Promise.all(members.map(async member => ({
                member,
                profile: await getUserProfileById(member.identity, conference.id)
            })));
            // Make the new ACL match exactly the Twilio state
            membersWithProfiles.forEach(member => {
                newACL.setReadAccess(member.profile.get("user").id, true);
            });

            // Clear out any invites - we're not using invites anymore
            const invites = await invitesProp.list();
            await Promise.all(invites.map(invite => invite.remove()));

            const memberProfileIds = membersWithProfiles.map(async member => member.member.identity);
            // TODO: do we ever actually want to kick based on ACLs?
            // const profileIdsWithAccess = profilesWithAccess.map(x => x.id);
            // await Promise.all(membersWithProfiles.map(async member => {
            //     if (!profileIdsWithAccess.includes(member.member.identity)) {
            //         // TODO: Is this line broken? It seems to be untested and failed once in experiments
            //         //       The function call may be wrong
            //         await member.remove();
            //         newACL.setReadAccess(member.profile.get("user").id, false);
            //     }
            //     else {
            //         memberProfileIds.push(member.member.identity);
            //     }
            // }));

            const roles = await service.roles.list();
            const channelAdminRole = roles.find(x => x.friendlyName === "channel admin");
            const channelUserRole = roles.find(x => x.friendlyName === "channel user");

            assert(channelAdminRole);
            assert(channelUserRole);

            await Promise.all(profilesWithAccess.map(async profile => {
                if (!memberProfileIds.includes(profile.id)) {
                    const user = profile.get("user");
                    const userIsManager = await isUserInRoles(user.id, conference.id, ["admin", "manager"]);
                    await callWithRetry(() => membersProp.create({
                        identity: profile.id,
                        roleSid: userIsManager && !isModerationHub ? channelAdminRole.sid : channelUserRole.sid
                    }));
                    newACL.setReadAccess(user.id, true);
                }
            }));
        }
    }
    catch (e) {
        console.error("Could not update members of Twilio channel", e);
    }
});

Parse.Cloud.afterSave("TextChat", async (req) => {
    const textChat = req.object;
    if (textChat.get("autoWatch")) {
        const acl = textChat.getACL();
        const conference = textChat.get("conference");
        const attendeeRole = await getRoleByName(conference.id, "attendee");

        if (acl.getRoleReadAccess(attendeeRole)) {
            // Public: everyone should be auto-watching
            const profilesQ = new Parse.Query("UserProfile");
            profilesQ.equalTo("conference", conference);
            profilesQ.includeAll();
            await profilesQ.map(async profile => {
                const watched = profile.get("watched");
                const existingWatchedChats = watched.get("watchedChats");
                const newWatchedChats
                    = existingWatchedChats.includes(textChat.id)
                        ? existingWatchedChats
                        : [...existingWatchedChats, textChat.id];
                await watched.save({
                    watchedChats: newWatchedChats
                }, { useMasterKey: true });
            }, { useMasterKey: true });
        }
        else {
            // Follow ACL users to determine who to force to watch this chat
            const keys = Object.keys(acl.permissionsById);
            // Exclude existing users from the auto watch process in case they unfollowed already
            const excludeKeys = textChat.isNew() || !req.original ? [] : Object.keys(req.original.getACL().permissionsById);
            await Promise.all(keys.map(async key => {
                if (!key.startsWith("role:") && !excludeKeys.includes(key)) {
                    // Key is a user id
                    const user = await getUserById(key);
                    const profile = await getProfileOfUser(user, conference.id);
                    const watched = await profile.get("watched").fetch({ useMasterKey: true });
                    const existingWatchedChats = watched.get("watchedChats");
                    const newWatchedChats
                        = existingWatchedChats.includes(textChat.id)
                            ? existingWatchedChats
                            : [...existingWatchedChats, textChat.id];
                    await watched.save({
                        watchedChats: newWatchedChats
                    }, { useMasterKey: true });
                }
            }));
        }
    }
});

Parse.Cloud.beforeDelete("TextChat", async (req) => {
    const textChat = req.object;
    const conference = textChat.get("conference");

    const twilioID = textChat.get("twilioID");
    if (twilioID) {
        const config = await getConfig(conference.id);
        const accountSID = config.TWILIO_ACCOUNT_SID;
        const accountAuth = config.TWILIO_AUTH_TOKEN;
        const twilioClient = Twilio(accountSID, accountAuth);
        const serviceSID = config.TWILIO_CHAT_SERVICE_SID;
        const service = twilioClient.chat.services(serviceSID);
        const channel = service.channels(twilioID);
        try {
            await channel.remove();
        }
        catch (e) {
            // "The requested resource /Services/SERVICE_ID/Channels/CHANNEL_ID was not found"
            // Occurs if the channel was already deleted.
            if (!(e.toString().includes("resource") && e.toString().includes("not found"))) {
                throw e;
            }
        }
    }
});

async function createTextChat(data) {
    if (data.mode === "moderation" && data.relatedModerationKey) {
        const existingTC
            = await new Parse.Query("TextChat")
                .equalTo("conference", data.conference)
                .equalTo("mode", "moderation")
                .equalTo("creator", data.creator)
                .equalTo("relatedModerationKey", data.relatedModerationKey)
                .first({ useMasterKey: true });
        if (existingTC) {
            return existingTC;
        }
    }
    else if (data.isDM && data.members && data.members.length === 2) {
        const existingTC
            = await new Parse.Query("TextChat")
                .equalTo("conference", data.conference)
                .equalTo("isDM", true)
                .equalTo("name",
                    data.members[0].localeCompare(data.members[1]) === -1
                        ? `${data.members[0]}-${data.members[1]}`
                        : `${data.members[1]}-${data.members[0]}`)
                .first({ useMasterKey: true });
        if (existingTC) {
            return existingTC;
        }
    }

    let newObject = new Parse.Object("TextChat", {
        name: data.name,
        conference: data.conference,
        isDM: data.isDM,
        autoWatch: data.autoWatch,
        twilioID: data.twilioID,
        mirrored: data.mirrored,
        creator: data.creator,
        mode: data.mode,
        relatedModerationKey: data.relatedModerationKey
    });

    const confId = newObject.get("conference").id;
    const adminRole = await getRoleByName(confId, "admin");
    const managerRole = await getRoleByName(confId, "manager");
    const attendeeRole = await getRoleByName(confId, "attendee");

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);

    let memberProfiles;
    if (data.isPrivate) {
        if (!data.members) {
            throw new Error("Must specify initial members for a private chat.");
        }
        if (data.isDM && data.members.length !== 2) {
            throw new Error("A DM must have exactly two members.");
        }

        memberProfiles = await Promise.all(data.members.map(memberId => getUserProfileById(memberId, data.conference.id)));
        memberProfiles.forEach(memberProfile => {
            acl.setReadAccess(memberProfile.get("user").id, true);
        });
    }
    else {
        acl.setRoleReadAccess(attendeeRole, true);
    }
    acl.setRoleWriteAccess(managerRole, true);
    acl.setRoleWriteAccess(adminRole, true);
    newObject.setACL(acl);

    newObject = await newObject.save(null, { useMasterKey: true });

    let targetChannel;
    let modHubChannel;
    const newMode = newObject.get("mode");

    if (newMode === "moderation" || data.initialMessage) {
        const config = await getConfig(newObject.get("conference").id);
        const accountSID = config.TWILIO_ACCOUNT_SID;
        const accountAuth = config.TWILIO_AUTH_TOKEN;
        const twilioClient = Twilio(accountSID, accountAuth);
        const serviceSID = config.TWILIO_CHAT_SERVICE_SID;
        const service = twilioClient.chat.services(serviceSID);
        targetChannel = service.channels(newObject.get("twilioID"));

        if (newMode === "moderation") {
            const modHubChat = await (
                new Parse.Query("TextChat")
                    .equalTo("conference", newObject.get("conference"))
                    .equalTo("mode", "moderation_hub")
                    .first({ useMasterKey: true }));
            assert(modHubChat);
            modHubChannel = service.channels(modHubChat.get("twilioID"));
        }
    }

    if (newMode === "moderation") {
        let body;
        if (newObject.get("relatedModerationKey")) {
            const channelId = newObject.get("relatedModerationKey").split(":")[0];
            const channel = await new Parse.Query("TextChat").get(channelId, { useMasterKey: true });
            body = `${data.creator.get("displayName")} has reported a message in ${channel.get("name")}`;
        }
        else {
            const modProfiles = memberProfiles.filter(x => x.id !== data.creator.id);
            const modNames = modProfiles.reduce((acc, x) => `${acc}, ${x.get("displayName")}`, "").substr(2);
            body = `${data.creator.get("displayName")} has requested help${modNames.length > 0 ? ` from ${modNames}` : ""}.`;
        }

        await modHubChannel.messages.create({
            from: "system",
            body,
            attributes: JSON.stringify({
                moderationChat: newObject.id
            }),
            xTwilioWebhookEnabled: true
        });
    }

    if (data.initialMessage) {
        await targetChannel.messages.create({
            from: newObject.get("creator").id,
            body: data.initialMessage,
            xTwilioWebhookEnabled: true
        });
    }

    return newObject;
}

const createTextChatSchema = {
    name: "string",
    conference: "string",
    isModeration: "boolean?",
    isPrivate: "boolean",
    isDM: "boolean",
    autoWatch: "boolean",
    members: "[string]?",
    twilioID: "string?",
    mirrored: "boolean?",
    relatedModerationKey: "string?",
    initialMessage: "string?"
};

Parse.Cloud.define("textChat-create", async (req) => {
    const { params, user } = req;

    const requestValidation = validateRequest(createTextChatSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager", "attendee"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.creator = await getProfileOfUser(user, confId);
            if (spec.isModeration) {
                spec.mode = "moderation";
            }
            else {
                spec.mode = "ordinary";
            }
            const result = await createTextChat(spec);
            return result.id;
        }
        else {
            throw new Error("Permission denied");
        }
    }
    else {
        throw new Error(requestValidation.error);
    }
});

const inviteToTextChatSchema = {
    conference: "string",
    chat: "string",
    members: "[string]"
};

Parse.Cloud.define("textChat-invite", async (req) => {
    const { params, user } = req;

    const requestValidation = validateRequest(inviteToTextChatSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager", "attendee"]);
        if (authorized) {
            const textChat = await getTextChatById(req.params.chat, req.params.conference, user.getSessionToken());
            if (textChat) {
                const acl = textChat.getACL();
                const memberProfiles = await Promise.all(req.params.members.map(memberId => getUserProfileById(memberId, req.params.conference)));
                memberProfiles.forEach(memberProfile => {
                    acl.setReadAccess(memberProfile.get("user").id, true);
                });
                await textChat.save(null, { useMasterKey: true });
            }
            else {
                throw new Error("Permission denied");
            }
        }
        else {
            throw new Error("Permission denied");
        }
    }
    else {
        throw new Error(requestValidation.error);
    }
});

async function getTextChatById(chatId, confId, mSessionToken) {
    const q = new Parse.Query("TextChat");
    q.equalTo("conference", new Parse.Object("Conference", { id: confId }));
    return q.get(chatId, mSessionToken ? { sessionToken: mSessionToken } : { useMasterKey: true });
}

async function getTextChatByName(name, confId) {
    const q = new Parse.Query("TextChat");
    q.equalTo("conference", new Parse.Object("Conference", { id: confId }));
    q.equalTo("name", name);
    return q.first({ useMasterKey: true });
}

module.exports = {
    getTextChatByName: getTextChatByName
};
