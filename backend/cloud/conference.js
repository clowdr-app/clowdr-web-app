/* global Parse */
// ^ for eslint

// tslint:disable:no-console

const Twilio = require("twilio");

const { validateRequest } = require("./utils");
const { generateRoleDBName, getRoleByName, isUserInRoles } = require("./role");
const assert = require("assert");

/**
 * All the information needed to initialise a fresh conference.
 */
const createConferenceRequestSchema = {
    conference: {
        // Conference
        name: "string",
        shortName: "string",
        welcomeText: "string",

        // Conference Configuration
        signUpEnabled: "boolean",
        moderationCustomNotice: "string?",

        // Privileged Conference Details
        loggedInText: "string"
    },
    admin: {
        // User
        username: "string",
        password: "string",
        email: "string",

        // User Profile
        realName: "string",
        pronouns: "[string]",
        displayName: "string",
        country: "string",
    },
    twilio: {
        subaccountName: "string?",
        MASTER_SID: "string",
        MASTER_AUTH_TOKEN: "string",
        CHAT_PRE_WEBHOOK_URL: "string",
        CHAT_POST_WEBHOOK_URL: "string"
    },
    react: {
        TWILIO_CALLBACK_URL: "string",
        FRONTEND_URL: "string"
    },
    sendgrid: {
        API_KEY: "string",
        SENDER: "string"
    },
    zoom: {
        API_KEY: "string",
        API_SECRET: "string"
    }
};

const TWILIO_WEBHOOK_METHOD = 'POST';
// Copied to clowdr-backend/Twilio.ts - also update there when modifying.
const TWILIO_WEBHOOK_EVENTS = [
    "onUserAdded",
    "onMemberAdded",
    // Per-channel webhooks: "onMessageSent",
    // Per-channel webhooks: "onMessageUpdated",
    // Per-channel webhooks: "onMessageRemoved",
    // Per-channel webhooks: "onMediaMessageSent",
    // Per-channel webhooks: "onChannelUpdated",
    // Per-channel webhooks: "onChannelDestroyed",
];
const TWILIO_REACHABILITY_ENABLED = true;
const TWILIO_READ_STATUS_ENABLED = true;
const TWILIO_MEMBERS_PER_CHANNEL_LIMIT = 3000;
const TWILIO_CHANNELS_PER_USER_LIMIT = 250;
const TWILIO_CHAT_PRE_WEBHOOK_RETRY_COUNT = 1;
const TWILIO_CHAT_POST_WEBHOOK_RETRY_COUNT = 1;

// Order matters - sort on inheritedBy, circular relationships not allowed.
const defaultRoles = [
    { name: "admin", inheritedBy: [] },
    { name: "manager", inheritedBy: ["admin"] },
    { name: "attendee", inheritedBy: ["manager"] },
];

const defaultFlairs = [
    { label: "Admin", color: "rgba(200, 32, 0, 1)", tooltip: "Conference administrator", priority: 100 },
    { label: "Moderator", color: "rgba(32, 200, 0, 1)", tooltip: "Conference moderator", priority: 90 }
];

const defaultTwilioChatRoles = [
    {
        name: "service admin",
        type: "deployment",
        permissions: [
            "joinChannel",
            "editAnyUserInfo",
            "destroyChannel",
            "removeMember",
            "editChannelName",
            "editChannelAttributes",
            "editAnyMemberAttributes",
            "editAnyMessage",
            "editAnyMessageAttributes",
            "deleteAnyMessage"
        ]
    },
    {
        name: "service user",
        type: "deployment",
        permissions: [
            "joinChannel",
            "editOwnUserInfo"
        ]
    },
    {
        name: "channel admin",
        type: "channel",
        permissions: [
            "sendMessage",
            "sendMediaMessage",
            "leaveChannel",
            "editNotificationLevel",
            "destroyChannel",
            "removeMember",
            "editChannelName",
            "editChannelAttributes",
            "editAnyMemberAttributes",
            "editAnyMessage",
            "deleteAnyMessage",
        ]
    },
    {
        name: "channel user",
        type: "channel",
        permissions: [
            "sendMessage",
            "sendMediaMessage",
            "leaveChannel",
            "editNotificationLevel",
            "editOwnMemberAttributes",
            "editOwnMessage",
            "deleteOwnMessage"
        ]
    },
    {
        name: "announcements admin",
        type: "channel",
        permissions: [
            "sendMessage",
            "sendMediaMessage",
            "editNotificationLevel"
        ]
    },
    {
        name: "announcements user",
        type: "channel",
        // We have to give at least one permission
        // If they can't send any messages, the edit permission is a safe irrelevancy
        permissions: [
            'editOwnMessage'
        ]
    }
];

const TWILIO_ANNOUNCEMENTS_CHANNEL_NAME = "Announcements";
const TWILIO_MODERATIONHUB_CHANNEL_NAME = "Moderation Hub";

async function getConferenceById(id) {
    let query = new Parse.Query("Conference");
    return query.get(id, { useMasterKey: true });
}

async function getConferenceConfigurationByKey(conference, key) {
    let query = new Parse.Query("ConferenceConfiguration");
    query.equalTo("conference", conference);
    query.equalTo("key", key);
    try {
        return query.first({ useMasterKey: true });
    }
    catch {
        return null;
    }
}

async function getConferenceDetails(conference, key) {
    let query = new Parse.Query("PrivilegedConferenceDetails");
    query.equalTo("conference", conference);
    query.equalTo("key", key);
    try {
        return query.first({ useMasterKey: true });
    }
    catch {
        return null;
    }
}

Parse.Cloud.job("conference-create", async (request) => {
    const { params, message: _message } = request;
    const message = (msg) => {
        console.log(msg);
        _message(msg);
    };
    message("Starting create conference...");

    // Stuff we re-use but doesn't directly need cleaning up
    let twilioMasterClient = null;
    let twilioSubaccountClient = null;
    let twilioChatService = null;

    // Stuff to be cleaned up if creation fails
    let conference = null;
    const roleMap = new Map();
    const flairMap = new Map();
    let loggedInText = null;
    let adminUser = null;
    let adminUserProfile = null;
    let twilioSubaccount = null;
    let announcementsChat = null;
    let moderationHubChat = null;
    const configurationMap = new Map();

    async function cleanupOnFailure() {
        message("Cleaning up...");
        let cleanupSuccess = true;

        try {
            if (moderationHubChat) {
                await moderationHubChat.remove({ useMasterKey: true });
            }
        }
        catch (e2) {
            console.error(`Failed to clean up moderation hub chat. ${e2}`);
            cleanupSuccess = false;
        }

        try {
            if (announcementsChat) {
                await announcementsChat.remove({ useMasterKey: true });
            }
        }
        catch (e2) {
            console.error(`Failed to clean up announcements chat. ${e2}`);
            cleanupSuccess = false;
        }

        try {
            for (let configItem of configurationMap.values()) {
                console.log(`Destroying configuration: '${configItem.get("key")}'`);
                await configItem.destroy({ useMasterKey: true });
                console.log(`Destroyed configuration: '${configItem.get("key")}'`);
            }
        }
        catch (e2) {
            console.error(`Failed to clean up configuration items. ${e2}`);
            cleanupSuccess = false;
        }

        try {
            if (twilioSubaccount) {
                console.log(`Suspending Twilio subaccount. ${twilioSubaccount.sid}`);
                await twilioMasterClient.api.accounts(twilioSubaccount.sid).update({ status: 'suspended' });
                console.log(`Suspended Twilio subaccount. ${twilioSubaccount.sid}`);
            }
        }
        catch (e2) {
            console.error(`Failed to suspend Twilio subaccount. ${e2}`);
            cleanupSuccess = false;
        }

        try {
            if (adminUserProfile) {
                console.log(`Destroying admin user profile: '${adminUserProfile.id}'`);
                await adminUserProfile.destroy({ useMasterKey: true });
                console.log(`Destroyed admin user profile: '${adminUserProfile.id}'`);
            }
        }
        catch (e2) {
            console.error(`Failed to clean up admin user profile. ${e2}`);
            cleanupSuccess = false;
        }

        try {
            if (adminUser) {
                console.log(`Destroying admin user: '${adminUser.id}'`);
                await adminUser.destroy({ useMasterKey: true });
                console.log(`Destroyed admin user: '${adminUser.id}'`);
            }
        }
        catch (e2) {
            console.error(`Failed to clean up admin user. ${e2}`);
            cleanupSuccess = false;
        }

        try {
            if (loggedInText) {
                console.log(`Destroying logged in text: '${loggedInText.id}'`);
                await loggedInText.destroy({ useMasterKey: true });
                console.log(`Destroyed logged in text: '${loggedInText.id}'`);
            }
        }
        catch (e2) {
            console.error(`Failed to clean up logged in text. ${e2}`);
            cleanupSuccess = false;
        }

        try {
            for (let flair of flairMap.values()) {
                console.log(`Destroying flair: '${flair.get("label")}'`);
                await flair.destroy({ useMasterKey: true });
                console.log(`Destroyed flair: '${flair.get("label")}'`);
            }
        }
        catch (e2) {
            console.error(`Failed to clean up flairs. ${e2}`);
            cleanupSuccess = false;
        }

        try {
            for (let role of roleMap.values()) {
                console.log(`Destroying role: ${role.get("name")}`);
                await role.destroy({ useMasterKey: true });
                console.log(`Destroyed role: ${role.get("name")}`);
            }
        }
        catch (e2) {
            console.error(`Failed to clean up roles. ${e2}`);
            cleanupSuccess = false;
        }

        try {
            if (conference) {
                console.log(`Destroying conference: ${conference.get("name")} (${conference.id})`);
                await conference.destroy({ useMasterKey: true });
                console.log(`Destroyed conference: ${conference.get("name")} (${conference.id})`);
            }
        }
        catch (e2) {
            console.error(`Failed to clean up conference. ${e2}`);
            cleanupSuccess = false;
        }
        let cleanupResultMsg = `Cleanup ${cleanupSuccess ? "successful" : "failed"}.`;
        console.log(cleanupResultMsg);
        message(cleanupResultMsg);
    }

    try {
        message("Starting...");

        message("Validating parameters");

        let requestValidation = validateRequest(createConferenceRequestSchema, params);
        if (requestValidation.ok) {
            twilioMasterClient = Twilio(params.twilio.MASTER_SID, params.twilio.MASTER_AUTH_TOKEN);
            twilioSubaccountClient = null;

            message("Creating conference");

            // Create the conference
            const conferenceO = new Parse.Object("Conference");
            conference = await conferenceO.save({
                name: params.conference.name,
                shortName: params.conference.shortName,
                welcomeText: params.conference.welcomeText,
                lastProgramUpdateTime: new Date()
            }, {
                useMasterKey: true
            });
            message(`Created conference object (initialisation ongoing): '${conference.id}'.`);

            // Create the roles
            async function createRole(name, inheritedBy) {
                message(`Creating role: ${name}, inheritedBy: ${JSON.stringify(inheritedBy)}`);
                const acl = new Parse.ACL();
                acl.setPublicReadAccess(true);
                acl.setPublicWriteAccess(false);

                const roleO = new Parse.Role(generateRoleDBName(conference.id, name), acl);
                roleO.set("conference", conference);

                if (name === "admin") {
                    acl.setRoleReadAccess(roleO, true);
                    acl.setRoleWriteAccess(roleO, true);
                }
                else {
                    const _adminRole = roleMap.get("admin");
                    acl.setRoleReadAccess(_adminRole, true);
                    acl.setRoleWriteAccess(_adminRole, true);
                }

                let roleRel = roleO.relation("roles");
                for (const inheritedByName of inheritedBy) {
                    roleRel.add(roleMap.get(inheritedByName));
                }

                const role = await roleO.save(null, { useMasterKey: true });

                roleMap.set(name, role);

                message(`Created role: ${name}`);
                return role;
            }
            message(`Creating roles...`);
            for (let role of defaultRoles) {
                await createRole(role.name, role.inheritedBy);
            }
            message(`Created roles.`);

            const adminRole = roleMap.get("admin");
            const managerRole = roleMap.get("manager");
            const attendeeRole = roleMap.get("attendee");

            message(`Setting conference roles...`);
            let conferenceACL = new Parse.ACL();
            conferenceACL.setPublicReadAccess(true);
            conferenceACL.setPublicWriteAccess(false);
            conferenceACL.setRoleWriteAccess(adminRole, true);
            conferenceO.setACL(conferenceACL);
            await conferenceO.save(null, { useMasterKey: true });
            message(`Set conference roles.`);

            // Helper function re-used throughout
            async function setConfiguration(key, value, attendeeRead, publicRead) {
                message(`Creating configuration: ${key}`);
                const acl = new Parse.ACL();
                acl.setPublicReadAccess(false);
                acl.setPublicWriteAccess(false);
                if (publicRead) {
                    acl.setPublicReadAccess(true);
                }
                else if (attendeeRead) {
                    acl.setRoleReadAccess(attendeeRole, true);
                }
                acl.setRoleReadAccess(adminRole, true);
                acl.setRoleWriteAccess(adminRole, true);

                const configurationO = new Parse.Object("ConferenceConfiguration");
                configurationO.setACL(acl);
                const configuration = await configurationO.save({
                    key: key,
                    value: value,
                    conference: conference
                }, {
                    useMasterKey: true
                });

                configurationMap.set(key, configuration);

                message(`Created configuration: ${key}`);
                return configuration;
            }

            // Set Sign-up enabled
            await setConfiguration("SignUpEnabled", params.conference.signUpEnabled.toString(), undefined, true);

            // Set moderation custom notice
            await setConfiguration("MODERATION_CUSTOM_NOTICE",
                params.conference.moderationCustomNotice
                    ? params.conference.moderationCustomNotice
                    : "<null>", true, false);

            // Create the flairs
            async function createFlair(label, color, tooltip, priortiy) {
                message(`Creating flair: ${label}`);
                const acl = new Parse.ACL();
                acl.setPublicReadAccess(false);
                acl.setPublicWriteAccess(false);
                acl.setRoleReadAccess(attendeeRole, true);
                acl.setRoleReadAccess(adminRole, true);
                acl.setRoleWriteAccess(adminRole, true);

                const flairO = new Parse.Object("Flair");
                flairO.setACL(acl);
                const flair = await flairO.save({
                    label: label,
                    color: color,
                    tooltip: tooltip,
                    priority: priortiy,
                    conference: conference
                }, {
                    useMasterKey: true
                });

                flairMap.set(label, flair);

                message(`Created flair: ${label}`);
                return flair;
            }
            message(`Creating flairs...`);
            for (let flair of defaultFlairs) {
                await createFlair(flair.label, flair.color, flair.tooltip, flair.priority);
            }
            message(`Created flairs.`);

            // Create logged in text
            message("Creating logged in text...");
            {
                const loggedInACL = new Parse.ACL();
                loggedInACL.setPublicReadAccess(false);
                loggedInACL.setPublicWriteAccess(false);
                loggedInACL.setRoleReadAccess(attendeeRole, true);
                loggedInACL.setRoleReadAccess(adminRole, true);
                loggedInACL.setRoleWriteAccess(adminRole, true);
                const loggedInTextO = new Parse.Object("PrivilegedConferenceDetails");
                loggedInTextO.setACL(loggedInACL);
                loggedInText = await loggedInTextO.save({
                    conference: conference,
                    key: "LOGGED_IN_TEXT",
                    value: params.conference.loggedInText
                }, {
                    useMasterKey: true
                });
            }
            message("Created logged in text.");

            // Create logged in text
            message("Creating sidebar colour...");
            {
                const newACL = new Parse.ACL();
                newACL.setPublicReadAccess(false);
                newACL.setPublicWriteAccess(false);
                newACL.setRoleReadAccess(attendeeRole, true);
                newACL.setRoleReadAccess(adminRole, true);
                newACL.setRoleWriteAccess(adminRole, true);
                let newDetails = new Parse.Object("PrivilegedConferenceDetails");
                newDetails.setACL(newACL);
                newDetails = await newDetails.save({
                    conference: conference,
                    key: "SIDEBAR_COLOUR",
                    value: params.conference.sidebar && params.conference.sidebar.colour ? params.conference.sidebar.colour : "#761313"
                }, { useMasterKey: true });
            }
            message("Created sidebar colour.");

            // Check for existing admin user
            message("Checking for existing admin user...");
            adminUser = await
                new Parse.Query("_User")
                    .equalTo("username", params.admin.username)
                    .first({ useMasterKey: true });
            if (adminUser) {
                message("Existing admin user found.");
            }
            else {
                // Create admin user
                message("Creating admin user...");
                {
                    const adminUserACL = new Parse.ACL();
                    adminUserACL.setPublicReadAccess(false);
                    adminUserACL.setPublicWriteAccess(false);
                    const adminUserO = new Parse.User();
                    adminUserO.setACL(adminUserACL);
                    adminUserO.setPassword(params.admin.password);
                    adminUser = await adminUserO.save({
                        emailVerified: true,
                        passwordSet: true,
                        username: params.admin.username,
                        email: params.admin.email.toLowerCase()
                    }, {
                        useMasterKey: true
                    });
                    adminUserACL.setReadAccess(adminUser, true);
                    adminUserACL.setWriteAccess(adminUser, true);
                    await adminUser.save(null, { useMasterKey: true });
                }
                message("Created admin user.");
            }

            message("Adding admin user to admin role...");
            const adminRoleUsersRel = adminRole.relation("users");
            adminRoleUsersRel.add(adminUser);
            await adminRole.save(null, { useMasterKey: true });
            message("Added admin user to admin role.");

            // Create admin user profile
            message("Creating admin user profile...");
            {
                let newWatchedItems = new Parse.Object("WatchedItems", {
                    conference
                });
                let newWatchedItemsACL = new Parse.ACL();
                newWatchedItemsACL.setPublicReadAccess(false);
                newWatchedItemsACL.setPublicWriteAccess(false);
                newWatchedItemsACL.setReadAccess(adminUser, true);
                newWatchedItemsACL.setWriteAccess(adminUser, true);
                newWatchedItems.setACL(newWatchedItemsACL);
                newWatchedItems = await newWatchedItems.save(null, { useMasterKey: true });

                const adminUserProfileACL = new Parse.ACL();
                adminUserProfileACL.setPublicReadAccess(false);
                adminUserProfileACL.setPublicWriteAccess(false);
                adminUserProfileACL.setRoleReadAccess(attendeeRole, true);
                adminUserProfileACL.setRoleReadAccess(adminRole, true);
                adminUserProfileACL.setRoleWriteAccess(adminRole, true);
                adminUserProfileACL.setReadAccess(adminUser, true);
                adminUserProfileACL.setWriteAccess(adminUser, true);
                const adminUserProfileO = new Parse.Object("UserProfile");
                adminUserProfileO.setACL(adminUserProfileACL);
                adminUserProfile = await adminUserProfileO.save({
                    conference: conference,
                    primaryFlair: flairMap.get("Admin"),
                    welcomeModalShown: false,
                    realName: params.admin.realName,
                    user: adminUser,
                    displayName: params.admin.displayName,
                    dataConsentGiven: true,
                    affiliation: params.admin.affiliation,
                    bio: params.admin.bio,
                    country: params.admin.country,
                    position: params.admin.position,
                    pronouns: params.admin.pronouns,
                    tags: params.admin.tags,
                    webpage: params.admin.webpage,
                    flairs: [flairMap.get("Admin").id],
                    watched: newWatchedItems
                }, {
                    useMasterKey: true
                });
            }
            message("Created admin user profile.");

            // Get existing or create new Twilio subaccount
            message("Getting or creating Twilio subaccount...");
            function generateTwilioSubaccountFriendlyName() {
                if (params.twilio.subaccountName) {
                    return params.twilio.subaccountName;
                }
                else {
                    return conference.id + ": " + conference.get("shortName");
                }
            }
            async function clearOutDeadSubaccounts() {
                let accounts = await twilioMasterClient.api.accounts.list({ status: 'active' });
                for (let account of accounts) {
                    if (account.friendlyName.includes("<<$$##DEAD>>")) {
                        await account.update({ status: "closed" });
                    }
                }

                accounts = await twilioMasterClient.api.accounts.list({ status: 'suspended' });
                for (let account of accounts) {
                    if (account.friendlyName.includes("<<$$##DEAD>>")) {
                        await account.update({ status: "closed" });
                    }
                }
            }
            async function getTwilioSubaccount() {
                let accounts = await twilioMasterClient.api.accounts.list({ friendlyName: generateTwilioSubaccountFriendlyName(), status: "suspended" });
                accounts = accounts.concat(await twilioMasterClient.api.accounts.list({ friendlyName: generateTwilioSubaccountFriendlyName(), status: "active" }));
                if (accounts.length === 1) {
                    if (params.twilio.removeExisting) {
                        await twilioMasterClient.api.accounts(accounts[0].sid).update({ status: "closed" });
                        return null;
                    }
                    else {
                        return accounts[0];
                    }
                }
                else if (accounts.length > 0) {
                    if (params.twilio.removeExisting) {
                        for (let account of accounts) {
                            await twilioMasterClient.api.accounts(account.sid).update({ status: "closed" });
                        }
                        return null;
                    }
                    else {
                        console.warn(`Multiple matching Twilio subaccounts!`);
                        return accounts[0];
                    }
                }
                else {
                    return null;
                }
            }
            async function reactivateTwilioSubaccount() {
                await twilioMasterClient.api.accounts(twilioSubaccount.sid).update({ status: 'active' });
            }
            async function createTwilioSubaccount() {
                twilioSubaccount = await twilioMasterClient.api.accounts.create({ friendlyName: generateTwilioSubaccountFriendlyName() });
            }
            await clearOutDeadSubaccounts();
            twilioSubaccount = await getTwilioSubaccount();
            if (!twilioSubaccount) {
                await createTwilioSubaccount();
                message(`Created subaccount: ${twilioSubaccount.sid}`);
            }
            else {
                await reactivateTwilioSubaccount();
                message(`Got and reactivated existing subaccount: ${twilioSubaccount.sid}`);
            }

            // Configure Twilio subaccount
            message(`Configuring Twilio subaccount (${twilioSubaccount.sid})...`);
            async function configureTwilioSubaccount() {
                let subaccountSID = twilioSubaccount.sid;
                let subaccountAuthToken = twilioSubaccount.authToken;

                twilioSubaccountClient = Twilio(subaccountSID, subaccountAuthToken);
                let existingKeys = await twilioSubaccountClient.api.keys.list();
                for (let existingKey of existingKeys) {
                    await existingKey.remove();
                }

                let newKey = await twilioSubaccountClient.newKeys.create();
                await setConfiguration("TWILIO_API_KEY", newKey.sid, false);
                await setConfiguration("TWILIO_API_SECRET", newKey.secret, false);
                await setConfiguration("TWILIO_ACCOUNT_SID", subaccountSID, false);
                await setConfiguration("TWILIO_AUTH_TOKEN", subaccountAuthToken, false);
            }
            await configureTwilioSubaccount();
            message(`Configured Twilio subaccount (${twilioSubaccount.sid}).`);

            message(`Setting TWILIO_CALLBACK_URL ${params.react.TWILIO_CALLBACK_URL}`);
            await setConfiguration("REACT_APP_TWILIO_CALLBACK_URL", params.react.TWILIO_CALLBACK_URL, true);

            message(`Setting REACT_APP_FRONTEND_URL ${params.react.FRONTEND_URL}`);
            await setConfiguration("REACT_APP_FRONTEND_URL", params.react.FRONTEND_URL, false);

            // Initialise Twilio Programmable Chat Service
            message(`Configuring Twilio chat service...`);
            async function getTwilioChatService() {
                let services = await twilioSubaccountClient.chat.services.list();
                for (let service of services) {
                    if (service.friendlyName === "main") {
                        twilioChatService = service;
                    }
                }
            }
            async function createTwilioChatService() {
                twilioChatService = await twilioSubaccountClient.chat.services.create({ friendlyName: 'main' });
            }
            async function configureTwilioChatService() {
                await setConfiguration("TWILIO_CHAT_SERVICE_SID", twilioChatService.sid, false);

                const service = await twilioChatService.update({
                    reachabilityEnabled: TWILIO_REACHABILITY_ENABLED,
                    readStatusEnabled: TWILIO_READ_STATUS_ENABLED,
                    webhookMethod: TWILIO_WEBHOOK_METHOD,
                    webhookFilters: TWILIO_WEBHOOK_EVENTS,
                    preWebhookUrl: params.twilio.CHAT_PRE_WEBHOOK_URL !== "<unknown>" ? params.twilio.CHAT_PRE_WEBHOOK_URL : "",
                    postWebhookUrl: params.twilio.CHAT_POST_WEBHOOK_URL !== "<unknown>" ? params.twilio.CHAT_POST_WEBHOOK_URL : "",
                    limits: {
                        channelMembers: TWILIO_MEMBERS_PER_CHANNEL_LIMIT,
                        userChannels: TWILIO_CHANNELS_PER_USER_LIMIT
                    },
                    preWebhookRetryCount: TWILIO_CHAT_PRE_WEBHOOK_RETRY_COUNT,
                    postWebhookRetryCount: TWILIO_CHAT_POST_WEBHOOK_RETRY_COUNT
                });
                console.log(`Updated Twilio Chat Service: ${service.friendlyName}`);
            }
            await getTwilioChatService();
            if (!twilioChatService) {
                await createTwilioChatService();
            }
            else {
                // Clear out existing: channels, users and roles
                await Promise.all((await twilioChatService.channels().list()).map(x => x.remove()));
                await Promise.all((await twilioChatService.users().list()).map(x => x.remove()));
                await Promise.all((await twilioChatService.roles().list()).map(async x => {
                    // Don't bother deleting roles we are about to recreate
                    // BUT ALSO: We can't (& shouldn't according to Twilio's docs)
                    // delete the service's default roles
                    if (!defaultTwilioChatRoles.map(y => y.name).includes(x.friendlyName)) {
                        await x.remove();
                    }
                }));
            }
            await configureTwilioChatService();

            // Existing roles to adapt (as per docs recommendation): Friendly Name: channel user
            // Existing roles to adapt (as per docs recommendation): Friendly Name: service admin
            // Existing roles to adapt (as per docs recommendation): Friendly Name: service user
            // Existing roles to adapt (as per docs recommendation): Friendly Name: channel admin
            // Roles we need: Service admin, service user, channel admin, channel user, announcements channel admin, announcements channel user
            const twilioChatRoles = new Map();
            async function getChatRoles() {
                message(`Getting chat roles`);
                const roles = await twilioChatService.roles().list();
                message(`Got chat roles, processing them...`);
                for (let role of roles) {
                    twilioChatRoles.set(role.friendlyName, role);
                }
                message(`Obtained and processed chat roles`);
            }
            function addPermissionsToDescriptor(obj, permissions) {
                obj.permission = permissions;
            }
            async function createChatRole(friendlyName, type, permissions) {
                message(`Creating chat role ${friendlyName}`);
                let roleDescriptor = {
                    friendlyName: friendlyName,
                    type: type
                };
                addPermissionsToDescriptor(roleDescriptor, permissions);
                let role = await twilioChatService.roles().create(roleDescriptor);
                twilioChatRoles.set(friendlyName, role);
                message(`Created chat role ${friendlyName}`);
            }
            async function configureChatRole(friendlyName, permissions) {
                message(`Configuring chat role ${friendlyName}`);
                let obj = {};
                addPermissionsToDescriptor(obj, permissions);
                await twilioChatRoles.get(friendlyName).update(obj);
                message(`Configured chat role ${friendlyName}`);
            }
            await getChatRoles();
            for (let role of defaultTwilioChatRoles) {
                if (!twilioChatRoles.get(role.name)) {
                    await createChatRole(role.name, role.type, role.permissions);
                }
                else {
                    await configureChatRole(role.name, role.permissions);
                }
            }
            message(`Configured Twilio chat service.`);

            // Create the announcements channel
            ({ announcementsChat, moderationHubChat } = await configureGlobalChats(message, twilioChatService, setConfiguration, adminUserProfile, twilioChatRoles, conference, managerRole, adminRole, attendeeRole));

            // Configure SendGrid
            message(`Configuring SendGrid...`);
            await setConfiguration("SENDGRID_API_KEY", params.sendgrid.API_KEY);
            await setConfiguration("SENDGRID_SENDER", params.sendgrid.SENDER);
            message(`Configured SendGrid.`);

            // Configure Zoom
            message(`Configuring Zoom...`);
            await setConfiguration("ZOOM_API_KEY", params.zoom.API_KEY);
            await setConfiguration("ZOOM_API_SECRET", params.zoom.API_SECRET);
            message(`Configured Zoom.`)

            message(conference.id);
        }
        else {
            console.error("ERROR: " + requestValidation.error);
            message(requestValidation.error);
            throw new Error(requestValidation.error);
        }
    }
    catch (e) {
        await cleanupOnFailure();

        console.error("ERROR: " + e.stack, e);
        message(e);
        throw e;
    }
});

Parse.Cloud.define("conference-setSidebarBgColour", async (req) => {
    const { params, user } = req;

    const requestValidation = validateRequest({
        colour: "string",
        conference: "string"
    }, params);
    if (requestValidation.ok) {
        const confId = params.conference;
        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin"]);
        if (authorized) {
            const conf = new Parse.Object("Conference", { id: confId });

            const existingDetails = await getConferenceDetails(conf, "SIDEBAR_COLOUR");
            if (existingDetails) {
                await existingDetails.save({
                    value: params.colour
                }, { useMasterKey: true });
                return existingDetails.id;
            }
            else {
                const attendeeRole = await getRoleByName(confId, "attendee");
                const adminRole = await getRoleByName(confId, "admin");
                const newACL = new Parse.ACL();
                newACL.setPublicReadAccess(false);
                newACL.setPublicWriteAccess(false);
                newACL.setRoleReadAccess(attendeeRole, true);
                newACL.setRoleReadAccess(adminRole, true);
                newACL.setRoleWriteAccess(adminRole, true);
                let newDetails = new Parse.Object("PrivilegedConferenceDetails");
                newDetails.setACL(newACL);
                newDetails = await newDetails.save({
                    conference: conf,
                    key: "SIDEBAR_COLOUR",
                    value: params.colour
                }, { useMasterKey: true });
                return newDetails.id;
            }
        }
    }

    return false;
});

Parse.Cloud.define("conference-setLoggedInText", async (req) => {
    const { params, user } = req;

    const requestValidation = validateRequest({
        text: "string",
        conference: "string"
    }, params);
    if (requestValidation.ok) {
        const confId = params.conference;
        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin"]);
        if (authorized) {
            const conf = new Parse.Object("Conference", { id: confId });

            const existingDetails = await getConferenceDetails(conf, "LOGGED_IN_TEXT");
            if (existingDetails) {
                await existingDetails.save({
                    value: params.text
                }, { useMasterKey: true });
                return existingDetails.id;
            }
            else {
                const attendeeRole = await getRoleByName(confId, "attendee");
                const adminRole = await getRoleByName(confId, "admin");
                const newACL = new Parse.ACL();
                newACL.setPublicReadAccess(false);
                newACL.setPublicWriteAccess(false);
                newACL.setRoleReadAccess(attendeeRole, true);
                newACL.setRoleReadAccess(adminRole, true);
                newACL.setRoleWriteAccess(adminRole, true);
                let newDetails = new Parse.Object("PrivilegedConferenceDetails");
                newDetails.setACL(newACL);
                newDetails = await newDetails.save({
                    conference: conf,
                    key: "LOGGED_IN_TEXT",
                    value: params.text
                }, { useMasterKey: true });
                return newDetails.id;
            }
        }
    }

    return false;
});

async function configureGlobalChats(message, twilioChatService, setConfiguration, adminUserProfile, twilioChatRoles, conference, managerRole, adminRole, attendeeRole) {
    message(`Configuring announcements channel...`);
    let twilioAnnouncementsChannel = null;
    async function getAnnouncementsChannel() {
        let channels = await twilioChatService.channels().list();
        for (let channel of channels) {
            if (channel.friendlyName === TWILIO_ANNOUNCEMENTS_CHANNEL_NAME) {
                twilioAnnouncementsChannel = channel;
            }
        }
    }
    async function createAnnouncementsChannel() {
        twilioAnnouncementsChannel = await twilioChatService.channels().create({
            friendlyName: TWILIO_ANNOUNCEMENTS_CHANNEL_NAME,
            uniqueName: TWILIO_ANNOUNCEMENTS_CHANNEL_NAME,
            attributes: {},
            type: "public"
        });
    }
    await getAnnouncementsChannel();
    if (!twilioAnnouncementsChannel) {
        await createAnnouncementsChannel();
    }
    setConfiguration("TWILIO_ANNOUNCEMENTS_CHANNEL_SID", twilioAnnouncementsChannel.sid, true);
    message(`Configured announcements channel.`);

    message(`Adding admin user to announcements channel...`);
    try {
        await twilioChatService.users().create({
            identity: adminUserProfile.id,
            friendlyName: "original-admin",
            roleSid: twilioChatRoles.get("service admin").sid
        });
    }
    catch (e) {
        if (!e.toString().toLowerCase().includes("user already exists")) {
            throw e;
        }
    }
    await twilioAnnouncementsChannel.members().create({
        identity: adminUserProfile.id,
        roleSid: twilioChatRoles.get("announcements admin").sid
    });
    message(`Added admin user to announcements channel.`);

    message(`Creating announcements text chat in Parse...`);
    let announcementsChat;
    {
        const textChat = new Parse.Object("TextChat");
        textChat.set("autoWatch", true);
        textChat.set("twilioID", twilioAnnouncementsChannel.sid);
        textChat.set("conference", conference);
        textChat.set("mirrored", false);
        textChat.set("isDM", false);
        textChat.set("creator", adminUserProfile);
        textChat.set("name", twilioAnnouncementsChannel.friendlyName);

        const acl = new Parse.ACL();
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        acl.setRoleReadAccess(managerRole, true);
        acl.setRoleWriteAccess(managerRole, true);
        acl.setRoleReadAccess(adminRole, true);
        acl.setRoleWriteAccess(adminRole, true);
        acl.setRoleReadAccess(attendeeRole, true);
        textChat.setACL(acl);

        announcementsChat = await textChat.save(null, { useMasterKey: true });
    }
    message(`Created announcements text chat in Parse.`);

    // TODO: How do we trigger the Twilio backend to refresh its cache?

    message(`Configuring moderation hub channel...`);
    let twilioModerationHubChannel = null;
    async function getModerationHubChannel() {
        let channels = await twilioChatService.channels().list();
        for (let channel of channels) {
            if (channel.friendlyName === TWILIO_MODERATIONHUB_CHANNEL_NAME) {
                twilioModerationHubChannel = channel;
            }
        }
    }
    async function createModerationHubChannel() {
        twilioModerationHubChannel = await twilioChatService.channels().create({
            friendlyName: TWILIO_MODERATIONHUB_CHANNEL_NAME,
            uniqueName: TWILIO_MODERATIONHUB_CHANNEL_NAME,
            attributes: {},
            type: "private"
        });
    }
    await getModerationHubChannel();
    if (!twilioModerationHubChannel) {
        await createModerationHubChannel();
    }
    try {
        await twilioModerationHubChannel.members().create({
            identity: adminUserProfile.id,
            roleSid: twilioChatRoles.get("channel user").sid
        });
    }
    catch (e) {
        await twilioModerationHubChannel.members().update({
            identity: adminUserProfile.id,
            roleSid: twilioChatRoles.get("channel user").sid
        });
    }
    message(`Configured moderation hub channel.`);

    let moderationHubChat;
    message(`Creating moderation hub text chat in Parse.`);
    {
        const textChat = new Parse.Object("TextChat");
        textChat.set("autoWatch", true);
        textChat.set("twilioID", twilioModerationHubChannel.sid);
        textChat.set("conference", conference);
        textChat.set("mirrored", false);
        textChat.set("isDM", false);
        textChat.set("mode", "moderation_hub");
        textChat.set("creator", adminUserProfile);
        textChat.set("name", twilioModerationHubChannel.friendlyName);

        const acl = new Parse.ACL();
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        acl.setRoleReadAccess(managerRole, true);
        acl.setRoleReadAccess(adminRole, true);
        acl.setRoleWriteAccess(adminRole, true);
        textChat.setACL(acl);

        moderationHubChat = await textChat.save(null, { useMasterKey: true });
    }
    message(`Created moderation hub text chat in Parse.`);
    return { announcementsChat, moderationHubChat };
}

Parse.Cloud.job("regenerate-global-chats", async (request) => {
    const { params, message: _message } = request;
    const message = (msg) => {
        console.log(msg);
        _message(msg);
    };

    // Stuff we re-use but doesn't directly need cleaning up
    let twilioSubaccountClient = null;
    let twilioChatService = null;

    // Stuff to be cleaned up if creation fails
    let conference = null;
    const roleMap = new Map();
    let adminUser = null;
    let adminUserProfile = null;
    const configurationMap = new Map();

    try {
        message("Starting...");

        message("Validating parameters");

        let requestValidation = validateRequest({
            conference: "string",
            adminUserId: "string"
        }, params);
        if (requestValidation.ok) {
            conference = await new Parse.Object("Conference", { id: params.conference }).fetch({ useMasterKey: true });
            assert(conference);

            await new Parse.Query("_Role")
                .equalTo("conference", conference)
                .each(role => {
                    roleMap.set(role.get("name").split("-")[1], role);
                }, { useMasterKey: true });

            const adminRole = roleMap.get("admin");
            const managerRole = roleMap.get("manager");
            const attendeeRole = roleMap.get("attendee");
            assert(adminRole);
            assert(managerRole);
            assert(attendeeRole);

            // Helper function re-used throughout
            async function setConfiguration(key, value, attendeeRead, publicRead) {
                try {
                    const existing =
                        await new Parse.Query("ConferenceConfiguration")
                            .equalTo("conference", conference)
                            .equalTo("key", "TWILIO_ANNOUNCEMENTS_CHANNEL_SID")
                            .first({ useMasterKey: true });
                    if (existing) {
                        message(`Got existing configuration: ${key}`);
                        const acl = new Parse.ACL();
                        acl.setPublicReadAccess(false);
                        acl.setPublicWriteAccess(false);
                        if (publicRead) {
                            acl.setPublicReadAccess(true);
                        }
                        else if (attendeeRead) {
                            acl.setRoleReadAccess(attendeeRole, true);
                        }
                        acl.setRoleReadAccess(adminRole, true);
                        acl.setRoleWriteAccess(adminRole, true);
                        existing.setACL(acl);
                        existing.save({ value }, { useMasterKey: true });
                        message(`Updated configuration: ${key}`);
                        configurationMap.set(key, existing);
                        return existing;
                    }
                }
                // tslint:disable-next-line:no-empty
                catch (e) {
                }

                {
                    message(`Creating configuration: ${key}`);
                    const acl = new Parse.ACL();
                    acl.setPublicReadAccess(false);
                    acl.setPublicWriteAccess(false);
                    if (publicRead) {
                        acl.setPublicReadAccess(true);
                    }
                    else if (attendeeRead) {
                        acl.setRoleReadAccess(attendeeRole, true);
                    }
                    acl.setRoleReadAccess(adminRole, true);
                    acl.setRoleWriteAccess(adminRole, true);

                    const configurationO = new Parse.Object("ConferenceConfiguration");
                    configurationO.setACL(acl);
                    const configuration = await configurationO.save({
                        key: key,
                        value: value,
                        conference: conference
                    }, {
                        useMasterKey: true
                    });

                    configurationMap.set(key, configuration);

                    message(`Created configuration: ${key}`);
                    return configuration;
                }
            }

            adminUser = await new Parse.Object("_User", { id: params.adminUserId }).fetch({ useMasterKey: true });
            assert(adminUser);

            adminUserProfile = await
                new Parse.Query("UserProfile")
                    .equalTo("conference", conference)
                    .equalTo("user", adminUser)
                    .first({ useMasterKey: true });
            assert(adminUserProfile);

            async function getTwilioSubaccountClient() {
                const TWILIO_ACCOUNT_SID
                    = (await new Parse.Query("ConferenceConfiguration")
                        .equalTo("conference", conference)
                        .equalTo("key", "TWILIO_ACCOUNT_SID")
                        .first({ useMasterKey: true })).get("value");
                const TWILIO_AUTH_TOKEN
                    = (await new Parse.Query("ConferenceConfiguration")
                        .equalTo("conference", conference)
                        .equalTo("key", "TWILIO_AUTH_TOKEN")
                        .first({ useMasterKey: true })).get("value");

                twilioSubaccountClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
            }
            await getTwilioSubaccountClient();

            async function getTwilioChatService() {
                let services = await twilioSubaccountClient.chat.services.list();
                for (let service of services) {
                    if (service.friendlyName === "main") {
                        twilioChatService = service;
                    }
                }
            }
            await getTwilioChatService();
            assert(twilioChatService);

            const twilioChatRoles = new Map();
            async function getChatRoles() {
                message(`Getting chat roles`);
                const roles = await twilioChatService.roles().list();
                message(`Got chat roles, processing them...`);
                for (let role of roles) {
                    twilioChatRoles.set(role.friendlyName, role);
                }
                message(`Obtained and processed chat roles`);
            }
            await getChatRoles();

            await Promise.all((await twilioChatService.users().list()).map(x => x.remove()));

            // Create the announcements channel
            await configureGlobalChats(message, twilioChatService, setConfiguration, adminUserProfile, twilioChatRoles, conference, managerRole, adminRole, attendeeRole);

            message(conference.id);
        }
        else {
            console.error("ERROR: " + requestValidation.error);
            message(requestValidation.error);
            throw new Error(requestValidation.error);
        }
    }
    catch (e) {
        console.error("ERROR: " + e.stack, e);
        message(e);
        throw e;
    }
});

module.exports = {
    getConferenceById: getConferenceById,
    getConferenceConfigurationByKey: getConferenceConfigurationByKey
};
