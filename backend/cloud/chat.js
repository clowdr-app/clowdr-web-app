let UserProfile = Parse.Object.extend("UserProfile");
let Converation = Parse.Object.extend("Conversation");
let ClowdrInstance = Parse.Object.extend("ClowdrInstance");
let InstanceConfig = Parse.Object.extend("InstanceConfiguration");
const Twilio = require("twilio");

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

Parse.Cloud.define("chat-createDM", async (request) => {
    let confID = request.params.confID;
    let conversationName = request.params.conversationName;
    let messageWith = request.params.messageWith;
    let visibility="private";

    let userQ = new Parse.Query(UserProfile);
    let conf = new ClowdrInstance();
    conf.id = confID;
    userQ.equalTo("user", request.user);
    userQ.equalTo("conference", conf);
    let profile = await userQ.first({useMasterKey: true});
    if(profile){
        let config = await getConfig(conf);
        let chatRoom = await config.twilioChat.channels.create(
            {friendlyName: conversationName, type: visibility,
            attributes: '{"category": "userCreated", "mode": "directMessage"}'});
        //create the twilio room
        let member = await config.twilioChat.channels(chatRoom.sid).members.create({identity: profile.id,
        roleSid: config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE});

        let member2 = await config.twilioChat.channels(chatRoom.sid).members.create({identity: messageWith,
            roleSid: config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE});

        let convo = new Converation();
        convo.set("friendlyName", "DM with " + conversationName + " from " + profile.get("displayName"));
        convo.set("sid", chatRoom.sid);
        convo.set("isPrivate", visibility =="private");
        let acl =new Parse.ACL();
        acl.setPublicReadAccess(false)
        acl.setPublicWriteAccess(false)
        if(visibility == "private"){
            acl.setWriteAccess(profile.get("user"), true);
            acl.setReadAccess(profile.get("user"), true);
        }else{
            acl.setRoleReadAccess(conf.id+"-conference", true);
            acl.setRoleWriteAccess(conf.id+"-conference", true);
        }
        convo.setACL(acl);
        await convo.save({},{useMasterKey: true});
        return {"status":"ok",sid:chatRoom.sid};
    }
    return {"status":"error","message":"Not authorized to create channels for this conference"};
});