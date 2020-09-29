/* global Parse */
// ^ for eslint

// TODO: Function to trigger sending out (unsent) registration emails
// TODO: Function to trigger sending out reminder/repeat registration emails

// TODO: Before delete: Prevent delete if still in use anywhere

const { validateRequest } = require("./utils");
const { isUserInRoles, getRoleByName } = require("./role");

// **** Registration **** //

async function configureDefaultRegistrationACLs(object) {
    const confId = object.get("conference").id;
    const adminRole = await getRoleByName(confId, "admin");
    const managerRole = await getRoleByName(confId, "manager");

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleWriteAccess(managerRole, true);
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
 * @property {Pointer} conference
 */

const createRegistrationSchema = {
    affiliation: "string?",
    country: "string?",
    email: "string",
    invitationSentDate: "date?",
    name: "string",
    conference: "string"
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

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            const result = await createRegistration(spec);
            return result.id;
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
