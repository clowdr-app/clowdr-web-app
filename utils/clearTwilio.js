const fs = require("fs");
const Parse = require("parse/node");
let ClowdrInstance = Parse.Object.extend("ClowdrInstance");
require('dotenv').config()

let InstanceConfig = Parse.Object.extend("InstanceConfiguration");
const Twilio = require("twilio");

console.log(process.env.TWILIO_CHAT_SERVICE_SID)
console.log(process.env.TWILIO_AUTH_TOKEN);
Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = 'https://parseapi.back4app.com/'
// const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
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
        config.TWILIO_CALLBACK_URL = "https://clowdr.herokuapp.com/twilio/event"
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

async function fixUsers() {
    let confQ = new Parse.Query(ClowdrInstance);
    confQ.equalTo("conferenceName", "ICSE 2020")
    return confQ.find({useMasterKey: true}).then(async (confs) => {
        for (let conf of confs) {
            let config = await getConfig(conf);
            // config.twilioChat.remove();
        }
    });
}

fixUsers();
// markUsersAsOnline();