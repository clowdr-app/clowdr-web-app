const yargs = require('yargs');
const fs = require("fs");
const path = require("path");

const argv = yargs
    .option("schemaFile", {
        alias: "i",
        description: "The schema file to sort",
        type: "string",
        require: true
    })
    .help()
    .alias("help", "h")
    .argv;

let schemaFile = argv.schemaFile;
let schemaLines = fs.readFileSync(schemaFile).toString().split("\n");
schemaLines = schemaLines.map(x => x.trim()).filter(x => x.length > 0);
schemaLines = schemaLines.sort((x, y) => {
    const searchFor = `"_id":"`;
    let x_idIndex = x.indexOf(searchFor);
    let y_idIndex = y.indexOf(searchFor);
    let xId = x.substr(x_idIndex + searchFor.length);
    xId = xId.substring(0, xId.indexOf(`"`));
    let yId = y.substr(x_idIndex + searchFor.length);
    yId = yId.substring(0, yId.indexOf(`"`));
    return xId.localeCompare(yId);
});
let schema = schemaLines.reduce((acc, x) => `${acc}\n${x}`);
fs.writeFileSync(schemaFile, schema);
