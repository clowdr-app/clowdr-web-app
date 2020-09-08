import Parse from 'parse';
import { Base as Schema } from "../DBSchema/Base";
import { KnownKeys } from "../Util";

type BaseSchemaValueT<T> = Schema & Omit<T, keyof Schema>;

export class Base<T extends Schema> {
    constructor(
        protected tableName: string,
        protected fieldNames: Array<KnownKeys<BaseSchemaValueT<T>>>,
        protected schemaValue: BaseSchemaValueT<T>,
        private dbValue: Parse.Object | null = null
    ) {
        if (this.dbValue) {
            this.upgrade();
        }
    }

    get id(): string {
        return this.schemaValue.id;
    }

    get createdAt(): Date {
        return this.schemaValue.createdAt;
    }

    get updatedAt(): Date {
        return this.schemaValue.updatedAt;
    }

    public get SchemaValue(): BaseSchemaValueT<T> {
        return this.schemaValue;
    }

    public refresh(): Promise<BaseSchemaValueT<T>> {
        for (let key in this.schemaValue) {
            if (key !== "id") {
                // @ts-ignore - Invalidate all the fields
                this.schemaValue[key] = undefined;
            }
        }
        this.dbValue = null;

        // Refresh from database
        return this.upgrade();
    }

    protected upgrade(): Promise<BaseSchemaValueT<T>> {
        const copyFields = (data: Parse.Object) => {
            this.dbValue = data;
            for (let key of this.fieldNames) {
                if (key !== "id") {
                    this.schemaValue[key] = data.get(key as string);
                }
            }
            return this.schemaValue;
        };

        // TODO: Push this through the cache
        if (!this.dbValue) {
            let query = new Parse.Query(this.tableName);
            return query.get(this.schemaValue.id).then(copyFields);
        }
        else {
            // Ensure we copy the data over
            copyFields(this.dbValue);
        }

        return Promise.resolve(this.schemaValue);
    }

    protected get<K extends KnownKeys<BaseSchemaValueT<T>>>(prop: K): BaseSchemaValueT<T>[K] | Promise<BaseSchemaValueT<T>[K]> {
        if (this.schemaValue[prop]) {
            return this.schemaValue[prop];
        }
        else {
            return this.upgrade().then(v => v[prop]);
        }
    }

    // TODO: Push this through the cache not the DB directly!
    protected related<
        T2 extends Schema,
        DataT2 extends Base<T2>>
        (
            name: string,
            fieldNames: Array<KnownKeys<BaseSchemaValueT<T2>>>,
            constr: new (schemaValue: BaseSchemaValueT<T2>,
                         dbValue: Parse.Object | null) => DataT2
        ): DataT2 | Promise<DataT2> {

        if (this.dbValue) {
            let dbVal: Parse.Object = this.dbValue.get(name);
            // @ts-ignore - Construct the new schema value
            let schemaVal: BaseSchemaValueT<T2> = {
                id: dbVal.id,
                createdAt: dbVal.createdAt,
                updatedAt: dbVal.updatedAt
            };

            for (let key of fieldNames) {
                schemaVal[key] = dbVal.get(key as string);
            }

            return new constr(schemaVal, dbVal);
        }
        else {
            return this.upgrade().then(() => {
                return this.related(name, fieldNames, constr);
            });
        }
    }

    // TODO: Push this through the cache not the DB directly!
    protected relatedMany<
        T2 extends Schema,
        DataT2 extends Base<T2>>
        (
            name: string,
            fieldNames: Array<KnownKeys<BaseSchemaValueT<T2>>>,
            constr: new (schemaValue: BaseSchemaValueT<T2>,
                         dbValue: Parse.Object | null) => DataT2
        ): Array<DataT2> | Promise<Array<DataT2>> {

        if (this.dbValue) {
            let dbVals: Array<Parse.Object> = this.dbValue.get(name);
            let results = dbVals.map(dbVal => {
                // @ts-ignore - Construct the new schema value
                let schemaVal: BaseSchemaValueT<T2> = {
                    id: dbVal.id,
                    createdAt: dbVal.createdAt,
                    updatedAt: dbVal.updatedAt
                };

                for (let key of fieldNames) {
                    schemaVal[key] = dbVal.get(key as string);
                }
                return new constr(schemaVal, dbVal);
            });
            return results;
        }
        else {
            return this.upgrade().then(() => {
                return this.relatedMany(name, fieldNames, constr);
            });
        }
    }
}
