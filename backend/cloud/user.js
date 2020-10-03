/* global Parse */
// ^ for eslint

// TODO: Before delete: Remove user ACLs for every record related to the conference
// TODO: Before save: If banning a user, remove their ACLs for every record related to the conference

const Twilio = require("twilio");
const {
    getConferenceById,
    getConferenceConfigurationByKey,
    generateRoleDBName
} = require("./conference");
const {
    getRegistrationById
} = require("./registration");
const { getFlairByLabel } = require("./flair");

async function getUserByEmail(email) {
    let query = new Parse.Query(Parse.User);
    query.equalTo("email", email);
    try {
        return await query.first({ useMasterKey: true });
    }
    catch {
        return null;
    }
}

async function getUserProfile(user, conference) {
    let query = new Parse.Query("UserProfile");
    query.equalTo("conference", conference);
    query.equalTo("user", user);
    try {
        return await query.first({ useMasterKey: true });
    }
    catch {
        return null;
    }
}

/**
 * @param {string} userId
 */
async function getUserById(userId) {
    let query = new Parse.Query(Parse.User);
    try {
        return await query.get(userId, { useMasterKey: true });
    }
    catch {
        return null;
    }
}

async function getRoleByName(roleName, conference) {
    let query = new Parse.Query("_Role");
    query.equalTo("name", generateRoleDBName(conference, roleName));
    query.equalTo("conference", conference);
    try {
        return await query.first({ useMasterKey: true });
    }
    catch {
        return null;
    }
}

async function createUser(email, password) {
    // TODO: Recover gracefully from failure
    // TODO: Verification email

    let newUser = new Parse.User({
        email: email,
        username: email,
    });
    let newUserACL = new Parse.ACL();
    newUserACL.setPublicReadAccess(false);
    newUserACL.setPublicWriteAccess(false);
    newUser.setACL(newUserACL);
    newUser.setPassword(password);
    newUser.set("passwordSet", true);
    newUser.set("emailVerified", true); // TODO: Set to false when using email verification
    newUser = await newUser.save(null, { useMasterKey: true });
    newUserACL.setReadAccess(newUser, true);
    newUserACL.setWriteAccess(newUser, true);
    let user = await newUser.save(null, { useMasterKey: true });
    return user;
}

async function createUserProfile(user, fullName, conference) {
    let adminRole = await getRoleByName("admin", conference);
    let attendeeRole = await getRoleByName("attendee", conference);

    let emptyFlair = await getFlairByLabel("<empty>", conference);
    let newProfile = new Parse.Object("UserProfile", {
        user: user,
        conference: conference,
        primaryFlair: emptyFlair,
        welcomeModalShown: false,
        realName: fullName,
        displayName: fullName,
        dataConsentGiven: false, // TODO: Require from sign up form
        pronouns: ["they", "them"],
        tags: []
    });
    let flairsRel = newProfile.relation("flairs");
    flairsRel.add(emptyFlair);
    let newProfileACl = new Parse.ACL();
    newProfileACl.setPublicReadAccess(false);
    newProfileACl.setPublicWriteAccess(false);
    newProfileACl.setRoleReadAccess(attendeeRole, true);
    newProfileACl.setRoleReadAccess(adminRole, true);
    newProfileACl.setRoleWriteAccess(adminRole, true);
    newProfileACl.setReadAccess(user, true);
    newProfileACl.setWriteAccess(user, true);
    newProfile.setACL(newProfileACl);
    newProfile = await newProfile.save(null, { useMasterKey: true });

    let attendeeUsersRel = attendeeRole.relation("users");
    attendeeUsersRel.add(user);
    attendeeRole.save(null, { useMasterKey: true });

    const twilioAccountSID = (await getConferenceConfigurationByKey(conference, "TWILIO_ACCOUNT_SID")).get("value");
    const twilioAuthToken = (await getConferenceConfigurationByKey(conference, "TWILIO_AUTH_TOKEN")).get("value");
    const twilioChatServiceSID = (await getConferenceConfigurationByKey(conference, "TWILIO_CHAT_SERVICE_SID")).get("value");
    const twilioClient = Twilio(twilioAccountSID, twilioAuthToken);
    const twilioChatService = twilioClient.chat.services(twilioChatServiceSID);
    // Adding the user will trigger our Twilio backend to add them to the announcements channel
    await twilioChatService.users.create({
        identity: newProfile.id,
        friendlyName: newProfile.get("displayName"),
        xTwilioWebhookEnabled: true
    });

    return true;
}


/**
 * @param {Parse.User} user
 * @param {string} confId
 */
async function getProfileOfUser(user, confId) {
    const q = new Parse.Query("UserProfile");
    q.equalTo("conference", new Parse.Object("Conference", { id: confId }));
    q.equalTo("user", user);
    try {
        return await q.first({ useMasterKey: true });
    }
    catch {
        return null;
    }
}

Parse.Cloud.define("user-register", async (request) => {
    try {
        let { params } = request;

        if (!params.registrationId
            || !params.conferenceId
            || !params.fullName
            || !params.password) {
            return false;
        }

        let conference = await getConferenceById(params.conference);

        if (!conference) {
            throw new Error("Registration: conference not found.");
        }

        let registration = await getRegistrationById(params.registrationId);
        let email = registration.get("email");
        let user = await getUserByEmail(email);

        if (user) {
            let userProfile = await getUserProfile(user, conference);

            if (userProfile) {
                throw new Error("Registration: the user has already been registered for this conference.");
            } else {
                if (registration.get("invitationSentDate")) {
                    return await createUserProfile(user, params.fullName, conference);
                } else {
                    throw new Error("Registration: no registration invitation has been sent for this user.");
                }
            }
        } else {
            let user = await createUser(params.email, params.password);

            if (!user) {
                throw new Error("Signup: Failed to create user.");
            }

            return await createUserProfile(user, params.fullName, conference);
        }
    }
    catch (e) {
        console.error("Error during registration", e);
    }

    return false;
});

Parse.Cloud.define("user-create", async (request) => {
    try {
        let { params } = request;

        if (!params.conference
            || !params.email
            || !params.password
            || !params.fullName
        ) {
            return false;
        }

        let conference = await getConferenceById(params.conference);
        let signUpEnabledConfig = await getConferenceConfigurationByKey(conference, "SignUpEnabled");
        let signUpEnabled = signUpEnabledConfig.get("value") === "true";

        if (signUpEnabled) {
            // TODO: Auto-join to text chats
            // TODO: Link profile to program person (author)
            // TODO: If is an author, auto-watch them to the text chats for their papers
            // TODO: Do we want authors to be auto-watching their items & content feeds (video rooms/text chats)
            // TODO: Give authors write access to their program items/events

            let user = await getUserByEmail(params.email);
            if (user) {
                // Validate: conference
                // validate their password matches
                //       If: they don't already have a profile for this conference
                //       Then: create a new user profile for the specified conference and log them in
                //       Else: Log them in and redirect to the profile page, with a message telling them so
                // Override: Only log them in if their email is verified
                if (user.get("password") === params.password) {
                    return await createUserProfile(user, params.fullName, conference);
                } else {
                    throw new Error("Signup: Error matching user details.");
                }
            }
            else {
                let user = await createUser(params.email, params.password);

                if (!user) {
                    throw new Error("Signup: Failed to create user.");
                }

                return await createUserProfile(user, params.fullName, conference);
            }
        }
    }
    catch (e) {
        throw new Error("Error during sign up: " + JSON.stringify(e));
    }

    return false;
});

// TODO: When upgrading a user to an admin, iterate over all their twilio channels
//       and update their role SID. Also, update their service-level role SID.

module.exports = {
    getUserById: getUserById,
    getProfileOfUser: getProfileOfUser
};
