let UserProfile = Parse.Object.extend("UserProfile");
let Converation = Parse.Object.extend("Conversation");
let ClowdrInstance = Parse.Object.extend("ClowdrInstance");
let InstanceConfig = Parse.Object.extend("InstanceConfiguration");
let BondedChannel = Parse.Object.extend("BondedChannel");
let TwilioChannelMirror = Parse.Object.extend("TwilioChannelMirror");
let BreakoutRoom = Parse.Object.extend("BreakoutRoom");
let SocialSpace = Parse.Object.extend("SocialSpace");

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

    if (!config.TWILIO_CALLBACK_URL) {
        config.TWILIO_CALLBACK_URL = "http://localhost:3000/twilio/event"
    }
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
    if(!config.TWILIO_CHAT_CHANNEL_OBSERVER_ROLE){
        let role = await config.twilioChat.roles.create({
            friendlyName :'clowdrChatObserver',
            type: 'channel',
            permission: ['deleteOwnMessage']
        })
        let newConf = new InstanceConfig();
        newConf.set("instance", conference);
        newConf.set("key","TWILIO_CHAT_CHANNEL_OBSERVER_ROLE");
        newConf.set("value", role.sid);
        await newConf.save({},{useMasterKey: true});
        config.TWILIO_CHAT_CHANNEL_OBSERVER_ROLE = role.sid;
    }
    if(!config.TWILIO_ANNOUNCEMENTS_CHANNEL){
        let attributes = {
            category: "announcements-global",
        }
        let chatRoom = await config.twilioChat.channels.create(
            {friendlyName: "Announcements", type: "private",
                attributes: JSON.stringify(attributes)});
        let newConf = new InstanceConfig();
        newConf.set("instance", conference);
        newConf.set("key","TWILIO_ANNOUNCEMENTS_CHANNEL");
        newConf.set("value", chatRoom.sid);
        await newConf.save({},{useMasterKey: true});
        config.TWILIO_ANNOUNCEMENTS_CHANNEL = chatRoom.sid;
    }
    return config;
}

Parse.Cloud.job("reapInactiveUsers", async (request) => {
    let confQ = new Parse.Query(ClowdrInstance);
    return confQ.find({useMasterKey: true}).then(async (confs) => {
        for (let conf of confs) {
            let config = await getConfig(conf);

            let activeQ = new Parse.Query("UserPresence");
            activeQ.include("user");
            activeQ.equalTo("isOnline", true);
            let profileQ = new Parse.Query("UserProfile");
            profileQ.equalTo("conference", conf);
            activeQ.matchesQuery("user", profileQ);
            for (let user of await activeQ.find({useMasterKey: true})) {
                let uid = user.get("user").id;
                config.twilioChat.users(uid).fetch().then(twilioUser => {
                    if (!twilioUser.isOnline) {
                        user.set("isOnline", false);
                        user.save({}, {useMasterKey: true});
                    }
                }).catch(err => {
                    console.log(err);
                })
            }
        }
    })
});

async function getBondedChannel(conf, config, originalChatSID){
    //Look to see if we already started this bonding
    let bondedChanQ = new Parse.Query(BondedChannel);
    bondedChanQ.equalTo("masterSID", originalChatSID);
    bondedChanQ.include("children");
    let chan = await bondedChanQ.first({useMasterKey: true});
    if(!chan){
        //Create a new bonding
        chan = new BondedChannel();
        chan.set("masterSID", originalChatSID);
        chan.set("conference",conf);
        try{
            await chan.save({},{useMasterKey: true});

            //Create the webhook
            await config.twilioChat.channels(originalChatSID).webhooks.create({type:
            'webhook',
            configuration: {
                url: 'https://back.clowdr.org/twilio/bondedChannel/'+chan.id+'/event',
                method: "POST",
                filters: 'onMessageSent',
            }});
        }catch(err){
            console.log(err);
            chan = await bondedChanQ.first({useMasterKey: true});
        }
    }
    let childrenRelation = chan.relation("children");
    let childrenQ = childrenRelation.query();
    childrenQ.lessThan("numMembers", 900);
    let mirrorChan = await childrenQ.first({useMasterKey: true});
    if (!mirrorChan) {
        mirrorChan = new TwilioChannelMirror();
        mirrorChan.set("parent", chan);
        let originalChannel = await config.twilioChat.channels(originalChatSID).fetch();
        let oldAttrs = await originalChannel.attributes;
        let attributes = JSON.parse(oldAttrs);
        attributes.bondedTo = originalChatSID;
        let oldType = originalChannel.type;
        let chatRoom = await config.twilioChat.channels.create(
            {friendlyName: originalChannel.friendlyName,
                type: oldType,
                attributes: JSON.stringify(attributes)});
        mirrorChan.set("sid",chatRoom.sid);
        //copy over the old messages
        let oldMessages = await config.twilioChat.channels(originalChatSID).messages.list({limit: 100, order: 'desc'});
        let sorted = oldMessages.sort((m1,m2)=>(m1.index < m2.index ? -1 : 1));
        let promises = [];
        for(let message of sorted){
            promises.push(config.twilioChat.channels(chatRoom.sid).messages.create({
                from: message.from,
                attributes: message.attributes,
                body: message.body,
            }))
        }
        await Promise.all(promises);
        //Make sure web hooks are set up
        await config.twilioChat.channels(chatRoom.sid).webhooks.create({type:
                'webhook',
            configuration: {
                url: 'https://back.clowdr.org/twilio/bondedChannel/'+chan.id+'/event',
                method: "POST",
                filters: 'onMessageSent',
            }});

        await mirrorChan.save({},{useMasterKey: true});
        chan.relation("children").add(mirrorChan);
        await chan.save({},{useMasterKey: true});
        return chatRoom.sid;
    } else {
        (await mirrorChan).increment("numMembers");
        return mirrorChan.get("sid");
    }


}
Parse.Cloud.define("chat-getBondedChannelForSID", async (request) => {
    let confID = request.params.conference;
    let userQ = new Parse.Query(UserProfile);
    let conf = new ClowdrInstance();
    conf.id = confID;
    userQ.equalTo("user", request.user);
    userQ.equalTo("conference", conf);

    let profile = await userQ.first({useMasterKey: true});
    if(profile) {
        let config = await getConfig(conf);
        let newChan = await getBondedChannel(conf, config, request.params.sid);
        console.log("Returning bonded channel " + newChan+ " for " + request.params.sid + " for "+ profile.id)
        return newChan;

    }
    return null;
});

Parse.Cloud.define("chat-getBreakoutRoom", async (request) => {
    let confID = request.params.conference;
    let userQ = new Parse.Query(UserProfile);
    let conf = new ClowdrInstance();
    let sid = request.params.sid;
    let socialSpaceID = request.params.socialSpaceID;
    let roomName = request.params.title;
    let persistence = "ephemeral";

    conf.id = confID;
    userQ.equalTo("user", request.user);
    userQ.include("conference");
    userQ.equalTo("conference", conf);

    let profile = await userQ.first({useMasterKey: true});
    if(profile) {
        let config = await getConfig(conf);
        let originalChannel = await config.twilioChat.channels(sid).fetch();
        if (originalChannel.attributes && originalChannel.attributes.category == 'programItem') {
            return {
                status: "ok",
                room: originalChannel.attributes.breakoutRoom
            }
        }
        if (originalChannel.type == "private") {
            //Is it a DM or a conversation?
            let attributes = originalChannel.attributes;
            if (attributes)
                attributes = JSON.parse(attributes);
            if (attributes && (attributes.mode == "directMessage" || attributes.mode == "group")) {
                let parseID = attributes.parseID;
                if (parseID) {
                    //Validate that this user has access to the convo
                    let convoQ = new Parse.Query(Converation);
                    let convo = await convoQ.get(parseID, {sessionToken: request.user.getSessionToken()});
                    if (convo) {
                        //make a new breakout room in this space, then drop a link into the chat to it.
                        let mode = "group";
                        persistence = "persistent";
                        let maxParticipants = (mode == "peer-to-peer" ? 10 : (mode == "group-small" ? 4 : 50));
                        try {

                            let twilioRoom = await config.twilio.video.rooms.create({
                                type: mode,
                                uniqueName: sid,
                                // type: conf.config.TWILIO_ROOM_TYPE,
                                maxParticipants: maxParticipants,
                                statusCallback: config.TWILIO_CALLBACK_URL
                            });

                            //Create a new room in the DB
                            let parseRoom = new BreakoutRoom();
                            parseRoom.set("title", originalChannel.friendlyName);
                            parseRoom.set("conference", conf);
                            parseRoom.set("twilioID", twilioRoom.sid);
                            parseRoom.set("isPrivate", true);
                            parseRoom.set("persistence", "persistent");
                            parseRoom.set("mode", mode);
                            parseRoom.set("capacity", maxParticipants);
                            let socialSpace = new SocialSpace();
                            socialSpace.id = socialSpaceID;
                            parseRoom.set("socialSpace", socialSpace);
                            parseRoom.set("conversation", convo);
                            parseRoom.setACL(convo.getACL(), {useMasterKey: true});
                            parseRoom.set("twilioChatID", sid);
                            await parseRoom.save({}, {useMasterKey: true});

                            attributes.breakoutRoom = parseRoom.id;
                            await config.twilioChat.channels(sid).update({
                                attributes: JSON.stringify(attributes)
                            });

                            //send a message to the chat channel that the user spawned off a video chat
                            config.twilioChat.channels(sid).messages.create({
                                from: profile.id,
                                attributes: JSON.stringify({
                                    linkTo: "breakoutRoom",
                                    path: "/video/" + parseRoom.id
                                }),
                                body: "I just created and joined a video chat",
                            });
                            return {
                                status: "ok",
                                room: parseRoom.id,
                            };
                        }catch(err){
                            let originalChannel = await config.twilioChat.channels(sid).fetch();
                            let attributes = originalChannel.attributes;
                            if (attributes)
                                attributes = JSON.parse(attributes);
                            if(attributes && attributes.breakoutRoom){
                                return {
                                    status: "ok",
                                    room: attributes.breakoutRoom
                                }
                            }
                            console.log(err);
                            return {
                                status: "error",
                                message: "There is already a video room with this name (although it may be private, and you can't see it). Please either join the existing room or pick a new name."
                            }
                        }
                    }
                }
            }
        }
        else{
            //make a new breakout room in this space, then drop a link into the chat to it.
            let mode = "group";
            let maxParticipants = (mode == "peer-to-peer" ? 10 : (mode == "group-small" ? 4 : 50));
            try {

                let twilioRoom = await config.twilio.video.rooms.create({
                    type: mode,
                    uniqueName: roomName,
                    // type: conf.config.TWILIO_ROOM_TYPE,
                    maxParticipants: maxParticipants,
                    statusCallback: config.TWILIO_CALLBACK_URL
                });
                let chat = config.twilio.chat.services(config.TWILIO_CHAT_SERVICE_SID);

                //Create a new room in the DB
                let parseRoom = new BreakoutRoom();
                parseRoom.set("title", roomName);
                parseRoom.set("conference", conf);
                parseRoom.set("twilioID", twilioRoom.sid);
                parseRoom.set("isPrivate", false);
                parseRoom.set("persistence", persistence);
                parseRoom.set("mode", mode);
                parseRoom.set("capacity", maxParticipants);
                let socialSpace = new SocialSpace();
                socialSpace.id = socialSpaceID;
                parseRoom.set("socialSpace", socialSpace);
                let acl = new Parse.ACL();
                acl.setPublicReadAccess(false);
                acl.setPublicWriteAccess(false);
                acl.setRoleReadAccess(conf.id + "-conference", true);

                acl.setRoleReadAccess(conf.id + "-moderator", true);
                parseRoom.setACL(acl, {useMasterKey: true});
                await parseRoom.save({}, {useMasterKey: true});
                let attributes = {
                    category: "breakoutRoom",
                    roomID: parseRoom.id
                }
                let twilioChatRoom = await chat.channels.create({
                    friendlyName: roomName,
                    attributes: JSON.stringify(attributes),
                    type:
                        "public"
                });
                parseRoom.set("twilioChatID", twilioChatRoom.sid);
                await parseRoom.save({},{useMasterKey: true});

                //send a message to the chat channel that the user spawned off a video chat
                config.twilioChat.channels(sid).messages.create({
                    from: profile.id,
                    attributes: JSON.stringify({
                        linkTo: "breakoutRoom",
                        path: "/video/" + profile.get("conference").get("conferenceName") + "/" + roomName
                    }),
                    body: "I just created and joined a video chat",
                });
                return {
                   status: "ok",
                    room: parseRoom.id,
                };
            }catch(err){
                console.log(err);
                return {
                    status: "error",
                    message: "There is already a video room with this name (although it may be private, and you can't see it). Please either join the existing room or pick a new name."
                }
            }
        }
    }
    return null;
});


Parse.Cloud.define("chat-addToSID", async (request) => {
    let confID = request.params.conference;
    let sid = request.params.sid;
    let title = request.params.title;
    let userQ = new Parse.Query(UserProfile);
    let conf = new ClowdrInstance();
    conf.id = confID;
    userQ.equalTo("user", request.user);
    userQ.equalTo("conference", conf);

    let profile = await userQ.first({useMasterKey: true});
    if (profile) {
        //is it a private channel?
        let config = await getConfig(conf);
        let originalChannel = await config.twilioChat.channels(sid).fetch();
        if (originalChannel.type == "private") {
            //Is it a DM or a conversation?
            let attributes =  originalChannel.attributes;
            if(attributes)
                attributes = JSON.parse(attributes);
            if(attributes && (attributes.mode == "directMessage" || attributes.mode == "group")){
                let parseID = attributes.parseID;
                if(parseID){
                    //Validate that this user has access to the convo
                    let convoQ = new Parse.Query(Converation);
                    let convo  = await convoQ.get(parseID, {sessionToken: request.user.getSessionToken()});
                    if(convo){
                        //Now get all of the UIDs from the profileIDs to add
                        let profilesQ = new Parse.Query(UserProfile);
                        let profiles = [];
                        if(request.params.users)
                            profiles = request.params.users.map(u=>{
                            let r = new UserProfile();
                            r.id = u;
                            return r;
                        });
                        profiles= await Parse.Object.fetchAll(profiles, {useMasterKey: true});
                        let acl = convo.getACL();
                        let room;
                        if(attributes.breakoutRoom){
                            let roomQ = new Parse.Query(BreakoutRoom);
                            room = await roomQ.get(attributes.breakoutRoom, {useMasterKey: true});
                        }
                        for(let profile of profiles){
                            //Add to ACL
                            acl.setReadAccess(profile.get("user").id, true);
                            if(room){
                                room.getACL().setReadAccess(profile.get("user").id, true);
                            }
                        }

                        if (room) {
                            await room.save({}, {useMasterKey: true});
                        }

                        if(convo.get("isDM")){
                            convo.set("isDM", false);
                            convo.set("friendlyName", title);
                            attributes.mode='group';
                            await config.twilioChat.channels(sid).update({friendlyName: title,
                                attributes: JSON.stringify(attributes)});
                            console.log("Updated name")
                        }

                        await convo.save({}, {useMasterKey: true});
                        let promises = [];
                        if (request.params.users)
                            for (let uid of request.params.users) {
                                console.log("Adding " + uid + " to " + sid)
                                promises.push(config.twilioChat.channels(sid).members.create({
                                    identity: uid,
                                    roleSid: config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE
                                }).catch(err => console.log));
                            }
                        await Promise.all(promises);

                        return;
                    }
                    else{
                        console.log("User does not have access to convo object")
                    }
                }
            }
            else{
                throw "Unable to find ACL for channel!"
            }
        }
        let promises = [];
        for (let uid of request.params.users) {
            promises.push(config.twilioChat.channels(sid).members.create({
                identity: uid
            }));
        }
        await Promise.all(promises);

    }
    return null;
});

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

Parse.Cloud.define("join-announcements-channel", async (request) => {
    let confID = request.params.conference;
    let userQ = new Parse.Query(UserProfile);
    let conf = new ClowdrInstance();
    conf.id = confID;
    userQ.equalTo("user", request.user);
    userQ.equalTo("conference", conf);

    let profile = await userQ.first({useMasterKey: true});
    if (profile){
        let config = await getConfig(conf);

        //Now find out if we are a moderator or not...
        const accesToConf = new Parse.Query('InstancePermission');
        accesToConf.equalTo("conference", conf);
        let actionQ = new Parse.Query("PrivilegedAction");
        actionQ.equalTo("action","announcement-global");
        accesToConf.matchesQuery("action", actionQ);
        const hasAccess = await accesToConf.first({sessionToken: request.user.getSessionToken()});
        console.log('--> hasAccess: ' + hasAccess);

        let role = config.TWILIO_CHAT_CHANNEL_OBSERVER_ROLE;
        if (hasAccess) {
            role = config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE;
        }
        try {
            let member = await config.twilioChat.channels(config.TWILIO_ANNOUNCEMENTS_CHANNEL).members.create({
                identity: profile.id,
                roleSid: role
            });
            console.log(profile.id + " join directly " + config.TWILIO_ANNOUNCEMENTS_CHANNEL);
        } catch (err) {
            if (err.code == 50403) {
                let newChan = await getBondedChannel(conf, config, config.TWILIO_ANNOUNCEMENTS_CHANNEL);
                let member = await config.twilioChat.channels(newChan).members.create({
                    identity: profile.id,
                    roleSid: role
                });
                console.log(profile.id + " join bonded " + newChan);
            } else {
                console.log(err);
            }
        }

    }
    return null;

});

async function userInRoles(user, allowedRoles) {
    const roles = await new Parse.Query(Parse.Role).equalTo('users', user).find();
    return roles.find(r => allowedRoles.find(allowed => r.get("name") == allowed));
}

Parse.Cloud.define("chat-destroy", async (request) => {
    let confID = request.params.conference;
    let sid = request.params.sid;
    try {
        if (!await userInRoles(request.user, [confID + "-moderator", confID + "-admin", confID + "-manager"])) {
            throw "You are not permitted to delete this chat";
        }
        let conf = new ClowdrInstance();
        conf.id = confID;
        let config = await getConfig(conf);
        await config.twilioChat.channels(sid).remove();
        return {status: "OK"}
    } catch (err) {
        console.log(err);
    }

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
        let chatRoom = await config.twilioChat.channels.create(
            {friendlyName: conversationName, type: visibility,
            attributes: JSON.stringify(attributes)});
        //create the twilio room
        let member = await config.twilioChat.channels(chatRoom.sid).members.create({identity: profile.id,
        roleSid: config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE});

        // let member2 = await config.twilioChat.channels(chatRoom.sid).members.create({identity: messageWith,
        //     roleSid: config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE});


        convo.set("sid", chatRoom.sid);
        await convo.save({},{useMasterKey: true});
        return {"status":"ok",sid:chatRoom.sid};
    }
    return {"status":"error","message":"Not authorized to create channels for this conference"};
});