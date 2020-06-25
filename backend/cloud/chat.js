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
Parse.Cloud.define("chat-getSIDForProgramItem", async (request) => {
    let programItemID = request.params.programItem;
    let itemQ = new Parse.Query("ProgramItem");
    itemQ.include("track");
    let item = await itemQ.get(programItemID, {useMasterKey: true});
    if(item.get("track").get("perProgramItemChat") && !item.get("chatSID")){
        //Create room
        let config = await getConfig(item.get("conference"));
        let attributes = {
            category: "programItem",
            programItemID: programItemID
        }
        try{
            let chatRoom = await config.twilioChat.channels.create(
                {friendlyName: item.get('title'),
                    uniqueName: 'programItem-'+item.id,
                    type: 'public',
                    attributes: JSON.stringify(attributes)});
            item.set("chatSID", chatRoom.sid);
            await item.save({}, {useMasterKey: true});
        }
        catch(err){
            console.log(err);
            //Raced with another client creating the chat room
            let chatRoom = await config.twilioChat.channels('programItem-'+item.id).fetch();
            // item.set("chatSID", chatRoom.sid);
            // await item.save({}, {useMasterKey: true});

            return chatRoom.sid;
        }
    }
    return item.get("chatSID");
});
Parse.Cloud.define("chat-destroy", async (request) => {

});
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

        let profile2q = new Parse.Query(UserProfile);

        let parseUser2 = await profile2q.get(messageWith, {useMasterKey: true});
        //Look for an existing channel between these users.
        let convoQ = new Parse.Query(Converation);
        convoQ.equalTo("isDM", true);
        convoQ.equalTo("member1", parseUser2);
        convoQ.equalTo("member2", profile);
        let otherQ = new Parse.Query(Converation);
        otherQ.equalTo("isDM", true);
        otherQ.equalTo("member1", profile);
        otherQ.equalTo("member2", parseUser2);

        let convo = await Parse.Query.or(convoQ, otherQ).first({useMasterKey: true});
        console.log(convo)
        if (convo) {
            //Now make sure that both users are still members of the twilio room;
            let members = await config.twilioChat.channels(convo.get("sid")).members.list({limit: 20});

            if (!members.find(m => m.identity == profile.id)) {
                let member = await config.twilioChat.channels(convo.get("sid")).members.create({
                    identity: profile.id,
                    roleSid: config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE
                });
                console.log(member)
            }

            if (!members.find(m => m.identity == messageWith)) {
                let member = await config.twilioChat.channels(convo.get('sid')).members.create({
                    identity: messageWith,
                    roleSid: config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE
                });
                console.log(member)
            }
            console.log("Found existing chat room")
            return {"status": "ok", sid: convo.get("sid")};
        }
        convo = new Converation();
        convo.set("isDM", true)
        convo.set("friendlyName", "DM with " + conversationName + " from " + profile.get("displayName"));
        convo.set("member1", profile);
        convo.set("member2", parseUser2);
        convo.set("isPrivate", visibility =="private");
        let acl =new Parse.ACL();
        acl.setPublicReadAccess(false)
        acl.setPublicWriteAccess(false)
        if(visibility == "private"){
            acl.setWriteAccess(profile.get("user"), true);
            acl.setReadAccess(profile.get("user"), true);
            acl.setWriteAccess(parseUser2.get("user"), true);
            acl.setReadAccess(parseUser2.get("user"), true);
        }else{
            acl.setRoleReadAccess(conf.id+"-conference", true);
            acl.setRoleWriteAccess(conf.id+"-conference", true);
        }
        convo.setACL(acl);
        await convo.save({},{useMasterKey: true});

        let attributes = {
            category: "userCreated",
            mode: "directMessage",
            parseID: convo.id
        }
        console.log(attributes);
        let chatRoom = await config.twilioChat.channels.create(
            {friendlyName: conversationName, type: visibility,
            attributes: JSON.stringify(attributes)});
        //create the twilio room
        let member = await config.twilioChat.channels(chatRoom.sid).members.create({identity: profile.id,
        roleSid: config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE});

        let member2 = await config.twilioChat.channels(chatRoom.sid).members.create({identity: messageWith,
            roleSid: config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE});


        convo.set("sid", chatRoom.sid);
        await convo.save({},{useMasterKey: true});
        return {"status":"ok",sid:chatRoom.sid};
    }
    return {"status":"error","message":"Not authorized to create channels for this conference"};
});