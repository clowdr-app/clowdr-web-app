const fs = require("fs");
const Parse = require("parse/node");
require('dotenv').config()
var request = require('request');

Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = 'https://parseapi.back4app.com/'

let data = JSON.parse(fs.readFileSync("data/confero.json"));
function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
let i = 0;
data.People.forEach(async (person) => {
    if (person.URLphoto) {
        i++;
        // usersRef.child("demo" + i).set({
        //     email: "demo@no-reply.com",
        //     username: person.Name,
        //     photoURL: person.URLphoto
        // });
        try {
            let name = person.URLphoto.substring(person.URLphoto.lastIndexOf("/") + 1);
            var file = new Parse.File(name, { uri: person.URLphoto });
            var res = await file.save();
            console.log(res);
        } catch (err) {
            console.error(err);
        }
        let user = new Parse.User();
        let fakeEmail = "demo" + i + "@no-reply.com" + Math.random();
        user.set("profilePhoto", file);
        user.set("username", fakeEmail);
        user.set("displayname", person.Name);
        user.set("password", fakeEmail + i + Math.random());
        user.set("email", fakeEmail);

        try {
            await user.signUp();
            let Status = Parse.Object.extend("UserStatus");
            let status = new Status();
            status.set("user", user);
            await status.save();
            user.set("status", status);
            await user.save();
        } catch (err) {
            console.error(err);
        }
        await sleep(100);
    }

})
