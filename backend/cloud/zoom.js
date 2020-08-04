let UserProfile = Parse.Object.extend("UserProfile");
let Converation = Parse.Object.extend("Conversation");
let ClowdrInstance = Parse.Object.extend("ClowdrInstance");
let InstanceConfig = Parse.Object.extend("InstanceConfiguration");
let BondedChannel = Parse.Object.extend("BondedChannel");
let TwilioChannelMirror = Parse.Object.extend("TwilioChannelMirror");
let BreakoutRoom = Parse.Object.extend("BreakoutRoom");
let SocialSpace = Parse.Object.extend("SocialSpace");
let MeetingRegistration = Parse.Object.extend("MeetingRegistration");
const axios = require('axios');
var moment = require('moment');
var jwt = require('jsonwebtoken');

const Twilio = require("twilio");
const crypto = require('crypto');

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
function generateSignature(apiKey, apiSecret, meetingNumber, role) {

    // Prevent time sync issue between client signature generation and zoom
    const timestamp = new Date().getTime() - 30000
    const msg = Buffer.from(apiKey + meetingNumber + timestamp + role).toString('base64')
    const hash = crypto.createHmac('sha256', apiSecret).update(msg).digest('base64')
    const signature = Buffer.from(`${apiKey}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64')

    return signature
}

Parse.Cloud.define("zoom-getSignatureForMeeting", async (request) => {
    let confID = request.params.conference;
    let userQ = new Parse.Query(UserProfile);
    let conf = new ClowdrInstance();
    conf.id = confID;
    userQ.equalTo("user", request.user);
    userQ.equalTo("conference", conf);

    let profile = await userQ.first({useMasterKey: true});
    if(profile) {
        let config = await getConfig(conf);
        let sig = generateSignature(config.ZOOM_API_KEY, config.ZOOM_API_SECRET, request.params.meeting, 0);
        return {signature: sig, apiKey: config.ZOOM_API_KEY};

    }
    return null;
});
Parse.Cloud.define("zoom-refresh-start-url", async (request) => {
    let roomID = request.params.room;
    let roomQ = new Parse.Query("ZoomRoom");
    console.log(roomID)
    console.log(request.user.getSessionToken())
    let room = await roomQ.get(roomID,{sessionToken: request.user.getSessionToken()});
    if(room) {
        let config = await getConfig(room.get("conference"));

        const payload = {
            iss: config.ZOOM_API_KEY,
            exp: ((new Date()).getTime() + 5000)
        };
        const token = jwt.sign(payload, config.ZOOM_API_SECRET);
        let res = await axios({
            method: 'get',
            url: 'https://api.zoom.us/v2/meetings/' + room.get("meetingID"),
            headers: {
                'Authorization': 'Bearer ' + token,
                'User-Agent': 'Zoom-api-Jwt-Request',
                'content-type': 'application/json'
            }
        });
        room.set("start_url", res.data.start_url);
        room.set("start_url_expiration", moment().add(2, "hours").toDate());
        await room.save({},{useMasterKey: true});

        return {start_url: room.get("start_url")};

    }
    return null;
});
async function userInRoles(user, allowedRoles) {
    const roles = await new Parse.Query(Parse.Role).equalTo('users', user).find();
    return roles.find(r => allowedRoles.find(allowed =>  r.get("name") == allowed)) ;
}
Parse.Cloud.define("zoom-meeting-register", async (request) => {
    let roomID = request.params.room;
    let roomQ = new Parse.Query("ZoomRoom");
    let room = await roomQ.get(roomID, {useMasterKey: true});
    if (room) {
        if (!userInRoles(request.user, [room.get("conference").id + "-conference"])) {
            throw "You are not registered to attend this conference";
        }
        let joinURL = undefined;
        let registrantID = undefined;
        if (room.get("requireRegistration")) {
            let config = await getConfig(room.get("conference"));

            const payload = {
                iss: config.ZOOM_API_KEY,
                exp: ((new Date()).getTime() + 5000)
            };
            const token = jwt.sign(payload, config.ZOOM_API_SECRET);
            try {
                let res = await axios({
                    method: 'post',
                    url: 'https://api.zoom.us/v2/meetings/' + room.get("meetingID") + "/registrants",
                    data: {
                        email: request.user.getEmail(),
                        first_name: request.user.get("displayname")
                    },
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'User-Agent': 'Zoom-api-Jwt-Request',
                        'content-type': 'application/json'
                    }
                });
                console.log(res.data);
                joinURL = res.data.join_url;
                registrantID = res.data.registrant_id;
            } catch (err) {
                console.log(err);
                throw err;
            }
        }
        else{
            joinURL = room.get("join_url")
        }
        let reg = new MeetingRegistration();
        reg.set("link", joinURL);
        reg.set("registrantID", registrantID);
        reg.set("meetingID", room.get("meetingID"));
        reg.set("conference", room.get("conference"));
        let acl = new Parse.ACL();
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        acl.setReadAccess(request.user, true);
        reg.setACL(acl);
        await reg.save({}, {useMasterKey: true});


        return {join_url: joinURL};

    }
    return null;
});
