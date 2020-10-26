// tslint:disable:no-console

const Parse = require("parse/node");
const assert = require("assert");
const Twilio = require("twilio");

const conferenceId = "Fg87OIFxJo";

async function renderMessages(conference, messages, profilesMap) {
    return messages.map(message => {
        const reactions = JSON.parse(message.attributes).reactions ?? {};
        return {
            index: message.index,
            dateCreated: message.dateCreated,
            from: profilesMap.get(message.from) ?? "<Unknown or System>",
            body: message.body,
            reactions: Object.keys(reactions).map(reaction => ({
                reaction,
                reactors: reactions[reaction].map(reactor => profilesMap.get(reactor))
            }))
        };
    });
}

async function main() {
    assert(process.env.REACT_APP_PARSE_APP_ID, "REACT_APP_PARSE_APP_ID not provided.");
    assert(process.env.REACT_APP_PARSE_JS_KEY, "REACT_APP_PARSE_JS_KEY not provided.");
    assert(process.env.REACT_APP_PARSE_DATABASE_URL, "REACT_APP_PARSE_DATABASE_URL not provided.");

    Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
    Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

    const conference = new Parse.Object("Conference", { id: conferenceId });

    const configQ = new Parse.Query("ConferenceConfiguration");
    configQ.equalTo("conference", conference);
    let res = await configQ.find({ useMasterKey: true });
    let config = {};
    for (let obj of res) {
        config[obj.get("key")] = obj.get("value");
    }
    const twilioClient = Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    const twilioChatService = twilioClient.chat.services(config.TWILIO_CHAT_SERVICE_SID);

    const contentFeedChats =
        (await new Parse.Query("ContentFeed")
            .equalTo("conference", conference)
            .include("textChat")
            .include("videoRoom")
            .include("videoRoom.textChat")
            .map(async feed => {
                if (feed.get("textChat")) {
                    return { feed, textChat: feed.get("textChat"), messages: [] };
                }
                if (feed.get("videoRoom")) {
                    const vidRoom = feed.get("videoRoom");
                    if (vidRoom.get("textChat")) {
                        return { feed, textChat: vidRoom.get("textChat"), messages: [] };
                    }
                }
                return null;
            }, { useMasterKey: true }))
            .filter(x => !!x && !!x.textChat.get("twilioID"));
    console.log(`Found ${JSON.stringify(contentFeedChats.length, null, 2)} content-feed chats.`);

    let idx = 0;
    const results = [];
    for (let feedChat of contentFeedChats) {
        const channelSID = feedChat.textChat.get("twilioID");
        const channel = await twilioChatService.channels(channelSID).fetch();
        let messages;
        if (channel.messagesCount > 0) {
            messages = await channel.messages().list({ limit: 10000 });
        }
        else {
            messages = [];
        }
        console.log(`(${(Math.round(1000 * idx / contentFeedChats.length) / 10).toPrecision(3).padStart(" ", 4)}%) ${channelSID}: ${messages.length}`);
        results.push({
            ...feedChat,
            messages
        });
        idx++;
    }
    
    const profiles =
        await new Parse.Query("UserProfile")
            .equalTo("conference", conference)
            .map(profile => ([
                profile.id,
                profile.get("displayName")
            ]), { useMasterKey: true });
    const profilesMap = new Map(profiles);

    const outputs = await Promise.all(
        results
            .map(async feedChat => ({
                name: feedChat.feed.get("name"),
                messages: await renderMessages(conference, feedChat.messages, profilesMap)
            })));

    console.log("--------------------------------------");
    console.log(JSON.stringify(outputs));
}

main();
