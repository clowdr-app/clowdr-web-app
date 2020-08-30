/* global Parse */
// ^ for eslint

let UserProfile = Parse.Object.extend("UserProfile");
let SocialSpace = Parse.Object.extend("SocialSpace");
let ClowdrInstance = Parse.Object.extend("ClowdrInstance");

Parse.Cloud.define("presence-addToPage", async (request) => {
    let confID = request.params.confID;
    let spaceID = request.params.spaceID;
    let userQ = new Parse.Query(UserProfile);
    let conf = new ClowdrInstance();
    conf.id = confID;
    userQ.equalTo("user", request.user);
    userQ.equalTo("conference", conf);
    let user = await userQ.first({ useMasterKey: true });
    if (user) {
        let spaceQ = new Parse.Query(SocialSpace);
        let space = await spaceQ.get(spaceID, { useMasterKey: true });
        space.relation("users").add(user);
        await space.save({}, { useMasterKey: true });

    }
});
Parse.Cloud.define("presence-removeFromPage", async (request) => {
    let confID = request.params.confID;
    let spaceID = request.params.spaceID;
    let userQ = new Parse.Query(UserProfile);
    let conf = new ClowdrInstance();
    conf.id = confID;
    userQ.equalTo("user", request.user);
    userQ.equalTo("conference", conf);
    let user = await userQ.first({ useMasterKey: true });
    if (user) {
        let spaceQ = new Parse.Query(SocialSpace);
        let space = await spaceQ.get(spaceID, { useMasterKey: true });
        space.relation("users").remove(user);
        await space.save({}, { useMasterKey: true });
    }

});
