/* global Parse */
// ^ for eslint

async function logError(conferenceId, userId, criticality, key, data) {
    try {
        const newError = new Parse.Object("Errors", {
            conference: conferenceId ? new Parse.Object("Conference", { id: conferenceId }) : undefined,
            user: userId ? new Parse.User({ id: userId }) : undefined,
            criticality,
            errorKey: key,
            errorData: data ? {
                data,
                err: {
                    str: data.toString(),
                    message: data.message,
                    code: data.code,
                    stack: data.stack
                }
            } : { x: "Data was undefined" }
        });
        const newACL = new Parse.ACL();
        newError.setACL(newACL);
        await newError.save(null, { useMasterKey: true });
    }
    catch (e) {
        console.error(`Error while trying to save error record (ironic, huh): ${e.toString()}`);
    }
}

async function logRequestError(request, criticality, key, error) {
    const reqObject = request.object;
    if (reqObject) {
        const conference = reqObject.get("conference");
        await logError(conference.id, request.user, criticality, key, error);
    }
    else {
        await logError(undefined, request.user, criticality, key, error);
    }
}

module.exports = {
    logError,
    logRequestError
};
