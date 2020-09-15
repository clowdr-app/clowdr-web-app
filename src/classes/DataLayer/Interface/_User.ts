import Parse from "parse";
import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, UncachedBase } from "./Base";
import { UserProfile } from ".";
import { PromisesRemapped } from "../WholeSchema";
import { CoreManager, RequestOptions } from "parse";

type SchemaT = Schema._User;
type K = "_User";
const K_str: K = "_User";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get authData(): object {
        return this.parse.get("authData");
    }

    get email(): string {
        return this.parse.get("email");
    }

    get emailVerified(): boolean {
        return this.parse.get("emailVerified");
    }

    get passwordSet(): boolean {
        return this.parse.get("passwordSet");
    }

    get username(): string {
        return this.parse.get("username");
    }

    get profiles(): Promise<UserProfile[]> {
        return this.nonUniqueRelated("profiles");
    }

    static async logIn(email: string, password: string, options: RequestOptions = {}): Promise<Class> {
        /* We're going to tap into the innards of the Parse JS SDK because for
         * some reason, the backend supports email login but their frontend SDK
         * doesn't!
         */

        const loginOptions: {
            useMasterKey?: boolean,
            installationId?: string
        } = {};

        if (options.hasOwnProperty('useMasterKey')) {
            loginOptions.useMasterKey = options.useMasterKey;
        }
        if (options.hasOwnProperty('installationId')) {
            loginOptions.installationId = options.installationId;
        }

        // @ts-ignore
        const RESTController = CoreManager.getRESTController();
        // @ts-ignore
        const userController = CoreManager.getUserController();
        const auth = {
            email: email,
            password: password
        };
        return RESTController.request(
            'GET', 'login', auth, loginOptions
        ).then((response: any) => {
            let user = new Parse.User();
            // @ts-ignore
            user._finishFetch(response);
            return userController.setCurrentUser(user);
        });
    }

    static get(id: string, conferenceId?: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId?: string): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticUncachedBase<K> = Class;
