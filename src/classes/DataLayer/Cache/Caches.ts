import Cache from "./Cache";

export var clowdr: {
    caches: Caches
};

export default class Caches {
    private static caches: Map<string, Cache> = new Map();

    static get Count(): number {
        return this.caches.size;
    }

    static clear() {
        this.caches.clear();
    }

    static async get(conferenceId: string): Promise<Cache> {
        if (!clowdr) {
            clowdr = {
                caches: this
            };
            // @ts-ignore
            window.clowdr = clowdr;
        }

        let cache = this.caches.get(conferenceId);

        if (!cache) {
            cache = new Cache(conferenceId);
            this.caches.set(conferenceId, cache);
            await cache.initialise();
        }

        return cache;
    }
}
