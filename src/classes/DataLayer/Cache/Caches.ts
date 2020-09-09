import Cache from "./Cache";

export default class Caches {
    private static caches: Map<string, Cache> = new Map();

    static get Count(): number {
        return this.caches.size;
    }

    static clear() {
        this.caches.clear();
    }

    static get(conferenceId: string): Cache {
        let cache = this.caches.get(conferenceId);

        if (!cache) {
            cache = new Cache(conferenceId);
            cache.initialise();
            this.caches.set(conferenceId, cache);
        }

        return cache;
    }
}
