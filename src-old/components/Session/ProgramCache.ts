import Parse, { LiveQueryClient, LiveQuerySubscription } from "parse";
import { ParseObject } from "../../Util";
import {
    ClowdrInstance,
    ProgramSessionEvent,
    ProgramRoom,
    ProgramItem,
    ProgramSession,
    ProgramTrack,
    ProgramPerson,
    UserProfile,
    AttachmentType,
    ZoomHostAccount,
    ZoomRoom,
    MeetingRegistration
} from "../../classes/ParseObjects";
import ClowdrCache from "../../classes/Cache";
import IDBSchema from "../../classes/Cache/Schema";
import { StoreNames } from "idb";
import { SubscriptionEvent } from "../../classes/Cache/ClowdrCache";

// TODO: This should be made into a generic cache class parameterised by the
//       type of the thing it stores. Then have multiple caches for the various
//       listed uses in the numerous wrapper functions of this existing class.
export default class ProgramCache {
    conference: ClowdrInstance;
    parseLive: Parse.LiveQueryClient;
    _subscriptions: { [tableName: string]: LiveQuerySubscription };
    _listSubscribers: { [tableName: string]: React.Component[] };
    _updateSubscribers: { [tableName: string]: { [id: string]: React.Component[] } };
    _zoomLinks: { [roomId: string]: any };

    idbCache: ClowdrCache;

    constructor(conference: ClowdrInstance, parseLive: LiveQueryClient) {
        this.conference = conference;
        this.parseLive = parseLive;
        this._subscriptions = {};
        this._listSubscribers = {};
        this._updateSubscribers = {};
        this._zoomLinks = {};

        this.idbCache = new ClowdrCache(this.conference.id);

        this.getEntireProgram();
    }

    async _fetchTableAndSubscribe<T extends ParseObject>(
        tableName: string,
        objToSetStateOnUpdate?: React.Component): Promise<T[]> {

        if (objToSetStateOnUpdate) {
            if (!this._listSubscribers[tableName])
                this._listSubscribers[tableName] = [];
            this._listSubscribers[tableName].push(objToSetStateOnUpdate);
        }

        let storeName = tableName as StoreNames<IDBSchema>;

        this.idbCache.subscribe(
            storeName,
            "ProgramCache_fetchTableAndSubscribe",
            async (event, ids) => {
                let allData = this.idbCache.getAll(storeName);
                let outputData = allData.then(xs => this.mapToParseObject(storeName, xs));

                switch (event) {
                    case SubscriptionEvent.Fetched:
                        // Do nothing
                        break;
                    case SubscriptionEvent.Created:
                        if (this._listSubscribers[tableName]) {
                            for (let subscriber of this._listSubscribers[tableName]) {
                                subscriber.setState({ [tableName + "s"]: await outputData });
                            }
                        }
                        break;
                    case SubscriptionEvent.Updated:
                        /* I didn't mean to have this code in here: this is a big performance anti-pattern
                         since any update to anything basically causes the entire thing to re-render, rather
                         than just the component that changed. It would be good to refactor things to not
                         rely on this. -JB

                         Ed: The new IndexedDB-based cache callback interface solves the above problem -
                             because you shouldn't be passing references to setState functions around!
                             The callback should be registered for by each component that needs it, and
                             that component's callback can then call setState if it wants to.
                             Everything below is just a legacy interface hack.
                        */

                        if (this._listSubscribers[tableName]) {
                            for (let subscriber of this._listSubscribers[tableName]) {
                                subscriber.setState({ [tableName + "s"]: await outputData });
                            }
                        }
                        for (let objId of ids) {
                            let query = new Parse.Query(storeName);
                            let obj = query.get(objId);

                            if (this._updateSubscribers[tableName] && this._updateSubscribers[tableName][objId]) {
                                for (let subscriber of this._updateSubscribers[tableName][objId]) {
                                    subscriber.setState({ [tableName]: await obj });
                                }
                            }
                        }
                        break;
                    case SubscriptionEvent.Deleted:
                        if (this._listSubscribers[tableName]) {
                            for (let subscriber of this._listSubscribers[tableName]) {
                                subscriber.setState({ [tableName + "s"]: await outputData });
                            }
                        }
                        break;
                }
            });
        
        return this.idbCache
            .getAll(tableName as StoreNames<IDBSchema>)
            .then((x) => this.mapToParseObject(storeName, x)) as Promise<T[]>;
    }

    async getProgramItem(id: string, component?: React.Component): Promise<ProgramItem | undefined> {
        if (component) {
            if (!this._updateSubscribers['ProgramItem'])
                this._updateSubscribers['ProgramItem'] = {};
            if (!this._updateSubscribers['ProgramItem'][id])
                this._updateSubscribers['ProgramItem'][id] = [];
            this._updateSubscribers['ProgramItem'][id].push(component);
        }
        let item = await this.idbCache.get("ProgramItem", id);
        return item ? this.toParseObject("ProgramItem", item) as Promise<ProgramItem> : undefined;
    }
    async getProgramSessionEvent(id: string, component?: React.Component): Promise<ProgramSessionEvent | undefined> {
        if (component) {
            if (!this._updateSubscribers['ProgramSessionEvent'])
                this._updateSubscribers['ProgramSessionEvent'] = {};
            if (!this._updateSubscribers['ProgramSessionEvent'][id])
                this._updateSubscribers['ProgramSessionEvent'][id] = [];
            this._updateSubscribers['ProgramSessionEvent'][id].push(component);
        }
        let item = await this.idbCache.get("ProgramSessionEvent", id);
        return item ? this.toParseObject("ProgramSessionEvent", item) as Promise<ProgramSessionEvent> : undefined;
    }
    async getProgramSession(id: string): Promise<ProgramSession | undefined> {
        let item = await this.idbCache.get("ProgramSession", id);
        return item ? this.toParseObject("ProgramSession", item) as Promise<ProgramSession> : undefined;
    }
    async getProgramTrack(id: string, component?: React.Component): Promise<ProgramTrack | undefined> {
        if (component) {
            if (!this._updateSubscribers['ProgramTrack'])
                this._updateSubscribers['ProgramTrack'] = {};
            if (!this._updateSubscribers['ProgramTrack'][id])
                this._updateSubscribers['ProgramTrack'][id] = [];
            this._updateSubscribers['ProgramTrack'][id].push(component);
        }
        let item = await this.idbCache.get("ProgramTrack", id);
        return item ? this.toParseObject("ProgramTrack", item) as Promise<ProgramTrack> : undefined;
    }

    async getProgramItemByConfKey(confKey: string, component?: React.Component): Promise<ProgramItem | undefined> {
        let items = await this.getProgramItems();
        // TODO: Improve this by not getting all program items
        let item = items.find((v: any) => v.confKey === confKey);
        if (item) {
            let id = item.id;
            if (component) {
                if (!this._updateSubscribers['ProgramItem'])
                    this._updateSubscribers['ProgramItem'] = {};
                if (!this._updateSubscribers['ProgramItem'][id])
                    this._updateSubscribers['ProgramItem'][id] = [];
                this._updateSubscribers['ProgramItem'][id].push(component);
            }
        }
        return item;
    }
    subscribeComponentToIDOnTable(table: string, id: string, component?: React.Component): void {
        if (component) {
            if (!this._updateSubscribers[table])
                this._updateSubscribers[table] = {};
            if (!this._updateSubscribers[table][id])
                this._updateSubscribers[table][id] = [];
            this._updateSubscribers[table][id].push(component);
        }
    }
    async getProgramRoom(roomID: string, component?: React.Component): Promise<ProgramRoom | undefined> {
        let rooms = await this.getProgramRooms();
        let room = rooms.find((v: any) => v.id === roomID);
        if (room) {
            this.subscribeComponentToIDOnTable("ProgramRoom", roomID, component);
        }
        return room;
    }
    async getProgramPersonByID(personID: string, component?: React.Component): Promise<ProgramPerson | undefined> {
        let persons = await this.getProgramPersons();
        let person = persons.find((v: any) => v.id === personID);
        if (person) {
            this.subscribeComponentToIDOnTable("ProgramPerson", personID, component);
        }
        return person;
    }

    async getUserProfileByProfileID(id: string, component?: React.Component): Promise<UserProfile | undefined> {
        if (component) {
            if (!this._updateSubscribers['UserProfile'])
                this._updateSubscribers['UserProfile'] = {};
            if (!this._updateSubscribers['UserProfile'][id])
                this._updateSubscribers['UserProfile'][id] = [];
            this._updateSubscribers['UserProfile'][id].push(component);
        }
        let item = await this.idbCache.get("UserProfile", id);
        return item ? this.toParseObject("UserProfile", item) as Promise<UserProfile> : undefined;
    }

    async getUserProfiles(objToSetStateOnUpdate?: React.Component): Promise<UserProfile[]> {
        return this._fetchTableAndSubscribe("UserProfile", objToSetStateOnUpdate);
    }
    async getAttachmentTypes(objToSetStateOnUpdate?: React.Component): Promise<AttachmentType[]> {
        return this._fetchTableAndSubscribe("AttachmentType", objToSetStateOnUpdate);
    }
    async getProgramRooms(objToSetStateOnUpdate?: React.Component): Promise<ProgramRoom[]> {
        return this._fetchTableAndSubscribe("ProgramRoom", objToSetStateOnUpdate);
    }
    async getProgramTracks(objToSetStateOnUpdate?: React.Component): Promise<ProgramTrack[]> {
        return this._fetchTableAndSubscribe("ProgramTrack", objToSetStateOnUpdate);
    }
    async getProgramPersons(objToSetStateOnUpdate?: React.Component): Promise<ProgramPerson[]> {
        return this._fetchTableAndSubscribe("ProgramPerson", objToSetStateOnUpdate);
    }
    async getProgramItems(objToSetStateOnUpdate?: React.Component): Promise<ProgramItem[]> {
        return this._fetchTableAndSubscribe("ProgramItem",
            // ['track','breakoutRoom','programSession'],
            objToSetStateOnUpdate);
    }
    async getProgramSessionEvents(objToSetStateOnUpdate?: React.Component): Promise<ProgramSessionEvent[]> {
        return this._fetchTableAndSubscribe("ProgramSessionEvent",
            objToSetStateOnUpdate);
    }
    async getProgramSessions(objToSetStateOnUpdate?: React.Component): Promise<ProgramSession[]> {
        return this._fetchTableAndSubscribe("ProgramSession", objToSetStateOnUpdate);
    }
    async getZoomHostAccounts(objToSetStateOnUpdate?: React.Component): Promise<ZoomHostAccount[]> {
        return this._fetchTableAndSubscribe("ZoomHostAccount", objToSetStateOnUpdate);
    }
    async getZoomRooms(objToSetStateOnUpdate?: React.Component): Promise<ZoomRoom[]> {
        return this._fetchTableAndSubscribe("ZoomRoom", objToSetStateOnUpdate);
    }
    async getMeetingRegistrations(objToSetStateOnUpdate?: React.Component): Promise<MeetingRegistration[]> {
        return this._fetchTableAndSubscribe("MeetingRegistration", objToSetStateOnUpdate);
    }
    async getProgramTrackByName(trackName: string): Promise<ProgramTrack | undefined> {
        let tracks = await this.getProgramTracks();
        return tracks.find((v: any) => v.name === trackName);
    }

    async getZoomJoinLink(programRoom: ProgramRoom): Promise<string> {
        if (this._zoomLinks[programRoom.id]) {
            return this._zoomLinks[programRoom.id];
        }
        // TODO: What is supposed to happen here?
        throw new Error("Zoom Join Link not in Program Cache. What is supposed to happen here?");
    }
    /*
    This command can't support live query right now, since it would update all
    programItems, not just the ones in the requested track
     */
    async getProgramItemsByTrackName(trackName: string): Promise<ProgramItem[]> {
        let [items, track] = await Promise.all([
            this.getProgramItems(),
            this.getProgramTrackByName(trackName)
        ]);
        if (track) {
            // Assist type inference
            let t: ProgramTrack = track;
            return items.filter((item: any) => item.track && item.track.id === t.id);
        }
        else {
            return [];
        }
    }

    async getProgramRoomForEvent(programSessionEvent: ProgramSessionEvent): Promise<ProgramRoom | undefined> {
        let data = await this.getProgramSessions();
        let s = programSessionEvent.programSession;
        return data.find((x) => x.id === s.id)?.room;
    }

    private async toParseObject<K extends StoreNames<IDBSchema>>(name: K, item: IDBSchema[K]["value"]) {
        let query = new Parse.Query(name);
        return query.get(item.id);
    }

    private async mapToParseObject<K extends StoreNames<IDBSchema>>(name: K, items: Array<IDBSchema[K]["value"]>) {
        let query = new Parse.Query(name);
        query.containedIn("objectId", items.map((x) => x.id));
        return query.find();
    }

    async getEntireProgram(objToSetStateOnUpdate?: React.Component): Promise<{
        ProgramItems: ProgramItem[],
        ProgramRooms: ProgramRoom[],
        ProgramTracks: ProgramTrack[],
        ProgramPersons: ProgramPerson[],
        ProgramSessions: ProgramSession[]
    }> {
        this.idbCache.initialiseConferenceCache(this.parseLive);

        let results = await Promise.all([
            this.idbCache.getAll("ProgramItem").then((x) => this.mapToParseObject("ProgramItem", x)),
            this.idbCache.getAll("ProgramRoom").then((x) => this.mapToParseObject("ProgramRoom", x)),
            this.idbCache.getAll("ProgramTrack").then((x) => this.mapToParseObject("ProgramTrack", x)),
            this.idbCache.getAll("ProgramPerson").then((x) => this.mapToParseObject("ProgramPerson", x)),
            this.idbCache.getAll("ProgramSession").then((x) => this.mapToParseObject("ProgramSession", x))
        ]);
        return {
            ProgramItems: results[0] as ProgramItem[],
            ProgramRooms: results[1] as ProgramRoom[],
            ProgramTracks: results[2] as ProgramTrack[],
            ProgramPersons: results[3] as ProgramPerson[],
            ProgramSessions: results[4] as ProgramSession[]
        }
    }

    cancelSubscription(tableName: string, obj: any, idx?: string) {
        if (idx) {
            if (this._updateSubscribers[tableName] && this._updateSubscribers[tableName][idx])
                this._updateSubscribers[tableName][idx] = this._updateSubscribers[tableName][idx].filter(v => v !== obj);
        } else {
            if (this._updateSubscribers[tableName])
                this._listSubscribers[tableName] = this._listSubscribers[tableName].filter(v => v !== obj);
        }
    }
}
