/**
 * Validates a request object matches a given schema.
 * 
 * TODO: Handle Parse.File fields
 * 
 * @param {Object} schema The schema
 * @param {Object} request The request object
 * @returns { { ok: boolean, error: string | undefined } } ok is true if request matches schema
 * 
 * Schema type definitions:
 * 
 * basic_type: 'string' | 'boolean' | 'number' (append '?' for optional)
 * array_type: '[' basic_type ']' (append '?' for optional)
 * 
 * 
 * Schema format:
 * 
 * schema: {
 *      fieldName: "basic_type|array_type" | schema
 * }
 */
function validateRequest(schema, request) {
    return validateObjectType("schema", schema, request);
}

function validateObjectType(keyPrefix, schema, request) {
    let typeKeys = Object.keys(schema);
    let requestKeys = Object.keys(request);
    for (let key of typeKeys) {
        let schemaType = schema[key];
        const optional = typeof schemaType === "string" && schemaType.endsWith("?");
        if (optional) {
            schemaType = schemaType.substr(0, schemaType.length - 1);
        }
        
        if (!requestKeys.includes(key)) {
            if (!optional) {
                return {
                    ok: false,
                    error: `Missing '${keyPrefix}.${key}'`
                }
            }
            else {
                return {
                    ok: true
                };
            }
        }

        let actualValue = request[key];
        let result;
        if (typeof schemaType === "string") {
            result = validateBasicType(keyPrefix + "." + key, schemaType, actualValue);
        }
        else {
            result = validateObjectType(keyPrefix + "." + key, schemaType, actualValue);
        }

        if (!result.ok) {
            return result;
        }
    }

    return { ok: true };
}

function validateBasicType(key, schemaType, actualValue) {
    let actualType = typeof actualValue;

    if (schemaType === "date") {
        if (actualType !== "string") {
            return {
                ok: false,
                error: `Schema mismatch @${key}. Expected date string, received '${actualType}'.`
            }
        }
        else {
            // Validate we can create a date
            // eslint-disable-next-line no-unused-vars
            const x = new Date(actualValue);
        }
    }
    else if (schemaType === "string" || schemaType === "boolean" || schemaType === "number") {
        if (actualType !== schemaType) {
            return {
                ok: false,
                error: `Schema mismatch @${key}. Expected '${schemaType}', received '${actualType}' (${actualValue}).`
            };
        }
    }
    else if (schemaType.startsWith("[") && schemaType.endsWith("]")) {
        if (!(actualValue instanceof Array)) {
            return {
                ok: false,
                error: `Schema mismatch @${key}. Expected '${schemaType}', received '${actualType}':${JSON.stringify(actualValue)}.`
            };
        }

        let innerSchemaType = schemaType.substr(1, schemaType.length - 2);
        for (let idx = 0; idx < actualValue.length; idx++) {
            let item = actualValue[idx];
            let result = validateBasicType(key + "." + idx.toString(), innerSchemaType, item);
            if (!result.ok) {
                return result;
            }
        }
    }
    else {
        return {
            ok: false,
            error: `Unrecognised schema type @${key}: ${schemaType}`
        };
    }

    return { ok: true };
}

const { backOff } = require('exponential-backoff');

async function callWithRetry(f) {
    const response = await backOff(f,
        {
            startingDelay: 500,
            retry: (err, attemptNum) => {
                // console.error(err);
                if (err && err.code === 20429)
                    return true;
                // tslint:disable-next-line:no-console
                console.error("Unexpected error", err);
                return false;
            }
        });
    return response;
}

module.exports = {
    validateRequest: validateRequest,
    callWithRetry: callWithRetry
}
