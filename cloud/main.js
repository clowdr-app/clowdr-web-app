const Papa = require('./papaparse.min');

Parse.Cloud.define("registrations", (request) => {
    console.log('Request to upload registration data');
    data = request.params.content;
    rows = Papa.parse(data, {header: true});
    rows.data.map(addRow);
});


function addRow(row) {
    console.log("row--> " + JSON.stringify(row));
    if (row.Email) {
        var Registrations = Parse.Object.extend("Registrations");
        var reg = new Registrations();
        reg.set("email", row.Email);
        reg.set("name", row.Name);
        reg.set("affiliation", row.Affiliation);
        reg.set("country", row.Country);
        reg.save();
    }
}