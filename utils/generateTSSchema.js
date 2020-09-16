const yargs = require('yargs');
const fs = require("fs");
const path = require("path");
const { pathExistsSync, mkdirSync } = require('fs-extra');
const { EJSON } = require('bson');

const argv = yargs
    .option("schemaFile", {
        alias: "i",
        description: "The schema file to sort",
        type: "string",
        require: true
    })
    .option("outDir", {
        alias: "o",
        description: "The output directory",
        type: "string",
        require: true
    })
    .help()
    .alias("help", "h")
    .argv;

function determineFieldType(schema, fieldName) {
    let baseType = schema[fieldName];
    let schemaMeta = schema._metadata;
    let fieldsOptions = schemaMeta.fields_options || {};
    let optional = fieldsOptions[fieldName] && !fieldsOptions[fieldName]["required"];

    let tsType;
    let tsImportType = null;
    if (baseType.startsWith("*")) {
        // Pointer
        tsType = baseType.substr(1);
        tsImportType = tsType;

        if (optional) {
            tsType = tsType + " | undefined";
        }
    }
    else if (
        baseType.startsWith("relation<") &&
        baseType.endsWith(">")
    ) {
        // Relation
        tsType = baseType.substring(9, baseType.length - 1);
        tsImportType = tsType;
    }
    else {
        // Ordinary field
        tsType = baseType;

        if (tsType === "file") {
            tsType = "Parse.File";
            tsImportType = "Parse.File";
        }
        else if (tsType === "date") {
            tsType = "Date";
        }
        else if (tsType === "array") {
            tsType = "Array<any>";
        }
        else if (tsType === "object") {
            tsType = "object";
        }

        if (optional) {
            tsType = tsType + " | undefined";
        }
    }

    if (baseType.startsWith("*")) {
        // Pointer
        tsType = `Promise<${tsType}>`;
    }
    else if (
        baseType.startsWith("relation<") &&
        baseType.endsWith(">")
    ) {
        // Relation
        tsType = `Promise<Array<${tsType}>${optional ? " | undefined" : ""}>`;
    }

    return {
        type: tsType,
        importType: tsImportType
    };
}

function generateTSSchema(jsonSchemaText) {

    // _id is the table name
    const excludeFieldNames = [
        "_id", "_metadata", "objectId", "createdAt", "updatedAt"
    ];
    let schema = EJSON.parse(jsonSchemaText);

    console.log(schema._id);

    let fieldNames = Object.keys(schema);
    fieldNames = fieldNames.filter(x => !excludeFieldNames.includes(x));
    let importTypes = new Set();
    let fields = fieldNames.map(x => {
        let t = determineFieldType(schema, x);
        if (t.importType) {
            importTypes.add(t.importType);
        }
        return { name: x, type: t.type };
    });
    let ordinaryFields = fields.filter(x => x.type.indexOf("Promise") === -1);
    let relatedFields = fields.filter(x => x.type.indexOf("Promise") > -1);
    ordinaryFields = ordinaryFields.sort((x, y) => x.name.localeCompare(y.name));
    relatedFields = relatedFields.sort((x, y) => x.name.localeCompare(y.name));

    let intfImportLine
        = importTypes.size > 0
            ? `\nimport { ${Array.from(importTypes)
            .filter(x => x !== "Parse.File")
            .sort((x, y) => x.localeCompare(y))
                .reduce((acc, x) => `${acc}, ${x}`)} } from "../Interface";`
        : "";

    let result =
        `import { Base } from ".";${intfImportLine}
${importTypes.has("Parse.File") ? `import Parse from "parse";\n` : ""}
export default interface Schema extends Base {
${ordinaryFields.reduce((acc, x) => {
                let line = `${x.name}: ${x.type};`;
                return `${acc}\n    ${line}`;
            }, "").substr(1)}
${relatedFields.reduce((acc, x) => {
                let line = `${x.name}: ${x.type};`;
                return `${acc}\n    ${line}`;
            }, "")}
`;
    result = result.trim() + "\n}\n";

    return {
        tableName: schema._id,
        tsSchema: result
    };
}

function main() {
    let schemaFile = argv.schemaFile;
    const outDir = argv.outDir;

    console.log(`Schema file   : ${schemaFile}`);
    console.log(`Output folder : ${outDir}`);
    console.log("===============");

    if (!pathExistsSync(outDir)) {
        mkdirSync(outDir);
    }

    let jsonSchemaLines = fs.readFileSync(schemaFile).toString().split("\n");
    jsonSchemaLines = jsonSchemaLines.map(x => x.trim()).filter(x => x.length > 0);
    let tsSchemas = jsonSchemaLines
        .map(generateTSSchema)
        .sort((x, y) => x.tableName.localeCompare(y.tableName))
        .filter(x => x.tableName !== "_Session");
    tsSchemas.forEach(x => {
        let outFilePath = path.join(outDir, `${x.tableName}.ts`);
        fs.writeFileSync(outFilePath, x.tsSchema);
    });
    fs.writeFileSync(path.join(outDir, "index.ts"),
        `export type { default as Base } from "./Base";` +
        tsSchemas.reduce((acc, x) => {
            let line = `export type { default as ${x.tableName} } from "./${x.tableName}";`;
            return `${acc}\n${line}`;
        }, "") + "\n");
}

main();
