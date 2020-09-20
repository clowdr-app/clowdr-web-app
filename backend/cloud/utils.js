/**
 * Validates a request object matches a given schema.
 * 
 * @param {Object} schema The schema
 * @param {Object} request The request object
 * @returns { { ok: boolean, error: string | undefined } } ok is true if request matches schema
 * 
 * Schema type definitions:
 * 
 * basic_type: 'string' | 'boolean' | 'number'
 * array_type: '[' basic_type ']'
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
    let typeKeys = Object.keys(request);
    let requestKeys = Object.keys(request);
    for (let key of typeKeys) {
        let schemaType = schema[key];
        
        if (!requestKeys.includes(key)) {
            return {
                ok: false,
                error: `Missing '${keyPrefix}.${key}'`
            }
        }

        let actualValue = request[key];
        let result;
        if (typeof schemaType === "string") {
            result = validateBasicType(keyPrefix + "." + key, schemaType, actualValue);
        }
        else {
            result = validateRequest(keyPrefix + "." + key, schemaType, actualValue);
        }

        if (!result.ok) {
            return result;
        }
    }

    return { ok: true };
}

function validateBasicType(key, schemaType, actualValue) {
    let actualType = typeof actualValue;

    if (schemaType === "string" || schemaType === "boolean" || schemaType === "number") {
        if (actualType !== schemaType) {
            return {
                ok: false,
                error: `Schema mismatch @${key}. Expected '${schemaType}', received '${actualType}'.`
            };
        }
    }
    else if (schemaType.startsWith("[") && schemaType.endsWith("]")) {
        if (!(actualType instanceof Array)) {
            return {
                ok: false,
                error: `Schema mismatch @${key}. Expected '${schemaType}', received '${actualType}'.`
            };
        }

        let innerSchemaType = schemaType.substr(1, schemaType.length - 1);
        for (let idx = 0; idx < actualValue.length; idx++) {
            let item = actualValue[idx];
            let result = validateBasicType(idx.toString(), innerSchemaType, item);
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

module.exports = {
    validateRequest: validateRequest
}
