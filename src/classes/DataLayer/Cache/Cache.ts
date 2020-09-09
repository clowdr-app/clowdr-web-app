import Parse from "parse";
import DebugLogger from "../../DebugLogger";
import CachedSchema from "../CachedSchema";
import * as Interface from "../Interface";
import * as Schema from "../Schema";
import { Base, CachedSchemaKeys, Constructor } from "../Interface/Base";
import { KnownKeys } from "../../Util";

export default class Cache {
    Constructors: {
        [K in CachedSchemaKeys]: Constructor<K, any>;
    } = {
            AttachmentType: Interface.AttachmentType,
            ProgramItem: Interface.ProgramItem
        };

    Fields: {
        [K in CachedSchemaKeys]: Array<KnownKeys<CachedSchema[K]["value"]>>;
    } = {
            AttachmentType: Schema.AttachmentTypeFields,
            ProgramItem: Schema.ProgramItemFields
        };

    private isInitialised: boolean = false;

    private logger: DebugLogger = new DebugLogger("Cache");

    constructor(
        public readonly conferenceId: string,
        enableDebug: boolean = false) {
        if (enableDebug) {
            this.logger.enable();
        }
        else {
            this.logger.disable();
        }

        this.logger.warn("Cache not implemented yet");

        // TODO
    }

    get IsDebugEnabled(): boolean {
        return this.logger.isEnabled;
    }

    set IsDebugEnabled(value: boolean) {
        if (value !== this.logger.isEnabled) {
            if (value) {
                this.logger.enable();
            }
            else {
                this.logger.disable();
            }
        }
    }

    get IsInitialised(): boolean {
        return this.isInitialised;
    }

    async initialise(): Promise<void> {
        // TODO
        this.isInitialised = true;
    }

    get<K extends CachedSchemaKeys, T extends Base<K, T>>(
        tableName: K,
        id: string
    ): Promise<T | null> {
        // TODO: Lookup in indexeddb first
        let query = new Parse.Query<Parse.Object<CachedSchema[K]["value"]>>(tableName);
        return query.get(id).then(parse => {
            // We have to force the types throughout this function because
            // TypeScript can't do full dependent types (yet)

            // TODO: Test for this exceptional case of `id` not being available via `get`
            let schema: any = {
                id: parse.id
            };
            for (let key of this.Fields[tableName]) {
                if (key !== "id") {
                    schema[key] = parse.get(key as Extract<keyof CachedSchema[K]["value"], string>);
                }
            }

            const constr = this.Constructors[tableName] as unknown as Constructor<K, any>;
            return new constr(this.conferenceId, schema, parse) as T;
        });
    }
}
