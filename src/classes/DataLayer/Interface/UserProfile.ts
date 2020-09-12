import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticCachedBase, StaticBaseImpl, FieldDataT, CachedBase } from "./Base";
import { Conference, Flair, UserPresence, ProgramPerson, _User, BreakoutRoom } from ".";

type SchemaT = Schema.UserProfile;
type K = "UserProfile";
const K_str: K = "UserProfile";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get affiliation(): string {
        return this.data.affiliation;
    }

    get bio(): string {
        return this.data.bio;
    }

    get country(): string {
        return this.data.country;
    }

    get displayName(): string {
        return this.data.displayName;
    }

    get position(): string {
        return this.data.position;
    }

    get profilePhoto(): Parse.File | null {
        return this.data.profilePhoto;
    }

    get pronouns(): string {
        return this.data.pronouns;
    }

    get realName(): string {
        return this.data.realName;
    }

    get tags(): Schema.UserProfileTag[] {
        return this.data.tags;
    }

    get webpage(): string {
        return this.data.webpage;
    }

    get welcomeModalShown(): boolean {
        return this.data.welcomeModalShown;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get primaryFlair(): Promise<Flair> {
        return this.uniqueRelated("primaryFlair");
    }

    get presence(): Promise<UserPresence> {
        return this.uniqueRelated("presence");
    }

    get programPersons(): Promise<ProgramPerson[]> {
        return this.nonUniqueRelated("programPersons");
    }

    get user(): Promise<_User> {
        return this.uniqueRelated("user");
    }

    get watchedRooms(): Promise<BreakoutRoom[]> {
        return this.nonUniqueRelated("watchedRooms");
    }

    static getByUserId(userId: string, conferenceId: string): Promise<Class | null> {
        return StaticBaseImpl
            .get("_User", userId)
            .then(_user => {
                const user = _user as _User;
                return user?.profiles.then(profiles => {
                    return profiles.find(x => x.conferenceId === conferenceId) || null;
                }) || null;
            });
    }

    static get(id: string, conferenceId: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId: string): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticCachedBase<K> = Class;
