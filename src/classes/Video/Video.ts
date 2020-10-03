import { Conference, ConferenceConfiguration, TextChat, UserProfile, VideoRoom } from "@clowdr-app/clowdr-db-schema";
import DebugLogger from "@clowdr-app/clowdr-db-schema/build/DebugLogger";
import assert from "assert";
import Parse from "parse";

export default class Video {
    private static video: Video | null = null;

    private logger: DebugLogger = new DebugLogger("Video");

    private _REACT_APP_TWILIO_CALLBACK_URL: string | null = null;

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

    public async inviteToRoom(room: VideoRoom, users: Array<string>): Promise<{ [k: string]: boolean }> {
        return Parse.Cloud.run("videoRoom-invite", {
            conference: this.conference.id,
            room: room.id,
            users,
            write: false
        });
    }

    private async get_REACT_APP_TWILIO_CALLBACK_URL(): Promise<string> {
        if (!this._REACT_APP_TWILIO_CALLBACK_URL) {
            assert(this.conference);
            const results = await ConferenceConfiguration.getByKey("REACT_APP_TWILIO_CALLBACK_URL", this.conference.id);
            if (results.length > 0) {
                this._REACT_APP_TWILIO_CALLBACK_URL = results[0].value;
            }
            else {
                this.logger.warn("Twilio not configured for this conference.");
                throw new Error("Twilio not configured for this conference.");
            }
        }
        return this._REACT_APP_TWILIO_CALLBACK_URL;
    }

    public async fetchFreshToken(room: VideoRoom): Promise<{
        token: string | null,
        expiry: Date | null,
        twilioRoomId: string | null
    }> {
        assert(this.profile);
        assert(this.conference);

        this.logger.info(`Fetching fresh video token for ${this.profile.displayName} (${this.profile.id}), ${this.conference.name} (${this.conference.id})`);

        const result = await this.requestClowdrTwilioBackend("token", {
            room: room.id
        });
        return { token: result.token, expiry: new Date(result.expiry), twilioRoomId: result.twilioRoomId };
    }

    public async requestClowdrTwilioBackend(
        endpoint: "token",
        data: any = {}
    ) {
        assert(this.sessionToken);
        assert(this.conference);

        data.identity = this.sessionToken;
        data.conference = this.conference.id;

        const callbackUrl = await this.get_REACT_APP_TWILIO_CALLBACK_URL();
        const res = await fetch(
            `${callbackUrl}/video/${endpoint}`,
            {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        const result = await res.json();
        if (res.status !== 200) {
            throw new Error(result.status);
        }
        return result;
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
