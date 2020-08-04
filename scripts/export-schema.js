const Parse = require('parse/node');
const fs = require('fs');
const util = require('util');

Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;
Parse.Schema.all().then(schema => {
    fs.writeFileSync('./db-schema.json', JSON.stringify(schema, null, 2) , 'utf-8'); 
    console.log("Schema stored in ./db-schema.json");
}).catch(err => {
    console.log(err);
});
