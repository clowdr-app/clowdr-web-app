/* global Parse */
// ^ for eslint

async function updateConferenceLastProgramUpdateTime(conference) {
    conference = await conference.fetch();
    conference.set("lastProgramUpdateTime", new Date());
    await conference.save(null, { useMasterKey: true });
}

Parse.Cloud.afterSave("ProgramItem", async (request) => {
    await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
});

Parse.Cloud.afterSave("ProgramItemAttachment", async (request) => {
    await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
});

Parse.Cloud.afterSave("ProgramPerson", async (request) => {
    await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
});

Parse.Cloud.afterSave("ProgramRoom", async (request) => {
    await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
});

Parse.Cloud.afterSave("ProgramSession", async (request) => {
    await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
});

Parse.Cloud.afterSave("ProgramSessionEvent", async (request) => {
    await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
});

Parse.Cloud.afterSave("ProgramTrack", async (request) => {
    await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
});

Parse.Cloud.afterSave("Flair", async (request) => {
    await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
});
