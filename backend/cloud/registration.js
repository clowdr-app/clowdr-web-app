/* global Parse */
// ^ for eslint

// TODO: Function to trigger sending out (unsent) registration emails
// TODO: Function to trigger sending out reminder/repeat registration emails

// TODO: Before delete: Prevent delete if still in use anywhere

const { validateRequest } = require("./utils");
const { isUserInRoles, getRoleByName } = require("./role");
const sgMail = require("@sendgrid/mail");
const Config = require("./config.js")

// **** Registration **** //

async function getRegistrationById(id) {
    let query = new Parse.Query("Registration");
    return query.get(id, { useMasterKey: true });
}

async function configureDefaultRegistrationACLs(object) {
    const confId = object.get("conference").id;
    const adminRole = await getRoleByName(confId, "admin");

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleWriteAccess(adminRole, true);
    object.setACL(acl);
}

/**
 * @typedef {Object} RegistrationSpec
 * @property {string | undefined} [affiliation]
 * @property {string | undefined} [country]
 * @property {string} email
 * @property {Date | undefined} invitationSentDate
 * @property {string} name
 * @property {string | undefined} [newRole]
 * @property {Pointer} conference
 */

const createRegistrationSchema = {
    affiliation: "string?",
    country: "string?",
    email: "string",
    invitationSentDate: "date?",
    name: "string",
    conference: "string",
    newRole: "string?"
};

/**
 * Creates a Registration.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {RegistrationSpec} data - The specification of the new Registration.
 * @returns {Promise<Parse.Object>} - The new Registration
 */
async function createRegistration(data) {
    data.email = data.email.toLowerCase();

    let existingQ = new Parse.Query("Registration");
    existingQ.equalTo("conference", data.conference);
    existingQ.equalTo("email", data.email);
    const existingRegs = await existingQ.find({ useMasterKey: true });
    if (existingRegs.length > 0) {
        return existingRegs[0];
    }

    let existingU = new Parse.Query("_User");
    existingU.equalTo("email", data.email);
    const existingUsers = await existingU.find({ useMasterKey: true });
    if (existingUsers.length > 0) {
        return true;
    }

    const newObject = new Parse.Object("Registration", data);
    await configureDefaultRegistrationACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateRegistration(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createRegistrationSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if ("roleName" in spec) {
                if (!("newRole" in spec)) {
                    spec.newRole = spec.roleName;
                }
                delete spec.roleName;
            }

            if (!("newRole" in spec) || !spec.newRole) {
                spec.newRole = "attendee";
            }

            spec.newRole = spec.newRole.toLowerCase();
            const result = await createRegistration(spec);
            if (result === true) {
                return true;
            }
            else {
                return result.id;
            }
        }
        else {
            throw new Error("Permission denied");
        }
    }
    else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("registration-create", handleCreateRegistration);

/**
 * @typedef {Object} SendRegistrationEmailsRequest
 * @property {boolean} sendOnlyUnsent
 * @property {Pointer} conference
 */

const sendregistrationEmailsSchema = {
    sendOnlyUnsent: "boolean",
    conference: "string"
};

/**
 * @typedef {Object} SendRegistrationEmailsResponse
 * @property {boolean} success
 * @property {SendRegistrationEmailResult[]} results
 */

/**
 * @typedef {Object} SendRegistrationEmailResult
 * @property {boolean} success
 * @property {string} to
 * @property {string} [reason]
 */

/**
 * Sends registration emails for conference attendees.
 *
 * Note: you must perform authentication prior to calling this function.
 *
 * @param {SendRegistrationEmailsRequest} data - The specification of the new Registration.
 * @returns {Promise<SendRegistrationEmailsResponse>} - The new Registration
 */
async function sendRegistrationEmails(data) {
    const regQ = new Parse.Query("Registration");
    regQ.equalTo("conference", data.conference);

    if (data.sendOnlyUnsent) {
        regQ.doesNotExist("invitationSentDate");
    }

    let registrations = await regQ.find({ useMasterKey: true });

    console.log(registrations);

    let config = await Config.getConfig(data.conference.id);

    if (!config.SENDGRID_API_KEY) {
        throw new Error("No SendGrid API key available.")
    }

    sgMail.setApiKey(config.SENDGRID_API_KEY);

    let sendMessagePromises = [];

    for (let registration of registrations) {
        let email = registration.get("email").toLowerCase();
        let link = `${config.REACT_APP_FRONTEND_URL}/register/${data.conference.id}/${registration.id}/${email}`;

        data.conference = await data.conference.fetch({ useMasterKey: true });

        let conferenceName = data.conference.get("name");
        let messageText = `${conferenceName} is fast approaching! You have registered but you haven't yet activated your Clowdr profile. ${conferenceName} is using Clowdr to provide an interactive virtual conference experience. The Clowdr app gives you access to the conference program, live sessions, networking and more.`
        let greeting = `Best wishes from the ${conferenceName} team`

        let message = {
            to: email,
            from: config.SENDGRID_SENDER,
            subject: `Action required for ${conferenceName}: activate your Clowdr profile`,
            text: `${messageText}\n\nActivate your Clowdr profile at ${link}\n\n${greeting}`,
            html: `<p>${messageText}</p>
            <p><a href="${link}">Activate your Clowdr profile for ${conferenceName} now!</a></p>
            <p>${greeting}</p>`
        };

        console.log(`Sending email to ${email}`);

        sendMessagePromises.push(sgMail
            .send(message)
            .then(async _ => {
                try {
                    await registration.save("invitationSentDate", new Date(), { useMasterKey: true });
                    return { to: message.to, success: true };
                } catch(reason) {
                    console.error(`Failed to record that a registration invitation was sent to ${email}.`, reason)
                    return { to: message.to, success: false, reason }
                }
            })
            .catch(error => {
                return { to: message.to, success: false, reason: error };
            }));
    }

    let results = await Promise.all(sendMessagePromises);

    return {
        success: results.every(result => result.success),
        results
    };
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleSendRegistrationEmails(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(sendregistrationEmailsSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            const result = await sendRegistrationEmails(spec);
            return result;
        }
        else {
            throw new Error("Permission denied");
        }
    }
    else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("registration-send-emails", handleSendRegistrationEmails);

module.exports = {
    getRegistrationById
};
