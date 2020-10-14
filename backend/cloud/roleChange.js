/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");
const { isUserInRoles, getRoleByName } = require("./role");
const { getConfig } = require("./config");
const { getUserProfileById } = require("./user");

const assert = require("assert");
const Twilio = require("twilio");

const promoteSchema = {
    conference: "string",
    target: "string",
    newRole: "string"
};

/**
 * @param {Pointer} targetProfile
 * @param {Pointer} conference
 */
async function handlePromoteAttendeeToManager(targetProfile, conference) {
    const config = await getConfig(conference.id);
    const accountSID = config.TWILIO_ACCOUNT_SID;
    const accountAuth = config.TWILIO_AUTH_TOKEN;
    const twilioClient = Twilio(accountSID, accountAuth);
    const serviceSID = config.TWILIO_CHAT_SERVICE_SID;
    const service = twilioClient.chat.services(serviceSID);

    const roles = await service.roles.list();
    const channelAdminRole = roles.find(x => x.friendlyName === "channel admin");
    const channelUserRole = roles.find(x => x.friendlyName === "channel user");
    const serviceAdminRole = roles.find(x => x.friendlyName === "service admin");
    const announcementsAdminRole = roles.find(x => x.friendlyName === "announcements admin");

    assert(channelAdminRole);
    assert(channelUserRole);
    assert(serviceAdminRole);
    assert(announcementsAdminRole);

    // Promote user to service-level admin
    await service.users(targetProfile.id).update({ roleSid: serviceAdminRole.sid });

    // Go through all of target user's current channels and promote to channel-level admin role
    const channelPromises = [];
    service.users(targetProfile.id).userChannels.each(channel => {
        channelPromises.push(
            service
                .channels(channel.channelSid)
                .members(channel.memberSid)
                .update({
                    roleSid: channelAdminRole.sid
                }));
    });
    await Promise.all(channelPromises);

    // Give target user channel-level user role for moderation hub channel
    const moderationHubTextChat
        = await new Parse.Query("TextChat")
            .equalTo("conference", conference)
            .equalTo("mode", "moderation_hub")
            .first({ useMasterKey: true });
    const moderationHubChannelSID = moderationHubTextChat.get("twilioID");
    try {
        await service.channels(moderationHubChannelSID).members.create({
            identity: targetProfile.id,
            roleSid: channelUserRole.sid,
        });
    } catch (e) {
        await service.channels(moderationHubChannelSID).members(targetProfile.id).update({
            roleSid: channelUserRole.sid,
        });
    }

    // Give target user channel-level announcements-admin role for announcements channel
    const announcementsChannelSID = config.TWILIO_ANNOUNCEMENTS_CHANNEL_SID;
    await service.channels(announcementsChannelSID).members(targetProfile.id).update({
        roleSid: announcementsAdminRole.sid
    });

    const managerRole = await getRoleByName(conference.id, "manager");
    const managerUsers = managerRole.relation("users");
    managerUsers.add(targetProfile.get("user"));
    await managerRole.save(null, { useMasterKey: true });
}

Parse.Cloud.define("promote", async (request) => {
    const { params, user } = request;

    const requestValidation = validateRequest(promoteSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.target = await getUserProfileById(spec.target, confId);
            if (!spec.target) {
                throw new Error("User profile not found");
            }
            const targetUser = spec.target.get("user");
            if (await isUserInRoles(targetUser.id, confId, ["attendee"]) && spec.newRole === "manager") {
                await handlePromoteAttendeeToManager(spec.target, spec.conference);
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

const demoteSchema = {
    conference: "string",
    target: "string",
    newRole: "string"
};

/**
 * @param {Pointer} targetProfile
 * @param {Pointer} conference
 */
async function handleDemoteManagerToAttendee(targetProfile, conference) {
    const config = await getConfig(conference.id);
    const accountSID = config.TWILIO_ACCOUNT_SID;
    const accountAuth = config.TWILIO_AUTH_TOKEN;
    const twilioClient = Twilio(accountSID, accountAuth);
    const serviceSID = config.TWILIO_CHAT_SERVICE_SID;
    const service = twilioClient.chat.services(serviceSID);

    const roles = await service.roles.list();
    const channelUserRole = roles.find(x => x.friendlyName === "channel user");
    const serviceUserRole = roles.find(x => x.friendlyName === "service user");
    const announcementsUserRole = roles.find(x => x.friendlyName === "announcements user");

    assert(channelUserRole);
    assert(serviceUserRole);
    assert(announcementsUserRole);

    const managerRole = await getRoleByName(conference.id, "manager");
    const managerUsers = managerRole.relation("users");
    managerUsers.remove(targetProfile.get("user"));
    await managerRole.save(null, { useMasterKey: true });

    // Reverse promotions
    const announcementsChannelSID = config.TWILIO_ANNOUNCEMENTS_CHANNEL_SID;

    // Promote user to service-level admin
    await service.users(targetProfile.id).update({ roleSid: serviceUserRole.sid });

    // Remove user from the moderation hub channel
    const moderationHubTextChat
        = await new Parse.Query("TextChat")
            .equalTo("conference", conference)
            .equalTo("mode", "moderation_hub")
            .first({ useMasterKey: true });
    const moderationHubChannelSID = moderationHubTextChat.get("twilioID");
    await service.channels(moderationHubChannelSID).members(targetProfile.id).remove();

    // Go through all of target user's current channels and demote to channel-level user role
    const channelPromises = [];
    const memberChannelSIDs = [];
    service.users(targetProfile.id).userChannels.each(channel => {
        if (announcementsChannelSID !== channel.channelSid) {
            memberChannelSIDs.push(channel.channelSid);
            channelPromises.push(
                service
                    .channels(channel.channelSid)
                    .members(channel.memberSid)
                    .update({
                        roleSid: channelUserRole.sid
                    }));
        }
    });
    await Promise.all(channelPromises);

    // Give target user channel-level user role for announcements channel
    await service.channels(announcementsChannelSID).members(targetProfile.id).update({
        roleSid: announcementsUserRole.sid
    });

    // Give Parse ACL read access to all existing channels that target user is a member of
    const targetUser = targetProfile.get("user");
    await new Parse.Query("TextChat")
        .equalTo("conference", conference)
        .equalTo("mode", "moderation")
        .containedIn("twilioID", memberChannelSIDs)
        .map(async tc => {
            const acl = tc.getACL();
            acl.setReadAccess(targetUser, true);
            acl.setWriteAccess(targetUser, false);
            await tc.save(null, { useMasterKey: true });
        }, {
            useMasterKey: true
        });
}

Parse.Cloud.define("demote", async (request) => {
    const { params, user } = request;

    const requestValidation = validateRequest(demoteSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.target = await getUserProfileById(spec.target, confId);
            const targetUser = spec.target.get("user");
            if (await isUserInRoles(targetUser.id, confId, ["manager"]) && spec.newRole === "attendee") {
                await handleDemoteManagerToAttendee(spec.target, spec.conference);
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
