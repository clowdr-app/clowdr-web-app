/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");

/**
 * All the information needed to initialise a fresh conference.
 */
const createConferenceRequestSchema = {
    conference: {
        // Conference
        name: "string",
        shortName: "string",
        welcomeText: "string",

        // Privileged Conference Details
        loggedInText: "string",
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
    }
};

// Order matters - sort on inheritedBy, circular relationships not allowed.
const defaultRoles = [
    { name: "admin", inheritedBy: [] },
    { name: "manager", inheritedBy: ["admin"] },
    { name: "attendee", inheritedBy: ["manager"] },
];

const defaultFlairs = [
    { label: "<empty>", color: "rgba(0, 0, 0, 0)", tooltip: "<empty>", priority: 0 },
    { label: "Admin", color: "rgba(200, 32, 0, 1)", tooltip: "Conference administrator", priority: 100 },
    { label: "Moderator", color: "rgba(32, 200, 0, 1)", tooltip: "Conference moderator", priority: 90 }
];

Parse.Cloud.job("conference-create", async (request) => {
    const { params, headers, log, message } = request;

    let conference = null;
    const roleMap = new Map();
    const flairMap = new Map();
    let loggedInText = null;
    let adminUser = null;
    let adminUserPresence = null;
    let adminUserProfile = null;

    async function cleanupOnFailure() {
        message("Cleaning up...");
        let cleanupSuccess = true;

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
            if (adminUserPresence) {
                console.log(`Destroying admin user presence: '${adminUserPresence.id}'`);
                await adminUserPresence.destroy({ useMasterKey: true });
                console.log(`Destroyed admin user presence: '${adminUserPresence.id}'`);
            }
        }
        catch (e2) {
            console.error(`Failed to clean up admin user presence. ${e2}`);
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

                const roleO = new Parse.Role(`${conference.id}-${name}`, acl);
                roleO.set("conference", conference);

                if (name === "admin") {
                    acl.setRoleReadAccess(roleO, true);
                    acl.setRoleWriteAccess(roleO, true);
                }
                else {
                    const adminRole = roleMap.get("admin");
                    acl.setRoleReadAccess(adminRole, true);
                    acl.setRoleWriteAccess(adminRole, true);
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

            // Create the flairs
            async function createFlair(label, color, tooltip, priortiy) {
                message(`Creating flair: ${label}`);
                const acl = new Parse.ACL();
                acl.setPublicReadAccess(false);
                acl.setPublicWriteAccess(false);
                acl.setRoleReadAccess(attendeeRole, true);
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
                loggedInACL.setRoleWriteAccess(managerRole, true);
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

            // Create admin user
            message("Creating admin user...");
            {
                const adminUserACL = new Parse.ACL();
                adminUserACL.setPublicReadAccess(false);
                adminUserACL.setPublicWriteAccess(false);
                adminUserACL.setRoleReadAccess(adminRole, true);
                const adminUserO = new Parse.User();
                adminUserO.setACL(adminUserACL);
                adminUserO.setPassword(params.admin.password);
                adminUser = await adminUserO.save({
                    emailVerified: true,
                    passwordSet: false,
                    username: params.admin.username,
                    email: params.admin.email
                }, {
                    useMasterKey: true
                });
                adminUserACL.setReadAccess(adminUser, true);
                adminUserACL.setWriteAccess(adminUser, true);
                await adminUser.save(null, { useMasterKey: true });

                const adminRoleUsersRel = adminRole.relation("users");
                adminRoleUsersRel.add(adminUser);
                await adminRole.save(null, { useMasterKey: true });
            }
            message("Created admin user.");

            // Create admin user presence
            message("Creating admin user presence...");
            {
                const adminUserPresenceACL = new Parse.ACL();
                adminUserPresenceACL.setPublicReadAccess(false);
                adminUserPresenceACL.setPublicWriteAccess(false);
                adminUserPresenceACL.setRoleReadAccess(attendeeRole, true);
                adminUserPresenceACL.setReadAccess(adminUser, true);
                adminUserPresenceACL.setWriteAccess(adminUser, true);
                const adminUserPresenceO = new Parse.Object("UserPresence");
                adminUserPresenceO.setACL(adminUserPresenceACL);
                adminUserPresence = await adminUserPresenceO.save({
                    isDNT: false,
                    lastSeen: new Date()
                }, {
                    useMasterKey: true
                });
            }
            message("Created admin user presence.");

            // Create admin user profile
            message("Creating admin user profile...");
            {
                const adminUserProfileACL = new Parse.ACL();
                adminUserProfileACL.setPublicReadAccess(false);
                adminUserProfileACL.setPublicWriteAccess(false);
                adminUserProfileACL.setRoleReadAccess(attendeeRole, true);
                adminUserProfileACL.setReadAccess(adminUser, true);
                adminUserProfileACL.setWriteAccess(adminUser, true);
                const adminUserProfileO = new Parse.Object("UserProfile");
                adminUserProfileO.setACL(adminUserProfileACL);
                const flairsRel = adminUserProfileO.relation("flairs");
                flairsRel.add(flairMap.get("<empty>"));
                flairsRel.add(flairMap.get("Admin"));
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
                    presence: adminUserPresence,
                }, {
                    useMasterKey: true
                });
            }
            message("Created admin user profile.");

            // TODO: Initialise Twilio sub account
            // TODO: Initialise Twilio Programmable Chat Service
            // TODO: Initialise Twilio Programmable Video Service
            // TODO: Initialise Twilio Chat roles
            // TODO: Initialise Twilio Video roles

            // TODO: Initialise announcements channel
            // TODO: Initialise auto-subscribe to text chats

            // TODO Later: Can we initialise SendGrid?

            message(`Conference created: '${conference.id}'.`);

            // TODO: Delete this line
            await cleanupOnFailure();
        }
        else {
            console.error("ERROR: " + requestValidation.error);
            message(requestValidation.error);
            throw new Error(requestValidation.error);
        }
    }
    catch (e) {
        await cleanupOnFailure();

        console.error("ERROR: " + e);
        message(e);
        throw e;
    }
});
