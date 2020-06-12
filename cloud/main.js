const Papa = require('./papaparse.min');

Parse.Cloud.define("registrations", (request) => {
    console.log('Request to upload registration data');
    const data = request.params.content;
    const conferenceID = request.params.conference;
    rows = Papa.parse(data, {header: true});
    rows.data.forEach(element => {
       addRow(element, conferenceID); 
    });
});


function addRow(row, conferenceID) {
    console.log("row--> " + JSON.stringify(row));
    if (row.Email) {
        var Registrations = Parse.Object.extend("Registrations");
        var reg = new Registrations();
        reg.set("email", row.Email);
        reg.set("name", row.Name);
        reg.set("password", row.Password);
        reg.set("affiliation", row.Affiliation);
        reg.set("country", row.Country);
        reg.set("conference", conferenceID);
        reg.save();
    }
}