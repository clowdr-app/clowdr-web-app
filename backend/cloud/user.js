/* global Parse */
// ^ for eslint

// TODO: Before delete: Remove user ACLs for every record related to the conference
// TODO: Before save: If banning a user, remove their ACLs for every record related to the conference

const Twilio = require("twilio");
const { nanoid } = require("nanoid");
const sgMail = require("@sendgrid/mail");
const { isUserInRoles } = require("./role");
const {
    getConferenceById,
    getConferenceConfigurationByKey
} = require("./conference");
const {
    getRegistrationById
} = require("./registration");
const { validateRequest } = require("./utils");
const Config = require("./config")
const { generateRoleDBName } = require("./role");

async function getUserByEmail(email) {
    let query = new Parse.Query(Parse.User);
    query.equalTo("email", email.toLowerCase());
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
    query.equalTo("name", generateRoleDBName(conference.id, roleName));
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

    let newWatchedItems = new Parse.Object("WatchedItems", {
        conference
    });
    let newWatchedItemsACL = new Parse.ACL();
    newWatchedItemsACL.setPublicReadAccess(false);
    newWatchedItemsACL.setPublicWriteAccess(false);
    newWatchedItemsACL.setReadAccess(user, true);
    newWatchedItemsACL.setWriteAccess(user, true);
    newWatchedItems.setACL(newWatchedItemsACL);
    newWatchedItems = await newWatchedItems.save(null, { useMasterKey: true });

    let newProfile = new Parse.Object("UserProfile", {
        user: user,
        conference: conference,
        primaryFlair: undefined,
        welcomeModalShown: false,
        realName: fullName,
        displayName: fullName,
        dataConsentGiven: false, // TODO: Require from sign up form
        pronouns: [],
        tags: [],
        flairs: [],
        watched: newWatchedItems
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

    // And now we re-save the new watched items to trigger the beforeSave event
    // which will now be able to set up the auto watches correctly

    const chatsToAutoWatch = await getAutoWatchTextChats(conference, user.getSessionToken());
    newWatchedItems.set("watchedChats", chatsToAutoWatch.map(x => x.id));
    await newWatchedItems.save(null, { useMasterKey: true });

    // TODO: Link profile to program person (author)
    // TODO: Give authors write access to their program items/events
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
 * @param {string} userId
 * @param {string} confId
 * @returns {Promise<Parse.Object | null>}
 */
async function getProfileOfUserId(userId, confId) {
    const q = new Parse.Query("UserProfile");
    q.equalTo("conference", new Parse.Object("Conference", { id: confId }));
    q.equalTo("user", new Parse.Object("_User", { id: userId }));
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
    let { params } = request;

    try {
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

        let email = registration.get("email").toLowerCase();
        let user = await getUserByEmail(email);

        if (user) {
            let userProfile = await getUserProfile(user, conference);

            if (userProfile) {
                await deleteRegistration(params.registrationId);
                return true;
            } else {
                await Parse.User.logIn(user.get("username"), params.password, {
                    useMasterKey: true
                }).catch(_ => {
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
        console.error(`Error during registration of ${params.registrationId} / ${params.fullName}`, e);
        if (e.toString().includes("error matching user details")) {
            return "Use existing password";
        }
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
            let user = await getUserByEmail(params.email.toLowerCase());
            if (user) {
                await Parse.User.logIn(user.get("username"), params.password, { useMasterKey: true }).catch(_ => {
                    throw new Error(`Registration: error matching user details.`)
                });
                await createUserProfile(user, params.fullName, "attendee", conference);
                return true;
            }
            else {
                let user = await createUser(params.email.toLowerCase(), params.password);

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

/**
 * @typedef {Object} StartResetPasswordSpec
 * @property {Pointer} user
 * @property {Pointer} conference
 */

const startResetPasswordSchema = {
    email: "string",
    conference: "string",
};

/**
 * Trigger the password reset process.
 *
 * @param {StartResetPasswordSpec} data
 * @returns {Promise<void>}
 */
async function startResetPassword(data) {
    try {
        let email = await data.user.get("email").toLowerCase();
        if (data.user && email) {
            let token = nanoid();
            let dateAndToken = `${new Date().getTime()},${token}`;
            await data.user.save("passwordResetToken", dateAndToken, { useMasterKey: true });
            await sendPasswordResetEmail(data.conference.id, email, token);
        } else {
            console.error(`Failed to retrieve email for user ${data.user.id}`);
        }
    } catch (e) {
        throw new Error("Failed to start password reset.");
    }
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleStartResetPassword(req) {
    let { params } = req

    const requestValidation = validateRequest(startResetPasswordSchema, params);
    if (requestValidation.ok) {
        let confId = params.conference;
        let user = await getUserByEmail(params.email.toLowerCase())
        // This fails if the user has a user account, forgot their password but doesn't
        // have a profile for this conference.
        // const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager", "attendee"]);
        // if (!authorized) {
        //     console.log(`Password reset not triggered for ${params.email.toLowerCase()}`);
        //     return;
        // }

        console.log(`Password reset triggered for ${params.email.toLowerCase()}`);
        let spec = {
            user,
            conference: new Parse.Object("Conference", { id: confId }),
        };
        await startResetPassword(spec);
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("user-start-reset-password", handleStartResetPassword)

/**
 * @param {string} confId
 * @param {string} email
 * @param {string} token
 */
async function sendPasswordResetEmail(confId, email, token) {
    let config = await Config.getConfig(confId);

    if (!config.SENDGRID_API_KEY) {
        throw new Error("No SendGrid API key available.")
    }

    sgMail.setApiKey(config.SENDGRID_API_KEY);

    let link = `${config.REACT_APP_FRONTEND_URL}/resetPassword/${token}/${email.toLowerCase()}`;

    let messageText = `A password reset has been request for your Clowdr account registered to ${email.toLowerCase()}.`;
    let greeting = `Best wishes from the Clowdr team`;

    let message = {
        to: email.toLowerCase(),
        from: config.SENDGRID_SENDER,
        subject: `Password reset for your Clowdr profile`,
        text: `${messageText}\n\nReset your password at ${link}\n\n${greeting}`,
        html: `<p>${messageText}</p>
        <p><a href="${link}">Reset your password</a></p>
        <p>${greeting}</p>`
    };

    console.log(`Sending email to ${email.toLowerCase()}`);

    try {
        await sgMail.send(message);
    } catch (e) {
        console.log(`Sending password reset to ${email.toLowerCase()} failed`, e);
    }
}

/**
 * @typedef {Object} ResetPasswordSpec
 * @property {string} email
 * @property {string} token
 * @property {string} password
 */

const resetPasswordSchema = {
    email: "string",
    token: "string",
    password: "string",
};

/**
 * Reset a user's password.
 *
 * @param {ResetPasswordSpec} data
 * @returns {Promise<void>}
 */
async function resetPassword(data) {
    try {
        let user = await getUserByEmail(data.email.toLowerCase());
        let dateAndToken = user.get("passwordResetToken");

        let [millis, token] = dateAndToken.split(',');
        let timeSinceTokenIssued = new Date() - new Date(parseInt(millis, 10));

        if (86400000 > timeSinceTokenIssued && token === data.token) {
            user.setPassword(data.password);
            user.unset("passwordResetToken");
            await user.save(null, { useMasterKey: true });
        } else {
            throw new Error("Failed to reset password.");
        }
    } catch (e) {
        throw new Error("Failed to reset password.");
    }
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleResetPassword(req) {
    let { params } = req;

    const requestValidation = validateRequest(resetPasswordSchema, params);
    if (requestValidation.ok) {
        console.log(`Resetting password for ${params.email.toLowerCase()}`);
        await resetPassword(params);
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("user-reset-password", handleResetPassword)

// CHAT_TODO: When upgrading a user to an admin, iterate over all their twilio channels
//       and update their role SID. Also, update their service-level role SID.
// CHAT_TODO: And likewise if upgrading them to a manager
// CHAT_TODO: And likewise if downgrading them to a manager or attendee

// Has to be here so the module loader doesn't land in a loop resulting in functions being undefined
async function getAutoWatchTextChats(conference, sessionToken) {
    const query = new Parse.Query("TextChat");
    query.equalTo("conference", conference);
    query.equalTo("autoWatch", true);
    return await query.map(x => x, { sessionToken });
}

Parse.Cloud.define("users-in-roles", async (req) => {
    let { params, user } = req;

    const requestValidation = validateRequest({
        conference: "string",
        roles: "[string]"
    }, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["attendee", "admin", "manager"]);
        if (authorized) {
            const roleNames = params.roles;
            const roleProfileIds
                = (await
                    new Parse.Query("_Role")
                        .equalTo("conference", new Parse.Object("Conference", { id: confId }))
                        .containedIn("name", roleNames.map(x => generateRoleDBName(confId, x)))
                        .include("users")
                        .map(role =>
                            role.get("users")
                                .query()
                                .map(async _user => {
                                    const p = await getProfileOfUser(_user, confId);
                                    return p.id;
                                }, { useMasterKey: true }),
                            { useMasterKey: true })
                ).reduce((acc, xs) => [...acc, ...xs], []);
            return roleProfileIds;
        }
        return [];
    } else {
        throw new Error(requestValidation.error);
    }
});

Parse.Cloud.define("user-kick", async (req) => {
    let { params, user } = req;

    const requestValidation = validateRequest({
        conference: "string",
        target: "string"
    }, params);
    if (requestValidation.ok) {
        const confId = params.conference;
        const conf = new Parse.Object("Conference", { id: confId });

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin"]);
        if (authorized) {
            const targetProfile = await getUserProfileById(params.target, confId);
            if (targetProfile) {
                const targetUser = targetProfile.get("user");
                await new Parse.Query("_Role")
                    .equalTo("conference", conf)
                    .map(async role => {
                        const usersRel = role.get("users");
                        usersRel.remove(targetUser);
                        await role.save(null, { useMasterKey: true });
                    }, { useMasterKey: true });

                const config = await Config.getConfig(confId);
                const accountSID = config.TWILIO_ACCOUNT_SID;
                const accountAuth = config.TWILIO_AUTH_TOKEN;
                const twilioClient = Twilio(accountSID, accountAuth);
                const chatServiceSID = config.TWILIO_CHAT_SERVICE_SID;
                const chatService = twilioClient.chat.services(chatServiceSID);

                await chatService.users(targetProfile.id).remove();

                const twilioVideoRooms = await twilioClient.video.rooms.list();
                await Promise.all(twilioVideoRooms.map(async twilioRoom => {
                    const participants = await twilioRoom.participants().list();
                    if (participants.some(participant => participant.identity === targetProfile.id)) {
                        await twilioRoom
                            .participants(targetProfile.id)
                            .update({ status: "disconnected" });
                    }
                }));

                await new Parse.Query("ProgramPerson")
                    .equalTo("conference", conf)
                    .equalTo("profile", targetProfile)
                    .map(async person => {
                        // TODO: set null or remove?
                        person.set("profile", null);
                        await person.save(null, { useMasterKey: true });
                    }, { useMasterKey: true });

                await new Parse.Query("ProgramItem")
                    .equalTo("conference", conf)
                    .map(async item => {
                        const acl = item.getACL();
                        acl.setReadAccess(targetUser.id, false);
                        acl.setWriteAccess(targetUser.id, false);
                        await item.save(null, { useMasterKey: true });
                    }, { useMasterKey: true });

                await new Parse.Query("ProgramItemAttachment")
                    .equalTo("conference", conf)
                    .map(async item => {
                        const acl = item.getACL();
                        acl.setReadAccess(targetUser.id, false);
                        acl.setWriteAccess(targetUser.id, false);
                        await item.save(null, { useMasterKey: true });
                    }, { useMasterKey: true });

                await new Parse.Query("TextChat")
                    .equalTo("conference", conf)
                    .map(async item => {
                        const acl = item.getACL();
                        acl.setReadAccess(targetUser.id, false);
                        acl.setWriteAccess(targetUser.id, false);
                        await item.save(null, { useMasterKey: true });
                    }, { useMasterKey: true });

                await new Parse.Query("VideoRoom")
                    .equalTo("conference", conf)
                    .map(async item => {
                        const acl = item.getACL();
                        acl.setReadAccess(targetUser.id, false);
                        acl.setWriteAccess(targetUser.id, false);
                        await item.save(null, { useMasterKey: true });
                    }, { useMasterKey: true });

                await new Parse.Query("Registration")
                    .equalTo("conference", conf)
                    .equalTo("email", targetUser.get("email").toLowerCase())
                    .map(async item => {
                        await item.destroy({ useMasterKey: true });
                    }, { useMasterKey: true });

                targetProfile.set("isBanned", true);
                await targetProfile.save(null, { useMasterKey: true });

                return true;
            }
        }
    }

    return false;
});

module.exports = {
    getUserById: getUserById,
    getProfileOfUser: getProfileOfUser,
    getProfileOfUserId: getProfileOfUserId,
    getUserProfileById: getUserProfileById,
    getAutoWatchTextChats: getAutoWatchTextChats
};
