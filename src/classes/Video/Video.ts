import { Conference, TextChat, UserProfile } from "@clowdr-app/clowdr-db-schema";
import DebugLogger from "@clowdr-app/clowdr-db-schema/build/DebugLogger";
import Parse from "parse";

export default class Video {
    private static video: Video | null = null;

    private logger: DebugLogger = new DebugLogger("Video");

    private initialisePromise: Promise<boolean> | null = null;
    private teardownPromise: Promise<void> | null = null;

    constructor(
        private conference: Conference,
        private profile: UserProfile,
        private sessionToken: string
    ) {
        // TODO: Remove this line in production
        this.logger.enable();
    }

    private async setup(): Promise<boolean> {
        if (!this.initialisePromise) {
            this.initialisePromise = new Promise(async (resolve, reject) => {
                resolve(true);
            });
        }

        return this.initialisePromise;
    }

    private async teardown(): Promise<void> {
        if (!this.teardownPromise) {
            if (this.initialisePromise) {
                const doTeardown = async () => {
                    this.logger.info("Tearing down video client...");
                    this.logger.info("Tore down video client.");
                    this.initialisePromise = null;
                }

                this.teardownPromise = this.initialisePromise.then(async () => {
                    await doTeardown();
                }).catch(async (err) => {
                    this.logger.warn("Ignoring video initialisation error as we're teraing down anyway.", err);
                    await doTeardown();
                });
            }
            else {
                return Promise.resolve();
            }
        }

        return this.teardownPromise ?? Promise.resolve();
    }

    public async createVideoRoom(capacity: number, ephemeral: boolean, isPrivate: boolean, name: string, textChat?: TextChat): Promise<string> {
        return Parse.Cloud.run("videoRoom-create", {
            capacity,
            ephemeral,
            isPrivate,
            name,
            textChat: textChat?.id,
            conference: this.conference.id
        });
    }

    public static async setup(conference: Conference, user: UserProfile, sessionToken: string): Promise<boolean> {
        let result = false;

        if (!Video.video) {
            Video.video = new Video(conference, user, sessionToken);
        }

        result = await Video.video.setup();

        if (!result) {
            Video.video = null;
        }

        // @ts-ignore
        if (!window.clowdr) {
            // @ts-ignore
            window.clowdr = window.clowdr || {};
        }

        // @ts-ignore
        window.clowdr.video = Video.video;

        return result;
    }

    public static async teardown() {
        try {
            await Video.video?.teardown();
        }
        finally {
            Video.video = null;
            // @ts-ignore
            if (window.clowdr && window.clowdr.video) {
                // @ts-ignore
                window.clowdr.video = null;
            }
        }
    }

    public static instance(): Video | null {
        return Video.video;
    }
}
