import Parse from "parse";

export default class ProgramCache {
    constructor(conference, parseLive) {
        this.conference = conference;
        this.parseLive = parseLive;
        this._dataPromises = {};
        this._dataResolves = {};
        this._data = {};
        this._subscriptions = {};
        this._listSubscribers = {};
        this._updateSubscribers = {};
    }

    async _fetchTableAndSubscribe(tableName, objToSetStateOnUpdate) {
        if(objToSetStateOnUpdate){
            if(!this._listSubscribers[tableName])
                this._listSubscribers[tableName] = [];
            this._listSubscribers[tableName].push(objToSetStateOnUpdate);
        }
        if (!this._dataPromises[tableName]) {
            this._dataPromises[tableName] = new Promise(async (resolve, reject) => {
                if (this._data[tableName])
                    resolve(this._data[tableName]);
                if(this._dataResolves[tableName])
                    reject("Should not be possible...")
                this._dataResolves[tableName] = resolve;
            });
            let query = new Parse.Query(tableName);
            query.equalTo("conference", this.conference);

            query.limit(10000);
            let sub = this.parseLive.subscribe(query);
            this._subscriptions[tableName] = sub;
            sub.on("create", obj => {
                this._data[tableName] = [obj, ...this._data[tableName]];
                if (this._listSubscribers[tableName]) {
                    for (let subscriber of this._listSubscribers[tableName]) {
                        let stateUpdate = {};
                        stateUpdate[tableName+"s"] = this._data[tableName];
                        subscriber.setState(stateUpdate);
                    }
                }
            });
            sub.on("delete", obj => {
                this._data[tableName] = this._data[tableName].filter(v=> v.id != obj.id);
                if (this._listSubscribers[tableName]) {
                    for (let subscriber of this._listSubscribers[tableName]) {
                        let stateUpdate = {};
                        stateUpdate[tableName+"s"] = this._data[tableName];
                        subscriber.setState(stateUpdate);
                    }
                }
            });
            sub.on("update", obj => {
                this._data[tableName] = this._data[tableName].map(v=> v.id == obj.id ? obj : v);
                if (this._listSubscribers[tableName]) {
                    for (let subscriber of this._listSubscribers[tableName]) {
                        let stateUpdate = {};
                        stateUpdate[tableName+"s"] = this._data[tableName];
                        subscriber.setState(stateUpdate);
                    }
                }
                if(this._updateSubscribers[tableName] && this._updateSubscribers[tableName][obj.id]){
                    for(let subscriber of this._updateSubscribers[tableName][obj.id]){
                        let stateUpdate = {};
                        stateUpdate[tableName] = obj;
                        subscriber.setState(stateUpdate);
                    }
                }
            });
            let data = await query.find();
            this._data[tableName] = data;
            console.log("Loaded: " + tableName + ", " + data.length)
            if(this._dataResolves[tableName]){
                this._dataResolves[tableName](data);
                this._dataResolves[tableName] = null;
            }
        }
        return await this._dataPromises[tableName];
    }

    async getProgramItem(id, component){
        let items = await this.getProgramItems();
        if(!this._updateSubscribers['ProgramItem'])
            this._updateSubscribers['ProgramItem'] = {};
        if(!this._updateSubscribers['ProgramItem'][id])
            this._updateSubscribers['ProgramItem'][id] = [];
        this._updateSubscribers['ProgramItem'][id].push(component);
        return items.find(v => v.id==id);
    }

    async getProgramItemByConfKey(confKey, component){
        let items = await this.getProgramItems();
        let item = items.find(v => v.get("confKey")==confKey);
        if(item){
            let id = item.id;
            if(!this._updateSubscribers['ProgramItem'])
                this._updateSubscribers['ProgramItem'] = {};
            if(!this._updateSubscribers['ProgramItem'][id])
                this._updateSubscribers['ProgramItem'][id] = [];
            this._updateSubscribers['ProgramItem'][id].push(component);
        }
        return item;
    }
    async getProgramPersonByID(personID, component){
        let persons = await this.getProgramPersons();
        let person = persons.find(v=>v.id==personID);
        if(person) {
            let id = person.id;
            if (!this._updateSubscribers['ProgramPerson'])
                this._updateSubscribers['ProgramPerson'] = {};
            if (!this._updateSubscribers['ProgramPerson'][id])
                this._updateSubscribers['ProgramPerson'][id] = [];
            this._updateSubscribers['ProgramPerson'][id].push(component);
        }
        return person;
    }

    async getProgramRooms(objToSetStateOnUpdate) {
        return this._fetchTableAndSubscribe("ProgramRoom",  objToSetStateOnUpdate);
    }
    async getProgramTracks(objToSetStateOnUpdate) {
        return this._fetchTableAndSubscribe("ProgramTrack",objToSetStateOnUpdate);
    }
    async getProgramPersons(objToSetStateOnUpdate) {
        return this._fetchTableAndSubscribe("ProgramPerson", objToSetStateOnUpdate);
    }
    async getProgramItems(objToSetStateOnUpdate) {
        return this._fetchTableAndSubscribe("ProgramItem",
            // ['track','breakoutRoom','programSession'],
            objToSetStateOnUpdate);
    }
    async getProgramSessions(objToSetStateOnUpdate) {
        return this._fetchTableAndSubscribe("ProgramSession", objToSetStateOnUpdate);
    }
    async getProgramTrackByName(trackName){
        let tracks = await this.getProgramTracks();
        return tracks.find(v=>v.get("name") == trackName);
    }
    async getProgramItemsByTrackName(trackName, component){
        let [items, track] = await Promise.all([this.getProgramItems(component),
        this.getProgramTrackByName(trackName)])
        return items.filter(item => item.get("track") && item.get("track").id == track.id);
    }

    async getEntireProgram(objToSetStateOnUpdate) {
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

    cancelSubscription(tableName, obj, idx) {
        if (idx) {
            if(this._updateSubscribers[tableName][idx])
                this._updateSubscribers[tableName][idx] = this._updateSubscribers[tableName][idx].filter(v => v != obj);
        } else {
            this._listSubscribers[tableName] = this._listSubscribers[tableName].filter(v => v != obj);
        }
    }
}