const Papa = require('./papaparse.min');
const sgMail = require('sendgrid').mail;
const crypto = require('crypto');
const moment = require("moment");
var jwt = require('jsonwebtoken');

let SlackHomeBlocks = Parse.Object.extend("SlackHomeBlocks");
let ClowdrInstance = Parse.Object.extend("ClowdrInstance");
let ClowdrInstanceAccess = Parse.Object.extend("ClowdrInstanceAccess");

let InstanceConfig = Parse.Object.extend("InstanceConfiguration");
let BreakoutRoom = Parse.Object.extend("BreakoutRoom");
let PrivilegedAction = Parse.Object.extend("PrivilegedAction");
var InstancePermission = Parse.Object.extend("InstancePermission");
let LiveActivity = Parse.Object.extend("LiveActivity");
let Channel = Parse.Object.extend("Channel");
let UserProfile = Parse.Object.extend("UserProfile");

Parse.Cloud.define("registrations-upload", (request) => {
    console.log('Request to upload registration data');
    const data = request.params.content;
    const conferenceID = request.params.conference;

    var Registration = Parse.Object.extend("Registration");
    var rquery = new Parse.Query(Registration);
    rquery.equalTo("conference", conferenceID);
    rquery.limit(10000);
    rquery.find().then(existing => {
        let toSave = [];
        
        rows = Papa.parse(data, {header: true});
        rows.data.forEach(element => {
            addRow(element, conferenceID, existing, toSave);
        });

        Parse.Object.saveAll(toSave)
        .then (res => console.log("[Registrations]: Done saving all registrations"))
        .catch(err => console.log(err))
        
    }).catch(err => console.log('[Registrations]: Problem fetching registrations ' + err));

});

function addRow(row, conferenceID, existing, toSave) {
    if (row.email) {
        if (validateEmail(row.email)) {
            if (!existing.find(r => r.get("email") == row.email)) {
                var Registration = Parse.Object.extend("Registration");
                var reg = new Registration();
                reg.set("email", row.email);
                reg.set("name", row["first"] + " " + row["last"]);
                reg.set("passcode", row.code);
                reg.set("affiliation", row.affiliation);
                reg.set("country", row.country);
                reg.set("conference", conferenceID);
                toSave.push(reg);
            }
            else
                console.log('[Registrations]: Skipping existing registration for ' + row.email);
        }
        else
            console.log("[Registrations]: Invalid email " + row.email);
    }
}

function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

var conferenceInfoCache = {};

async function getConferenceInfoForMailer(conf) {
    if (!conferenceInfoCache[conf.id]) {
        console.log(conf)
        let keyQuery = new Parse.Query(InstanceConfig);
        keyQuery.equalTo("instance", conf);
        keyQuery.equalTo("key", "SENDGRID_API_KEY");
        let frontendURLQuery = new Parse.Query(InstanceConfig);
        frontendURLQuery.equalTo("instance", conf);
        frontendURLQuery.equalTo("key", "FRONTEND_URL");

        let compoundQ = Parse.Query.or(keyQuery, frontendURLQuery);

        compoundQ.include("instance");
        let config = await compoundQ.find({useMasterKey: true});
        let sgKey = null, confObj = null, frontendURL = null;
        console.log(config)
        for (let res of config) {
            console.log(res.get("key"))
            if (res.get("key") == "SENDGRID_API_KEY") {
                sgKey = res.get("value");
                confObj = res.get("instance");
            } else if (res.get("key") == "FRONTEND_URL") {
                frontendURL = res.get("value");
            }
        }
        let info = {
            conference: confObj,
            sendgrid: sgKey,
            frontendURL: frontendURL
        };
        conferenceInfoCache[conf.id] = info;
    }
    return conferenceInfoCache[conf.id];
}
function generateRandomString(length) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(length,
            function (err, buffer) {
                if (err) {
                    return reject(err);
                }
                var token = buffer.toString('hex');
                return resolve(token);
            });
    })
}
function joinURL(baseURL, path){
    if(baseURL.endsWith("/")){
        baseURL = baseURL.substring(0, baseURL.lastIndexOf("/") - 1);
    }
    return baseURL + path;
}
Parse.Cloud.define("login-fromToken", async (request) => {
    let userID = request.params.userID;
    let token = request.params.token;
    let userQ = new Parse.Query(Parse.User);
    let user = await userQ.get(userID, {useMasterKey: true});
    if (user.get("loginKey") && user.get('loginKey') == token) {
        user.set("loginKey",null);
        await user.save({},{useMasterKey: true});
        let fakeSession = Parse.Object.extend("_Session");
        let newSession = new fakeSession();
        // console.log(user)
        newSession.set("user", user);
        newSession.set("createdWith", {action: "login", "authProvider": "clowdr"});
        newSession.set("restricted", false);
        newSession.set("expiresAt", moment().add("1", "year").toDate());
        newSession.set("sessionToken", "r:" + await generateRandomString(24))
        newSession = await newSession.save({}, {useMasterKey: true});
        return {
            token: newSession.getSessionToken()
        };
    }

});

Parse.Cloud.define("login-resendInvite", async (request) => {
    let userID = request.params.userID;
    let userQ = new Parse.Query(Parse.User);
    let confID = request.params.confID;
    let confQ = new Parse.Query(ClowdrInstance);
    confQ.equalTo("conferenceName", confID);
    let conf = await confQ.first();

    let user = await userQ.get(userID, {useMasterKey: true});
    if (!user.get("passwordSet")) {
        if(!user.get("loginKey")){
            let authKey = await generateRandomString(48);
            user.set("loginKey", authKey);
            user.set("loginExpires", moment().add("60", "days").toDate());
            await user.save({},{useMasterKey: true})
        }
        var fromEmail = new sgMail.Email('welcome@clowdr.org');
        let config = await getConferenceInfoForMailer(conf);

        let instructionsText = "The link below will let you set a password and finish creating your account " +
            "at Clowdr.org for " + config.conference.get("conferenceName") + "\n" + joinURL(config.frontendURL, "/finishAccount/" + user.id + "/" + conf.id + "/" + user.get("loginKey"));

        var toEmail = new sgMail.Email(user.get("email"));
        var subject = 'Account signup link for ' + config.conference.get("conferenceName");
        var content = new sgMail.Content('text/plain', 'Dear ' + user.get("displayname") + ",\n" +
            config.conference.get("conferenceName") + " is using Clowdr.org to provide an interactive virtual conference experience. " +
            "The Clowdr app will organize the conference program, live sessions, networking, and more. "
            + instructionsText + "\n\n" +
            "Please note that Chrome, Safari and Edge provide the best compatability with CLOWDR. We are working to improve " +
            "compatability with other browsers and to continue to add new features to the platform\n\n" +
            "If you have any problems accessing the conference site, please reply to this email.\n\n" +
            "Best regards,\n" +
            "Your Virtual " + config.conference.get("conferenceName") + " team");
        var mail = new sgMail.Mail(fromEmail, subject, toEmail, content);

        var sg = require('sendgrid')(config.sendgrid);
        var request = sg.emptyRequest({
            method: 'POST',
            path: '/v3/mail/send',
            body: mail.toJSON()
        });
        sg.API(request);

        return {
            status: "OK"
        };
    } else {
        throw "Your account has already been set up. Please sign in with your email and password.";
    }

});
Parse.Cloud.define("reset-password", async (request) => {
    let email = request.params.email;
    let confID = request.params.confID;
    let userQ = new Parse.Query(Parse.User);
    userQ.equalTo("email", email);
    let profileQ = new Parse.Query(UserProfile);
    profileQ.matchesQuery("user", userQ);

    let confQ = new Parse.Query(ClowdrInstance);
    confQ.equalTo("conferenceName", confID);
    let conf = await confQ.first();
    console.log(conf)
    profileQ.equalTo("conference", conf);
    profileQ.include("user");
    profileQ.include("conference");
    let profile = await profileQ.first({useMasterKey: true});
    let config = await getConferenceInfoForMailer(conf);
    if(profile){
        var fromEmail = new sgMail.Email('welcome@clowdr.org');

        let authKey = await generateRandomString(48);
        let user = profile.get("user");
        user.set("loginKey", authKey);
        user.set("loginExpires", moment().add("1", "hour").toDate());
        await user.save({},{useMasterKey: true});

        let link = joinURL(config.frontendURL, "/resetPassword/" + user.id + "/" + authKey);
        var toEmail = new sgMail.Email(user.getEmail());
        var subject = 'Password reset for ' + config.conference.get("conferenceName");
        var content = new sgMail.Content('text/plain', 'Dear ' + profile.get("displayName") + ",\n" +
            "To reset your password, please visit this address within the next hour: "
            + link+ "\n\n" +
            "If you have any problems accessing the conference site, please reply to this email.\n\n" +
            "Best regards,\n" +
            "Your Virtual " + config.conference.get("conferenceName") + " team");
        var mail = new sgMail.Mail(fromEmail, subject, toEmail, content);

        var sg = require('sendgrid')(config.sendgrid);
        var request = sg.emptyRequest({
            method: 'POST',
            path: '/v3/mail/send',
            body: mail.toJSON()
        });

        sg.API(request, function (error, response) {
            if (error) {
                console.log('Error response received');
            }
            console.log(response.statusCode);
            console.log(response.body);
            console.log(response.headers);
        });

    return {status:"OK", message: "Please check your email for instructions to finish resetting your password."}
    }
    else{
        return {status: "error", message: "The email address '" + email + "' is not a valid email for this conference. Please" +
                " make sure that you are using the email address that you used to register for " + config.conference.get("conferenceName")+"."}
    }
});

Parse.Cloud.define("registrations-inviteUser", async (request) => {
    let regIDs = request.params.registrations;
    let confID = request.params.conference;

    console.log('--> ' + JSON.stringify(regIDs));
    let regQ = new Parse.Query("Registration");
    regQ.containedIn("objectId", regIDs);
    regQ.withCount();
    regQ.limit(1000);
    let {count, results} = await regQ.find();
    let registrants = results;
    let nRetrieved = results.length;
    while (nRetrieved < count) {
        // totalCount = count;
        let regQ = new Parse.Query("Registration");
        regQ.containedIn("objectId", regIDs);
        regQ.limit(1000);
        regQ.skip(nRetrieved);
        let results = await regQ.find({useMasterKey: true});
        // results = dat.results;
        nRetrieved += results.length;
        if (results)
            registrants = registrants.concat(results);
    }


    let promises = [];

    let fauxConf = new ClowdrInstance();
    fauxConf.id = confID;
    let config = await getConferenceInfoForMailer(fauxConf);
    var fromEmail = new sgMail.Email('welcome@clowdr.org');

    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo("name", confID + "-conference");
    let role = await roleQuery.first({useMasterKey: true});

    for (let registrant of registrants) {

        try {
            let userQ = new Parse.Query(Parse.User);
            userQ.equalTo("email", registrant.get("email"));
            let user = await userQ.first({useMasterKey: true});
            let createdNewUser = false;
            let createdNewProfile = false;
            let instructionsText = "";
            if (!user) {
                createdNewUser = true;
                user = new Parse.User();
                user.set("username", registrant.get("email"));
                user.set("displayname", registrant.get("name"));
                user.set("password", await generateRandomString(24));
                let authKey = await generateRandomString(48);
                user.set("loginKey", authKey);
                user.set("loginExpires", moment().add("60", "days").toDate());
                user.set("email", registrant.get('email'));
                user = await user.signUp({}, {useMasterKey: true});
                let userACL = new Parse.ACL();
                userACL.setWriteAccess(user, true);
                userACL.setReadAccess(user, true);
                userACL.setRoleReadAccess("moderators", true);
                userACL.setPublicReadAccess(false);
                user.setACL(userACL);
                user = await user.save({}, {useMasterKey: true})
                instructionsText = "The link below will let you set a password and finish creating your account " +
                    "at Clowdr.org for " + config.conference.get("conferenceName") + "\n" + joinURL(config.frontendURL, "/finishAccount/" + user.id + "/" + confID + "/" + authKey);
            }
            else if(!user.get("passwordSet")){
                if(!user.get("loginKey")){
                    let authKey = await generateRandomString(48);
                    user.set("loginKey", authKey);
                    user.set("loginExpires", moment().add("60", "days").toDate());
                    await user.save({},{useMasterKey: true})
                }
                instructionsText = "The link below will let you set a password and finish creating your account " +
                    "at Clowdr.org for " + config.conference.get("conferenceName") + "\n" + joinURL(config.frontendURL, "/finishAccount/" + user.id + "/" + confID + "/" + user.get("loginKey"));
            }
            let userProfileQ = new Parse.Query(UserProfile);
            userProfileQ.equalTo("user", user);
            userProfileQ.equalTo("conference", config.conference);
            let profile = await userProfileQ.first({useMasterKey: true});
            if (!profile) {
                role.getUsers().add(user);
                createdNewProfile = true;
                let profile = new UserProfile();
                profile.set("user", user);
                profile.set("conference", config.conference);
                profile.set("displayName", registrant.get("name"));
                profile.set("realName", registrant.get("name"));
                profile.set("affiliation", registrant.get("affiliation"))
                profile.set("country", registrant.get("country"));

                let profileACL = new Parse.ACL();
                profileACL.setRoleReadAccess(config.conference.id + "-conference", true);
                profileACL.setWriteAccess(user, true);
                profile.setACL(profileACL);
                profile = await profile.save({}, {useMasterKey: true});
                let relation = user.relation("profiles");
                relation.add(profile);
                registrant.set("profile", profile);
                registrant.set("invitationSentDate", new Date());
                await registrant.save({}, {useMasterKey: true});

                await user.save({}, {useMasterKey: true});
                if (!createdNewUser && user.get("passwordSet"))
                    instructionsText = "We matched your email address (" + registrant.get("email") + ") to your existing Clowdr.org account - " +
                        "you can use your existing credentials to login or reset your password here: " + joinURL(config.frontendURL, "/signin");
            } else if (user.get("passwordSet")){
                //Don't do anything, they already have an account.
                console.log(`[Registrations]: user ${registrant.get("name")} already has an account`);
                continue;
            }
            var toEmail = new sgMail.Email(registrant.get("email"));
            var subject = 'Account signup link for ' + config.conference.get("conferenceName");
            var content = new sgMail.Content('text/plain', 'Dear ' + registrant.get("name") + ",\n" +
                config.conference.get("conferenceName") + " is using Clowdr.org to provide an interactive virtual conference experience. " +
                "The Clowdr app will organize the conference program, live sessions, networking, and more. "
                + instructionsText + "\n\n" +
                "Please note that Chrome, Safari and Edge provide the best compatability with CLOWDR. We are working to improve " +
                "compatability with other browsers and to continue to add new features to the platform\n\n" +
                "If you have any problems accessing the conference site, please reply to this email.\n\n" +
                "Best regards,\n" +
                "Your Virtual " + config.conference.get("conferenceName") + " team");
            var mail = new sgMail.Mail(fromEmail, subject, toEmail, content);

            var sg = require('sendgrid')(config.sendgrid);
            var request = sg.emptyRequest({
                method: 'POST',
                path: '/v3/mail/send',
                body: mail.toJSON()
            });

            promises.push(sg.API(request));
        }catch(err){
            console.log(err);
        }
    }
    await role.save({},{useMasterKey: true});
    await Promise.all(promises);
    return {status: "OK"};
});

