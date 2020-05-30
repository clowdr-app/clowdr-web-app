var jwt = require('jsonwebtoken');

Parse.Cloud.define("decodeSlackToken", async (request) => {
    const token = request.params.token;
    let payload = jwt.verify(token, process.env.CLOWDR_JWT_KEY);
    //
    return payload;
});
