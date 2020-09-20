/* global Parse */
// ^ for eslint

async function updateConferenceLastProgramUpdateTime(conference) {
    conference = await conference.fetch();
    conference.set("lastProgramUpdateTime", new Date());
    await conference.save(null, { useMasterKey: true });
}

const programTableNames = [
    "ProgramItem",
    "ProgramItemAttachment",
    "ProgramPerson",
    "ProgramRoom",
    "ProgramSession",
    "ProgramSessionEvent",
    "ProgramTrack",
    "Flair",
];

for (let tableName of programTableNames) {
    Parse.Cloud.afterSave(tableName, async (request) => {
        await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
    });

    Parse.Cloud.afterDelete(tableName, async (request) => {
        await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
    });
}
