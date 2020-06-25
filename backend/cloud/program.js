let InstanceConfig = Parse.Object.extend("InstanceConfiguration");
const Twilio = require("twilio");

let BreakoutRoom = Parse.Object.extend("BreakoutRoom");
async function getConfig(conference){
    let configQ = new Parse.Query(InstanceConfig);
    configQ.equalTo("instance", conference);
    let res = await configQ.find({useMasterKey: true});
    let config = {};
    for (let obj of res) {
        config[obj.get("key")] = obj.get("value");
    }
    config.twilio = Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    return config;
}


async function createBreakoutRoomForProgramItem(programItem){
    let config = await getConfig(programItem.get("conference"));

    let mode = "peer-to-peer";
    let maxParticipants = 5;

    let parseRoom = new BreakoutRoom();
    parseRoom.set("title", programItem.get("title"));
    parseRoom.set("conference", programItem.get("conference"));
    parseRoom.set("isPrivate", false);
    parseRoom.set("persistence", "persistent");
    parseRoom.set("mode", mode);
    parseRoom.set("capacity", maxParticipants);
    let acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleReadAccess(programItem.get("conference").id+"-conference", true);
    parseRoom.setACL(acl);

    parseRoom.set("socialSpace", programItem.get("programSession").get("room").get("socialSpace"))
    parseRoom = await parseRoom.save({}, {useMasterKey: true});
    programItem.set("breakoutRoom", parseRoom);
    await programItem.save({},{useMasterKey: true})
}

Parse.Cloud.beforeSave("ProgramItem", async (request) => {
    //Check to make sure that we don't need to make a video room for this
    let programItem = request.object;
    // if (programItem.isNew() && !programItem.get("breakoutRoom")) {
    //     let track = programItem.get("track");
    //     track = await track.fetch({useMasterKey: true});
    //     if (track && track.get("perProgramItemVideo")) {
    //         //Create a breakoutroom for this program item
    //         await createBreakoutRoomForProgramItem(programItem, track);
    //     }
    // }
});

Parse.Cloud.beforeSave("ProgramTrack", async (request) => {
    let track = request.object;
    if (track.dirty("perProgramItemVideo")) {
        if (track.get("perProgramItemVideo")) {
            let itemQ = new Parse.Query("ProgramItem");
            itemQ.equalTo("track", track);
            itemQ.include("programSession.room");
            itemQ.limit(1000);
            let items = await itemQ.find({useMasterKey: true});
            let promises = [];
            for(let item of items){
                if(!item.get("programSession")){
                    console.log("No session for item in track: " + item.id)
                    continue;
                }
                console.log(item.get("programSession").get("room"))
                if(!item.get("breakoutRoom")){
                    promises.push(createBreakoutRoomForProgramItem(item, track));
                }
            }
            await Promise.all(promises);
        } else {
            // TODO Make sure no tracks have breakout rooms still...
        }
    }
});