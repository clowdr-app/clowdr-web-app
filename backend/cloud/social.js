
let UserProfile = Parse.Object.extend("UserProfile");
let SocialSpace = Parse.Object.extend("SocialSpace");

let Converation = Parse.Object.extend("Conversation");
let ClowdrInstance = Parse.Object.extend("ClowdrInstance");
let InstanceConfig = Parse.Object.extend("InstanceConfiguration");
const Twilio = require("twilio");
const backOff = require('exponential-backoff').backOff;


async function getConfig(conference){
    let configQ = new Parse.Query(InstanceConfig);
    configQ.equalTo("instance", conference);
    // configQ.cache(60);
    let res = await configQ.find({useMasterKey: true});
    let config = {};
    for (let obj of res) {
        config[obj.get("key")] = obj.get("value");
    }
    config.twilio = Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    config.twilioChat = config.twilio.chat.services(config.TWILIO_CHAT_SERVICE_SID);

    if(!config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE){
        let role = await config.twilioChat.roles.create({
            friendlyName :'clowdrAttendeeManagedChatParticipant',
            type: 'channel',
            permission: ['addMember','deleteOwnMessage','editOwnMessage','editOwnMessageAttributes','inviteMember','leaveChannel','sendMessage','sendMediaMessage',
            'editChannelName','editChannelAttributes']
        })
        let newConf = new InstanceConfig();
        newConf.set("instance", conference);
        newConf.set("key","TWILIO_CHAT_CHANNEL_MANAGER_ROLE");
        newConf.set("value", role.sid);
        await newConf.save({},{useMasterKey: true});
        config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE = role.sid;
    }
    return config;
}
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function callWithRetry(twilioFunctionToCall) {
    const response = await backOff(twilioFunctionToCall,
        {
            startingDelay: 500,
            retry: (err, attemptNum) => {
                if (err && err.code == 20429)
                    return true;
                console.log(err);
                return false;
            }
        });
    return response;
}
async function createWithRetry(config, roomName, socialSpace, attributes){
    try {
        let chatRoom = await callWithRetry(()=>config.twilioChat.channels.create(
            {
                friendlyName: roomName,
                uniqueName: 'socialSpace-' + socialSpace.id,
                type: 'public',
                attributes: JSON.stringify(attributes)
            }));
        return chatRoom;
    }catch(err){
        console.log("Unable to create social space room")
        console.log(err);
            throw err;
    }
}
Parse.Cloud.beforeSave("ProgramRoom", async (request) => {
    let room = request.object;
    let socialSpace = room.get("socialSpace");
    let roomName = room.get("name").replace("Virtual | ","");
    if (!socialSpace) {
        //create a social spac
        let socialSpace = new SocialSpace();
        socialSpace.set("conference", room.get("conference"));
        socialSpace.set("name", roomName);
        //Create a chat channel
        let acl = new Parse.ACL();
        acl.setPublicWriteAccess(false);
        acl.setPublicReadAccess(true);
        acl.setRoleWriteAccess(room.get("conference").id + "-manager", true);
        acl.setRoleWriteAccess(room.get("conference").id + "-admin", true);

        socialSpace.setACL(acl);
        await socialSpace.save({}, {useMasterKey: true});
        let config = await getConfig(room.get("conference"));
        let attributes = {
            category: "socialSpace",
            spaceID: socialSpace.id
        }
        try {
            let chatRoom = await createWithRetry(config, roomName, socialSpace, attributes);;;
            socialSpace.set("chatChannel", chatRoom.sid);
            await socialSpace.save({}, {useMasterKey: true});
            room.set("socialSpace", socialSpace);
            return room;
        } catch (err) {
            console.log(err);

            return err;
        }
    }else{
        socialSpace = await socialSpace.fetch({useMasterKey: true});
        if(socialSpace.get("name") != roomName){
            let config = await getConfig(room.get("conference"));

            //update name
            socialSpace.set("name", roomName);
            let twilioUpdate = await callWithRetry(()=>config.twilioChat.channels(socialSpace.get("chatChannel")).update({friendlyName: roomName}));
            await Promise.all([twilioUpdate, socialSpace.save({},{useMasterKey: true})]);
            return room;
        }
    }
});
