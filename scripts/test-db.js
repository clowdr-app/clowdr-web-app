const fs = require('fs');
const { exec } = require('child_process');
const dotenv = require('dotenv');
const { generateTestData } = require("../src/tests/initTestDB.js");
const BSON = require('bson');

dotenv.config();

if (!process.env.MONGODB_HOST.includes("localhost")) {
    throw new Error("Don't run this against a production database - it obliterates everything!");
}

let schemaDirPath = "./db/schema-base";
let testDirPath = "./db/test";

if (!fs.existsSync(testDirPath)) {
    fs.mkdirSync(testDirPath);
}

let testData = generateTestData().json;
let schemaFilePaths = fs.readdirSync(schemaDirPath);
for (let schemaFilePath of schemaFilePaths) {
    let tableName = schemaFilePath.replace(/\.json/i, "");
    if (!testData[tableName]) {
        if (tableName.includes("meta")) {
            console.log(schemaFilePath);
            fs.copyFileSync(
                `${schemaDirPath}/${schemaFilePath}`,
                `${testDirPath}/${schemaFilePath}`
            );
        }
        else {
            let JSONStr = fs.readFileSync(`${schemaDirPath}/${schemaFilePath}`, 'UTF-8');
            const JSONLines = JSONStr.split(/\r?\n/);
            if (JSONLines.length > 0 && JSONLines[0].length > 0) {
                console.log(schemaFilePath);

                let data;
                JSONLines.forEach(JSONLine => {
                    if (JSONLine.length > 0) {
                        let obj = JSON.parse(JSONLine);
                        let datas = BSON.serialize(obj);
                        if (data) {
                            data = Buffer.concat([datas, data]);
                        }
                        else {
                            data = datas;
                        }
                    }
                });

                fs.writeFileSync(
                    `${testDirPath}/${tableName}.bson`,
                    data
                );
            }
        }
    }
}

for (let tableName in testData) {
    let fName = tableName.replace(/:/g, "%3A");
    let datas = testData[tableName].map(x => BSON.serialize(x));
    let data = Buffer.concat(datas);
    console.log(fName);
    fs.writeFileSync(
        `${testDirPath}/${fName}.bson`,
        data
    );
    fs.writeFileSync(
        `${testDirPath}/${fName}.json`,
        JSON.stringify(testData[tableName])
    );
}

let db = process.env.MONGODB_DB;
let host = process.env.MONGODB_HOST;

let cmd = "";
if (process.env.MONGODB_PASSWORD) {
    cmd = `mongorestore --host ${host} --username admin --password ${process.env.MONGODB_PASSWORD} --db ${db} ${testDirPath}/`;
}
else {
    cmd = `mongorestore --host ${host} --db ${db} ${testDirPath}/`;
}

exec(`mongo --host ${host} ${db} --eval "db.dropDatabase()"`, (err, stdout, stderr) => {
    if (err) {
        console.error(`DB drop failed! ${err}`);
    }
    else {
        console.log('DB drop succeeded.');

        console.log('> ' + cmd);
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                console.error(`DB import failed! ${err}`);
            }
            else {
                console.log('DB import succeeded.');
            }
        });
    }
});
