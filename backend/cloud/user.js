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
 * @returns {Promise<Parse.User<Parse.Attributes>>}
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

async function getUserProfileById(userProfileId, confId) {
    let query = new Parse.Query("UserProfile");
    query.equalTo("conference", new Parse.Object("Conference", { id: confId }));
    try {
        return await query.get(userProfileId, { useMasterKey: true });
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

async function createUserProfile(user, fullName, newRoleName, conference) {
    let adminRole = await getRoleByName("admin", conference);
    let attendeeRole = await getRoleByName("attendee", conference);
    let newRole = await getRoleByName(newRoleName, conference);

    let newProfile = new Parse.Object("UserProfile", {
        user: user,
        conference: conference,
        primaryFlair: undefined,
        welcomeModalShown: false,
        realName: fullName,
        displayName: fullName,
        dataConsentGiven: false, // TODO: Require from sign up form
        pronouns: ["they", "them"],
        tags: [],
        flairs: []
    });
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

    let newRoleUsersRel = newRole.relation("users");
    newRoleUsersRel.add(user);
    newRole.save(null, { useMasterKey: true });

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
}

/**
 * @param {string} registrationId
 */
async function deleteRegistration(registrationId) {
    const q = new Parse.Query("Registration");

    try {
        let registration = await q.get(registrationId, { useMasterKey: true });
        registration.destroy({ useMasterKey: true });
    } catch (e) {
        throw new Error("Could not find registration to be deleted.");
    }
}


/**
 * @param {Parse.User} user
 * @param {string} confId
 * @returns {Promise<Parse.Object | null>}
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

/**
 * @typedef {Object} RegisterUserParams
 * @property {string | undefined} registrationId
 * @property {string | undefined} conferenceId
 * @property {string | undefined} fullName
 * @property {string | undefined} password
 */

/**
 * @param {Parse.Cloud.FunctionRequest<RegisterUserParams>} request
 */
async function handleRegisterUser(request) {
    try {
        let { params } = request;

        if (!params.registrationId
            || !params.conferenceId
            || !params.fullName
            || !params.password) {
            return false;
        }

        let conference = await getConferenceById(params.conferenceId);

        if (!conference) {
            throw new Error("Registration: conference not found.");
        }

        let registration = await getRegistrationById(params.registrationId);
        if (!registration.get("invitationSentDate")) {
            throw new Error("Registration: no registration invitation has been sent for this user.");
        }

        if (!conference.equals(registration.get("conference"))) {
            throw new Error("Registration: registration is not valid for the chosen conference.");
        }

        let email = registration.get("email");
        let user = await getUserByEmail(email);

        if (user) {
            let userProfile = await getUserProfile(user, conference);

            if (userProfile) {
                await deleteRegistration(params.registrationId);
                throw new Error("Registration: the user has already been registered for this conference.");
            } else {
                await user.verifyPassword(params.password).catch(_ => {
                    throw new Error(`Registration: error matching user details.`)
                });
                await createUserProfile(user, params.fullName, registration.get("newRole"), conference);
            }
        } else {
            let user = await createUser(email, params.password);

            if (!user) {
                throw new Error("Signup: Failed to create user.");
            }

            await createUserProfile(user, params.fullName, registration.get("newRole"), conference);
        }

        await deleteRegistration(params.registrationId);

        return true;
    }
    catch (e) {
        console.error("Error during registration", e);
    }

    return false;
}
Parse.Cloud.define("user-register", handleRegisterUser);

/**
 * @typedef {Object} CreateUserParams
 * @property {string | undefined} conference
 * @property {string | undefined} email
 * @property {string | undefined} password
 * @property {string | undefined} fullName
 */

/**
 * @param {Parse.Cloud.FunctionRequest<CreateUserParams>} request
 */
async function handleCreateUser(request) {
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
                await user.verifyPassword(params.password).catch(_ => {
                    throw new Error(`Registration: error matching user details.`)
                });
                await createUserProfile(user, params.fullName, "attendee", conference);
                return true;
            }
            else {
                let user = await createUser(params.email, params.password);

                if (!user) {
                    throw new Error("Signup: failed to create user.");
                }

                await createUserProfile(user, params.fullName, "attendee", conference);
                return true;
            }
        }
    }
    catch (e) {
        console.error("Error during signup", e);
    }

    return false;
}
Parse.Cloud.define("user-create", handleCreateUser);

// TODO: When upgrading a user to an admin, iterate over all their twilio channels
//       and update their role SID. Also, update their service-level role SID.

module.exports = {
    getUserById: getUserById,
    getProfileOfUser: getProfileOfUser,
    getUserProfileById: getUserProfileById
};
