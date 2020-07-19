const Twilio = require("twilio");

let ClowdrInstance = Parse.Object.extend("ClowdrInstance");

let InstanceConfig = Parse.Object.extend("InstanceConfiguration");
let SocialSpace = Parse.Object.extend("SocialSpace");

async function getConfig(conf) {
    let q = new Parse.Query(InstanceConfig)
    q.equalTo("instance", conf);
    let res = await q.find({useMasterKey: true});
    let config = {};
    for (let obj of res) {
        config[obj.get("key")] = obj.get("value");
    }
    return config;
}

var globalSocialSpaces =[
    "Lobby"
];

async function createSocialSpaces(conf){
    conf.config = await getConfig(conf);
    console.log('[init]: got config: ' + JSON.stringify(conf.config));

    conf.twilio = Twilio(conf.config.TWILIO_ACCOUNT_SID, conf.config.TWILIO_AUTH_TOKEN);

    for (let spaceName of globalSocialSpaces){
        let spaceQ = new Parse.Query(SocialSpace);
        spaceQ.equalTo("conference", conf);
        spaceQ.equalTo("name", spaceName);
        spaceQ.equalTo("isGlobal", true);
        let space = await spaceQ.first({useMasterKey: true});
        if (!space) {
            console.log(`[init]: ${spaceName} doesn't yet exist. Creating it.`);
            space= new SocialSpace();
            space.set("conference", conf);
            space.set("name",spaceName);
            space.set("isGlobal", true);
            let acl = new Parse.ACL();
            acl.setPublicWriteAccess(false);
            acl.setPublicReadAccess(false);
            acl.setRoleReadAccess(conf.id+"-conference", true);
            acl.setRoleWriteAccess(conf.id+"-moderator", true);
            space.setACL(acl);
            space = await space.save({}, {useMasterKey: true});
        }
        if (!space.get("chatChannel")) {
            console.log(`[init]: chat for ${spaceName} doesn't yet exist. Creating it.`);
            let chat = conf.twilio.chat.services(conf.config.TWILIO_CHAT_SERVICE_SID);
            let twilioChatRoom = await chat.channels.create({
                friendlyName: spaceName,
                uniqueName: "socialSpace-" + space.id,
                type: "public",
                attributes: JSON.stringify({
                    category: "socialSpace",
                    isGlobal: true,
                    spaceID: space.id
                })
            });
            space.set("chatChannel", twilioChatRoom.sid);

            await space.save({}, {useMasterKey: true});
            console.log('[init]: chat channel is ' + space.get('chatChannel'));
        } else {
            console.log(`[init]: chat for ${spaceName} already exists. Updating it.`);
            let chat = conf.twilio.chat.services(conf.config.TWILIO_CHAT_SERVICE_SID);
            let twilioChatRoom = await chat.channels(space.get("chatChannel")).update({
                friendlyName: spaceName,
                attributes: JSON.stringify({
                    category: "socialSpace",
                    isGlobal: true,
                    spaceID: space.id
                })
            });
        }
    }

}

async function getOrCreateRole(confID, roleSuffix){
    let conferencePrivQ = new Parse.Query(Parse.Role);
    conferencePrivQ.equalTo("name",confID+"-"+roleSuffix);
    let confPriv = await conferencePrivQ.first({useMasterKey: true});
    if(!confPriv){
        let roleACL = new Parse.ACL();
        roleACL.setPublicReadAccess(true);
        confPriv = new Parse.Role(confID+"-"+roleSuffix, roleACL);
        await confPriv.save({},{useMasterKey: true});
    }
    return confPriv;

}
async function createDefaultRoles(conf) {
    let confRole = await getOrCreateRole(conf.id, "conference")
    let modRole = await getOrCreateRole(conf.id, "moderator")
    let managerRole = await getOrCreateRole(conf.id, "manager")
    let adminRole = await getOrCreateRole(conf.id, "admin")
}

var privilegeRoles = {
    "createVideoRoom": null,
    "chat": null,
    "access-from-slack": null,
    "createVideoRoom-persistent": null,
    "createVideoRoom-group": null,
    "createVideoRoom-smallgroup": null,
    "createVideoRoom-peer-to-peer": null,
    'createVideoRoom-private': null,
    "moderator": null,
    'announcement-global': null

};
let PrivilegedAction = Parse.Object.extend("PrivilegedAction");
let InstancePermission = Parse.Object.extend("InstancePermission");

var adminRole;

async function getClowdrAdminRole() {
    if (adminRole)
        return adminRole;
    let roleQ = new Parse.Query(Parse.Role);
    roleQ.equalTo("name", "ClowdrSysAdmin");
    adminRole = await roleQ.first({useMasterKey: true});
    return adminRole;
}

async function createPrivileges() {
    let adminRole = await getClowdrAdminRole();
    return Promise.all(Object.keys(privilegeRoles).map(async (action) => {
            let actionsQ = new Parse.Query(PrivilegedAction);
            actionsQ.equalTo("action", action)
            actionsQ.include("role");
            let res = await actionsQ.first({useMasterKey: true});
            if (!res) {
                let pa = new PrivilegedAction();
                pa.set("action", action);
                res = await pa.save({}, {useMasterKey: true});
            }
            privilegeRoles[action] = res;
        }
    ));
}


Parse.Cloud.define("init-conference-2", (request) => {

    let confID = request.params.conference;
    console.log('[init]: conference ' + confID);

    let confQ = new Parse.Query(ClowdrInstance);
    confQ.get(confID, {useMasterKey: true}).then( conf => {
        createSocialSpaces(conf);

        createPrivileges().then(async (res) => {
            let toSave = [];

            let acl = new Parse.ACL();
            acl.setPublicReadAccess(false);
            acl.setRoleReadAccess(conf.id + "-conference", true);

            let permissionQ = new Parse.Query(InstancePermission);
            permissionQ.equalTo("conference", conf);
            let privs = await permissionQ.find({useMasterKey: true});
            for (let action of Object.values(privilegeRoles)) {
                if (!privs.find(p => p.get('action').get('action') == action)) {
                    console.log("Creating instance permission for " + action)
                    priv = new InstancePermission();
                    priv.set("conference", conf);
                    priv.set("action", action);
                    priv.setACL(acl);
                    toSave.push(priv);
                }
            }
            Parse.Object.saveAll(toSave, {useMasterKey: true})
        }).catch(err => {
            console.log('[init]: Unable to find ' + confID);
            response.error("Bad conference ID");

        });

        console.log("[init]: Done creating privileges")        
    });
})