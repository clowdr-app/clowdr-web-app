const fs = require("fs");
const Parse = require("parse/node");
const config = require('../server/config');


console.log(process.env.TWILIO_CHAT_SERVICE_SID)
console.log(process.env.TWILIO_AUTH_TOKEN);
Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = 'https://parseapi.back4app.com/'
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels.list().then(function (channels) {
    if (channels) {
        channels.forEach(async (channel) => {
            console.log(channel);
            await channel.remove();
            client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels.create({uniqueName: "general"}).then(async (chan)=>{
                let User = Parse.Object.extend("User");

                let queryForJon = new Parse.Query(User);
                queryForJon.equalTo("username","jon@jonbell.net");
                let jon = await queryForJon.first();
                let queryForOther = new Parse.Query(User);
                queryForOther.equalTo("username","bellj@gmu.edu");
                let other = await queryForOther.first();
                console.log("Made a channel");
                await chan.messages().create({body: "Welcome to CLOWDR! Feel free to play around, this chat supports *basic* markdown and smilies. If you want, you can also delete a message after posting it by hovering over and clicking the 'X'. Create a new channel by hovering over the tools icon.",from: jon.id+":"+jon.get("displayname")});
                await chan.messages().create({body: "Wow, even I have to admit that this is pretty cool, even if it's basically a rip-off of slack, facebook messenger, youtube live and twitch!",from: other.id+":"+other.get("displayname")});
            }).catch((err)=>{
                console.log(err);
            });
        });
    }
    // for (let i = 0; i < paginator.items.length; i++) {
    //     const channel = paginator.items[i];
    //     console.log('Channel: ' + channel.friendlyName);
    // }
});
client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels.create({uniqueName: "general"}).then(async (chan)=>{
    let User = Parse.Object.extend("User");

    let queryForJon = new Parse.Query(User);
    queryForJon.equalTo("username","jon@jonbell.net");
    let jon = await queryForJon.first();
    let queryForOther = new Parse.Query(User);
    queryForOther.equalTo("username","bellj@gmu.edu");
    let other = await queryForOther.first();
    console.log("Made a channel");
    await chan.messages().create({body: "Welcome to CLOWDR! Feel free to play around, this chat supports *basic* markdown and smilies. If you want, you can also delete a message after posting it by hovering over and clicking the 'X'. Create a new channel by hovering over the tools icon.",from: jon.id+":"+jon.get("displayname")});
    await chan.messages().create({body: "Wow, even I have to admit that this is pretty cool, even if it's basically a rip-off of slack, facebook messenger, youtube live and twitch!",from: other.id+":"+other.get("displayname")});
}).catch((err)=>{
    console.log(err);
});