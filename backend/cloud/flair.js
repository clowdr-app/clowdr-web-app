/* global Parse */
// ^ for eslint

async function getFlairByLabel(label, conference) {
    let query = new Parse.Query("Flair");
    query.equalTo("label", label);
    query.equalTo("conference", conference);
    try {
        return await query.first({ useMasterKey: true });
    }
    catch {
        return null;
    }
}

module.exports = {
    getFlairByLabel: getFlairByLabel
}
