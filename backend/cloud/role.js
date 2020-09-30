/* global Parse */
// ^ for eslint

/**
 * Generates the full (database) name for the given role.
 * 
 * @param {string} confId 
 * @param {string} roleName 
 */
function generateRoleName(confId, roleName) {
    return confId + "-" + roleName;
}

/**
 * Determines whether a user is a member of any of the specified roles.
 * 
 * @param {string} userId 
 * @param {string} confId 
 * @param {Array<string>} allowedRoles
 * @returns {Promise<boolean>} - True if the user is a member of any of the roles.
 */
async function isUserInRoles(userId, confId, allowedRoles) {
    const rolesQ = new Parse.Query(Parse.Role);
    rolesQ.equalTo("users", new Parse.Object("_User", { id: userId }));
    rolesQ.equalTo("conference", new Parse.Object("Conference", { id: confId }))

    const roles = await rolesQ.find({ useMasterKey: true });
    return roles.some(r => allowedRoles.some(allowed => r.get("name") === generateRoleName(confId, allowed)));
}

async function getRoleByName(confId, roleName) {
    const roleQ = new Parse.Query(Parse.Role);
    roleQ.equalTo("conference", new Parse.Object("Conference", { id: confId }));
    roleQ.equalTo("name", generateRoleName(confId, roleName));
    return await roleQ.first({ useMasterKey: true });
}

/**
 * Note: Also used by things like textChat-create - edit with caution.
 */
async function configureDefaultProgramACLs(object) {
    const confId = object.get("conference").id;
    const adminRole = await getRoleByName(confId, "admin");
    const managerRole = await getRoleByName(confId, "manager");
    const attendeeRole = await getRoleByName(confId, "attendee");

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleReadAccess(attendeeRole, true);
    acl.setRoleWriteAccess(managerRole, true);
    acl.setRoleWriteAccess(adminRole, true);
    object.setACL(acl);
}

// TODO: configureDefaultProgramACLs_AllowAuthors

module.exports = {
    isUserInRoles: isUserInRoles,
    getRoleByName: getRoleByName,
    configureDefaultProgramACLs: configureDefaultProgramACLs
};
