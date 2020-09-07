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

// TODO: This should be made into a generic cache class parameterised by the
//       type of the thing it stores. Then have multiple caches for the various
//       listed uses in the numerous wrapper functions of this existing class.
export default class ProgramCache {
    conference: ClowdrInstance | null;
    parseLive: Parse.LiveQueryClient;
    _dataPromises: { [tableName: string]: Promise<any> };
    _dataResolves: { [tableName: string]: (p: any) => void };
    _data: { [tableName: string]: ParseObject[] };
    _dataById: { [tableName: string]: { [k: string]: ParseObject } };
    _subscriptions: { [tableName: string]: LiveQuerySubscription };
    _listSubscribers: { [tableName: string]: React.Component[] };
    _updateSubscribers: { [tableName: string]: { [id: string]: React.Component[] } };
    _zoomLinks: { [roomId: string]: any };

    constructor(conference: ClowdrInstance | null, parseLive: LiveQueryClient) {
        this.conference = conference;
        this.parseLive = parseLive;
        this._dataPromises = {};
        this._dataResolves = {};
        this._data = {};
        this._dataById = {};
        this._subscriptions = {};
        this._listSubscribers = {};
        this._updateSubscribers = {};
        this._zoomLinks = {};

        this.getEntireProgram();
    }

    async _fetchTableAndSubscribe<T extends ParseObject>(tableName: string, objToSetStateOnUpdate?: React.Component): Promise<T[]> {
        if (objToSetStateOnUpdate) {
            if (!this._listSubscribers[tableName])
                this._listSubscribers[tableName] = [];
            this._listSubscribers[tableName].push(objToSetStateOnUpdate);
        }
        if (!this._dataPromises[tableName]) {
            this._dataPromises[tableName] = new Promise(async (resolve, reject) => {
                if (this._data[tableName])
                    resolve(this._data[tableName]);
                if (this._dataResolves[tableName])
                    reject("Should not be possible...")
                this._dataResolves[tableName] = resolve;
            });
            let query = new Parse.Query(tableName);
            query.equalTo("conference", this.conference);

            query.limit(10000);
            let sub = this.parseLive.subscribe(query);
            this._subscriptions[tableName] = sub;
            sub.on("create", obj => {
                this._dataById[tableName][obj.id] = obj;
                this._data[tableName] = [obj, ...this._data[tableName]];
                if (this._listSubscribers[tableName]) {
                    for (let subscriber of this._listSubscribers[tableName]) {
                        subscriber.setState({ [tableName + "s"]: this._data[tableName] });
                    }
                }
            });
            sub.on("delete", obj => {
                this._data[tableName] = this._data[tableName].filter(v => v.id !== obj.id);
                delete this._dataById[tableName][obj.id];

                if (this._listSubscribers[tableName]) {
                    for (let subscriber of this._listSubscribers[tableName]) {
                        subscriber.setState({ [tableName + "s"]: this._data[tableName] });
                    }
                }
            });
            sub.on("update", async (obj: Parse.Object | ProgramItem) => {
                if ("attachments" in obj &&
                    obj.attachments.length > 0) {
                    await Parse.Object.fetchAllIfNeeded(obj.attachments);
                }
                this._data[tableName] = this._data[tableName].map(v => v.id === obj.id ? obj : v);


                this._dataById[tableName][obj.id] = obj;
                /* I didn't mean to have this code in here: this is a big performance anti-pattern
                 since any update to anything basically causes the entire thing to re-render, rather
                 than just the component that changed. It would be good to refactor things to not
                 rely on this. -JB
                */
                if (this._listSubscribers[tableName]) {
                    for (let subscriber of this._listSubscribers[tableName]) {
                        subscriber.setState({ [tableName + "s"]: this._data[tableName] });
                    }
                }
                if (this._updateSubscribers[tableName] && this._updateSubscribers[tableName][obj.id]) {
                    for (let subscriber of this._updateSubscribers[tableName][obj.id]) {
                        subscriber.setState({ [tableName]: obj });
                    }
                }
            });
            let data = await query.find();
            this._data[tableName] = data;
            this._dataById[tableName] = {};
            for (let obj of data)
                this._dataById[tableName][obj.id] = obj;

            console.log("Loaded: " + tableName + ", " + data.length)
            if (this._dataResolves[tableName]) {
                this._dataResolves[tableName](data);
                delete this._dataResolves[tableName];
            }
        }
        return await this._dataPromises[tableName];
    }

    async getProgramItem(id: string, component?: React.Component): Promise<ProgramItem | undefined> {
        await this.getProgramItems();
        if (component) {
            if (!this._updateSubscribers['ProgramItem'])
                this._updateSubscribers['ProgramItem'] = {};
            if (!this._updateSubscribers['ProgramItem'][id])
                this._updateSubscribers['ProgramItem'][id] = [];
            this._updateSubscribers['ProgramItem'][id].push(component);
        }
        return this._dataById['ProgramItem'][id] as (ProgramItem | undefined);
    }
    async getProgramSessionEvent(id: string, component?: React.Component): Promise<ProgramSessionEvent> {
        await this.getProgramSessionEvents();
        if (component) {
            if (!this._updateSubscribers['ProgramSessionEvent'])
                this._updateSubscribers['ProgramSessionEvent'] = {};
            if (!this._updateSubscribers['ProgramSessionEvent'][id])
                this._updateSubscribers['ProgramSessionEvent'][id] = [];
            this._updateSubscribers['ProgramSessionEvent'][id].push(component);
        }
        return this._dataById['ProgramSessionEvent'][id] as ProgramSessionEvent;
    }
    async getProgramSession(id: string): Promise<ProgramSession | undefined> {
        await this.getProgramSessions();
        return this._dataById['ProgramSession'][id] as (ProgramSession | undefined);
    }
    async getProgramTrack(id: string, component?: React.Component): Promise<ProgramTrack | undefined> {
        await this.getProgramTracks();
        if (component) {
            if (!this._updateSubscribers['ProgramTrack'])
                this._updateSubscribers['ProgramTrack'] = {};
            if (!this._updateSubscribers['ProgramTrack'][id])
                this._updateSubscribers['ProgramTrack'][id] = [];
            this._updateSubscribers['ProgramTrack'][id].push(component);
        }
        return this._dataById['ProgramTrack'][id] as (ProgramTrack | undefined);
    }

    async getProgramItemByConfKey(confKey: string, component?: React.Component): Promise<ProgramItem | undefined> {
        let items = await this.getProgramItems();
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
        await this.getUserProfiles();
        if (component) {
            if (!this._updateSubscribers['UserProfile'])
                this._updateSubscribers['UserProfile'] = {};
            if (!this._updateSubscribers['UserProfile'][id])
                this._updateSubscribers['UserProfile'][id] = [];
            this._updateSubscribers['UserProfile'][id].push(component);
        }
        return this._dataById['UserProfile'][id] as (UserProfile | undefined);
    }

    /**
     *  Used when we want the data to be fetched but don't want to wait for it.
     */
    failFast_GetUserProfileByProfileID(id: string, component?: React.Component): UserProfile | undefined {
        this.getUserProfiles();
        if (component) {
            if (!this._updateSubscribers['UserProfile'])
                this._updateSubscribers['UserProfile'] = {};
            if (!this._updateSubscribers['UserProfile'][id])
                this._updateSubscribers['UserProfile'][id] = [];
            this._updateSubscribers['UserProfile'][id].push(component);
        }
        return this._dataById['UserProfile'][id] as (UserProfile | undefined);
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

    getProgramRoomForEvent(programSessionEvent: ProgramSessionEvent): ProgramRoom | undefined {
        let s = programSessionEvent.programSession;
        let session = this._dataById["ProgramSession"][s.id] as ProgramSession | undefined;
        return session?.room as (ProgramRoom | undefined);
    }

    async getEntireProgram(objToSetStateOnUpdate?: React.Component): Promise<{
        ProgramItems: ProgramItem[],
        ProgramRooms: ProgramRoom[],
        ProgramTracks: ProgramTrack[],
        ProgramPersons: ProgramPerson[],
        ProgramSessions: ProgramSession[]
    }> {
        let results = await Promise.all([this.getProgramItems(objToSetStateOnUpdate),
        this.getProgramRooms(objToSetStateOnUpdate),
        this.getProgramTracks(objToSetStateOnUpdate),
        this.getProgramPersons(objToSetStateOnUpdate),
        this.getProgramSessions(objToSetStateOnUpdate)]);
        return {
            ProgramItems: results[0],
            ProgramRooms: results[1],
            ProgramTracks: results[2],
            ProgramPersons: results[3],
            ProgramSessions: results[4]
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
