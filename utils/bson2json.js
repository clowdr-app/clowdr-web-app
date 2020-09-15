const yargs = require('yargs');
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { pathExistsSync, mkdirSync } = require('fs-extra');

const argv = yargs
    .option("inDir", {
        alias: "i",
        description: "The input directory",
        type: "string",
        require: true
    })
    .option("outDir", {
        alias: "o",
        description: "The output directory",
        type: "string",
        require: false
    })
    .option("remove", {
        alias: "r",
        description: "Remove the input files after completion",
        type: "boolean",
        require: false
    })
    .help()
    .alias("help", "h")
    .argv;

const inDir = argv.inDir;
const outDir = argv.outDir ? argv.outDir : inDir;
const shouldRemove = !!argv.remove;

console.log(`Input folder  : ${inDir}`);
console.log(`Output folder : ${outDir}`);
console.log("===============");

if (!pathExistsSync(outDir)) {
    mkdirSync(outDir);
}

function getRootName(filePath) {
    let fileName = path.basename(filePath);
    let fileExt = path.extname(fileName);
    return fileName.substr(0, fileName.length - fileExt.length);
}

function isBSON(filePath) {
    return !!filePath.match(/\.bson$/i);
}

let inFileNames = fs.readdirSync(inDir);
inFileNames = inFileNames.filter(isBSON);

let maxInFileNameLength = inFileNames.reduce((acc, x) => Math.max(acc, x.length));

for (let inFileName of inFileNames) {
    let outFileName = getRootName(inFileName) + ".json";
    console.log(`Converting    : ${inFileName.padEnd(maxInFileNameLength, " ")} -> ${outFileName}`);

    let inFilePath = path.join(inDir, inFileName);
    let outFilePath = path.join(outDir, getRootName(inFileName) + ".json");

    new Promise((resolve, reject) => {
        let conversionProcess = spawn(
            "bsondump",
            [inFilePath, "--outFile", outFilePath],
            { stderr: 'inherit' });

        let errors = [];
        conversionProcess.on("error", (err) => {
            errors.push(err);
        });

        conversionProcess.on("exit", (code) => {
            if (code) {
                reject({ inFileName: inFileName, code: code, errors: errors });
            }
            else {
                resolve({ inFileName: inFileName });
            }
        });
    }).then(({ inFileName }) => {
        console.log(`Converted    : ${inFileName}${shouldRemove ? " (Deleting input file)" : ""}`);

        if (shouldRemove) {
            fs.unlinkSync(inFilePath);
        }
    }).catch(reason => {
        console.error(`!!! Failed to convert: ${inFileName}. Exit code: ${reason.code}`);
        reason.errors.forEach(console.error);
    });
}
