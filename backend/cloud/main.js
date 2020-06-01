// import Parse from "parse";

var jwt = require('jsonwebtoken');

Parse.Cloud.define("decodeSlackToken", async (request) => {
    const token = request.params.token;
    let payload = jwt.verify(token, process.env.CLOWDR_JWT_KEY);
    //
    return payload;
});

Parse.Cloud.define("loginFromToken", async (request) => {
    const userRe = request.params.user;
    let id = request.params.id;
    let authData = {
        id: id,
        user: userRe
    };
    let userQ = new Parse.Query(Parse.User);
    let user = await userQ.get(userRe, {useMasterKey: true});
    if (user.get('loginKey') == id) {
        //OK!
        console.log("OK ok!")
        // let newSession = new Parse.Session();
        // newSession.set("user", user, {useMasterKey:true});
        // newSession.set("createdWith",{action: "login", "authProvider":"clowdr"});
        // newSession.set("expiresAt",moment().add("8","hours").toDate());
        // let sess = await newSession.save(null, {useMasterKey: true});
        //make a new session
        let userQ = new Parse.Query(Parse.User);
        let normalUser = await userQ.get(userRe);

        let loggedin = await user.linkWith("anonymous", {authData: authData}, {useMasterKey: true});
        // console.log(loggedIn.getSessionToken());
        // return loggedIn.getSessionToken();
        return loggedin;
    }
    return user.get("authData");
});