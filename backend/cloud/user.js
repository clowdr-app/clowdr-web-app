/* global Parse */
// ^ for eslint

const {
    getConferenceById,
    getConferenceConfigurationByKey,
    generateRoleDBName
} = require("./conference");
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
        let signUpEnabled = signUpEnabledConfig && signUpEnabledConfig.get("value") === "true";

        if (signUpEnabled) {
            let user = await getUserByEmail(params.email);
            if (user) {
                // Validate: conference
                // validate their password matches
                //       If: they don't already have a profile for this conference
                //       Then: create a new user profile for the specificed conference and log them in
                //       Else: Log them in and redirect to the profile page, with a message telling them so
                // Override: Only log them in if their email is verified
                throw new Error("Sign up: creating new profile for existing account not implemented.");
            }
            else {
                // TODO: Verification email

                let newUser = new Parse.User({
                    email: params.email,
                    username: params.fullName.replace(/ /g, "_")
                });
                let newUserACL = new Parse.ACL();
                newUserACL.setPublicReadAccess(false);
                newUserACL.setPublicWriteAccess(false);
                newUser.setACL(newUserACL);
                newUser.setPassword(params.password);
                newUser.set("passwordSet", true);
                newUser.set("emailVerified", true); // TODO: Set to false when using email verification
                newUser = await newUser.save(null, { useMasterKey: true });
                newUserACL.setReadAccess(newUser, true);
                newUserACL.setWriteAccess(newUser, true);
                await newUser.save(null, { useMasterKey: true });

                let adminRole = await getRoleByName("admin", conference);
                let attendeeRole = await getRoleByName("attendee", conference);

                let newPresence = new Parse.Object("UserPresence", {
                    lastSeen: new Date(),
                    isDNT: false // TODO: Get from signup form
                });
                let newPresenceACL = new Parse.ACL();
                newPresenceACL.setPublicReadAccess(false);
                newPresenceACL.setPublicWriteAccess(false);
                newPresenceACL.setRoleReadAccess(attendeeRole, true);
                newPresenceACL.setReadAccess(newUser, true);
                newPresenceACL.setWriteAccess(newUser, true);
                newPresence.setACL(newPresenceACL);
                newPresence = await newPresence.save(null, { useMasterKey: true });

                let emptyFlair = await getFlairByLabel("<empty>", conference);
                let newProfile = new Parse.Object("UserProfile", {
                    user: newUser,
                    conference: conference,
                    primaryFlair: emptyFlair,
                    welcomeModalShown: false,
                    realName: params.fullName,
                    displayName: params.fullName,
                    presence: newPresence,
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
                newProfileACl.setReadAccess(newUser, true);
                newProfileACl.setWriteAccess(newUser, true);
                newProfile.setACL(newProfileACl);
                newProfile.save(null, { useMasterKey: true });

                let attendeeUsersRel = attendeeRole.relation("users");
                attendeeUsersRel.add(newUser);
                attendeeRole.save(null, { useMasterKey: true });

                return true;
            }
        }
    }
    catch (e) {
        console.error("Error during sign up", e);
    }

    return false;
});
