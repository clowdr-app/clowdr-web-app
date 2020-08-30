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
async function getConfig(conference) {
    let configQ = new Parse.Query(InstanceConfig);
    configQ.equalTo("instance", conference);
    // configQ.cache(60);
    let res = await configQ.find({ useMasterKey: true });
    let config = {};
    for (let obj of res) {
        config[obj.get("key")] = obj.get("value");
    }
    config.twilio = Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    config.twilioChat = config.twilio.chat.services(config.TWILIO_CHAT_SERVICE_SID);

    if (!config.TWILIO_CHAT_SERVICE_SID) {
        if (!config.twilio)
            config.twilio = Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

        let newChatService = await config.twilio.chat.services.create({ friendlyName: 'clowdr_chat' });
        let tokenConfig = new InstanceConfig();
        tokenConfig.set("value", newChatService.sid);
        tokenConfig.set("key", "TWILIO_CHAT_SERVICE_SID");
        tokenConfig.set("instance", conference);
        await tokenConfig.save({}, { useMasterKey: true });
        config.TWILIO_CHAT_SERVICE_SID = newChatService.sid;

    }

    if (!config.TWILIO_CALLBACK_URL) {
        config.TWILIO_CALLBACK_URL = "https://clowdr.herokuapp.com/twilio/event"
    }
    if (!config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE) {
        let role = await config.twilioChat.roles.create({
            friendlyName: 'clowdrAttendeeManagedChatParticipant',
            type: 'channel',
            permission: ['addMember', 'deleteOwnMessage', 'editOwnMessage', 'editOwnMessageAttributes', 'inviteMember', 'leaveChannel', 'sendMessage', 'sendMediaMessage',
                'editChannelName', 'editChannelAttributes']
        })
        let newConf = new InstanceConfig();
        newConf.set("instance", conference);
        newConf.set("key", "TWILIO_CHAT_CHANNEL_MANAGER_ROLE");
        newConf.set("value", role.sid);
        await newConf.save({}, { useMasterKey: true });
        config.TWILIO_CHAT_CHANNEL_MANAGER_ROLE = role.sid;
    }
    if (!config.TWILIO_CHAT_CHANNEL_OBSERVER_ROLE) {
        let role = await config.twilioChat.roles.create({
            friendlyName: 'clowdrChatObserver',
            type: 'channel',
            permission: ['deleteOwnMessage']
        })
        let newConf = new InstanceConfig();
        newConf.set("instance", conference);
        newConf.set("key", "TWILIO_CHAT_CHANNEL_OBSERVER_ROLE");
        newConf.set("value", role.sid);
        await newConf.save({}, { useMasterKey: true });
        config.TWILIO_CHAT_CHANNEL_OBSERVER_ROLE = role.sid;
    }
    if (!config.TWILIO_ANNOUNCEMENTS_CHANNEL) {
        let attributes = {
            category: "announcements-global",
        }
        let chatRoom = await config.twilioChat.channels.create(
            {
                friendlyName: "Announcements", type: "private",
                attributes: JSON.stringify(attributes)
            });
        let newConf = new InstanceConfig();
        newConf.set("instance", conference);
        newConf.set("key", "TWILIO_ANNOUNCEMENTS_CHANNEL");
        newConf.set("value", chatRoom.sid);
        await newConf.save({}, { useMasterKey: true });
        config.TWILIO_ANNOUNCEMENTS_CHANNEL = chatRoom.sid;
    }
    return config;
}

async function fixUsers() {
    let confQ = new Parse.Query(ClowdrInstance);
    confQ.equalTo("conferenceName", "ICFP 2020")
    return confQ.find({ useMasterKey: true }).then(async (confs) => {
        for (let conf of confs) {
            let config = await getConfig(conf);
            // config.twilioChat.remove();
            console.log(conf.id)
            let roomQ = new Parse.Query("ProgramRoom");
            roomQ.limit(500);
            roomQ.equalTo("conference", conf);
            let rooms = await roomQ.find({ useMasterKey: true });
            // let validSpaces = rooms.map(room=>room.get("socialSpace").id);
            let spaceQ = new Parse.Query("SocialSpace");
            spaceQ.limit(500);
            spaceQ.equalTo("conference", conf);
            let spaces = await spaceQ.find({ useMasterKey: true });
            // for(let space of spaces){
            // if(!validSpaces.includes(space.id)){
            //     console.log(space.id+"\t"+space.get("name"))
            //     await space.destroy({useMasterKey: true})
            // }
            // try {
            //     let chan = await config.twilioChat.channels(space.get("chatChannel")).fetch();
            //     console.log(chan.sid + "\t" + chan.uniqueName);
            // }catch(err){
            //     console.error(err);
            //     space.set("chatChannel",null);
            //     await space.save({},{useMasterKey: true});
            // }
            // }
            let validSpaces = spaces.map(space => space.id);
            let channels = []; //await config.twilioChat.channels.list({limit: 200});
            // config.twilioChat.channels.each(async (channel)=> {
            //     if(channel.uniqueName && channel.uniqueName.startsWith("socialSpace")) {
            //         let id = channel.uniqueName.replace("socialSpace-", "");
            //         if (!validSpaces.includes(id)) {
            //             console.log(channel.sid + "\t" + channel.friendlyName + "\t" + channel.uniqueName); //+"\t"+id)
            //             // await channel.remove();
            //         }
            //     }
            // })
            channels = ["CH565805c34f7745e18309b988a45cf63d", "CH56bf07163ab24375b7b902a5446d8187", "CH597cc14b94d141f9adee6d0d5b822699", "CH61252f4047814ca597831f918d3b3247", "CH683372cda9964cfd936d726c4c9c6c7a", "CH69740ca1825244129003a398a1447b29", "CH750fdfa3292b476a90a80b5e61f1b746", "CH774a7499ae794d9199dae4442e948cd9", "CH7ba65cf080804778b8da10d748b62326", "CH7c6b86d2f58b47cebd3dcd23bcce45ac", "CH7c7e92dfff6243dfbd66622372a02949", "CH811bcd9175e448a3a9ec7a47cd86adc4", "CH82b09e2a150f48119760437914217e85", "CH82e47e76b28f429b96a83fb30afdac1e", "CH849bb6ff1cbe4d7eb3dd725a68752a83", "CH84a40c0c92fb4f28a6df2cd5f7e10f7f", "CH8608b4d09f6a44e3a759f41151d09282", "CH8d6d6603d38048ada79aaf139beb6a89", "CH8d94c1c8d71f46acb63c59d078776ec5", "CH8dd639d23c274393a95da347e30607d6", "CH99194db1018748e0b8df5b3ebf3b79b4", "CH99cc2327bbc4475e98707107770df86b", "CH9a057387687b44be8377dcd399ef47a7", "CH9dd519b6086449cfb97ce302b4955750", "CH9fdf0a0b69c74d77be2887254d18fb20", "CHa092a78bb4714fb5bc52d7c07b1eb264", "CHa6197e541bee4686bb7ac8be142cc71d", "CHa6ae402690a14c548cbbabfeff64fe26", "CHa6f5a80b3b6141c2b61aaf7ea94f399e", "CHa9716464d23a41cda71c820c3ae8aef0", "CHadfacdc624b54b00a8c5e9b4a417d31f", "CHb027fd6639434a94b22a10cceca6bfee", "CHb405c52c41f04b90901d42fdaf48bc97", "CHb9501b99174e49399c7b565b2df74c25", "CHbefb593c28414166970030a38600dbf9", "CHc941749c8f9d4646940ae93f91a2fab5", "CHcb1b8137a2e34f0babdb82b88a80ddf2", "CHcd94035494ce4a6397812c8516ae228b", "CHced349199f7d47758ad94a436ad829c5", "CHcefab737b6384ee79bc9a6fd1ef00542", "CHcf20a78e2eba4f8f9c5c453a63f2eefe", "CHd3275249033b44709254d658304bd356", "CHd6b2633773d241a991a5c14ea9d75236", "CHd72a2c8d4f6e44c38f9d12f9cc74462c", "CHd9937418ed2044d1b2632d073ef172a2", "CHdb8d3426f4bd47a7ba15be911fa4054d", "CHdcbe31a0add344b48bed4b1241bee23f", "CHdeac46f2feeb478395a2f6289c20e961", "CHe06213cdea6c480f94c031e078cd4b5d", "CHe08117831bff419e92e7f92d441cafbf", "CHe328ef6fac2043b09fbaacece8449eac", "CHe49504342e554b0cb2087b3fcdaa3c5e", "CHe7cff4bbf28d4602ada09b114b5e1ff6", "CHefe8ccf7f07a407e82ee5c2523bf7b2f", "CHfbabf7facc284ab6a9dffe71a62bf58d"]
            // let validSIDs = channels.map(channel=>channel.sid);
            // console.log(channels.hasNextPage)
            for (let channel of channels) {
                // if(channel.uniqueName && channel.uniqueName.startsWith("socialSpace")){
                //     let id= channel.uniqueName.replace("socialSpace-","");
                // if(!validSpaces.includes(id)){
                //     console.log(channel.sid +"\t"+channel.friendlyName + "\t"+channel.uniqueName); //+"\t"+id)
                await config.twilioChat.channels(channel).remove();
                // }else{
                //     let space = spaces.find(space => space.id === id);
                //     if(space.get("chatChannel") !== channel.sid){
                //         console.log("Mismatch on " + space.get("chatChannel"))
                //     }
                //     else{
                //         console.log("OK: " + space.get("name"))
                //     }
                // }
                // }
            }
            // for(let space of spaces){
            //     if (!space.get("chatChannel")
            //         // || !validSIDs.includes(space.get("chatChannel"))
            //         ) {
            //         console.log("No chat for " + space.id + "\t"+space.get("title"))
            //         let chat = config.twilioChat;
            //         try {
            //             let twilioChatRoom = await chat.channels.create({
            //                 friendlyName: space.get("name"),
            //                 uniqueName: "socialSpace-" + space.id,
            //                 type: "public",
            //                 attributes: JSON.stringify({
            //                     category: "socialSpace",
            //                     isGlobal: true,
            //                     spaceID: space.id
            //                 })
            //             });
            //             space.set("chatChannel", twilioChatRoom.sid);
            //             await space.save({}, {useMasterKey: true});
            //         }catch(err){
            //             console.log("Unble to create chat channel for channel: socialSpace-"+space.id)
            //             console.error(err);
            //             console.trace();
            //         }
            //
            // //         console.log('[init]: chat channel is ' + space.get('chatChannel'));
            //     }
            // }
        }
    });
}

fixUsers();
// markUsersAsOnline();
