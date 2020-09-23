import { Conference, UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import DebugLogger from "clowdr-db-schema/src/classes/DebugLogger";
import IChatManager from "./IChatManager";
import ParseMirrorChatService from "./Services/ParseMirror/ChatService";
import TwilioChatService from "./Services/Twilio/ChatService";

export default class Chat implements IChatManager {
    private static chat: Chat | null = null;

    private initialisePromise: Promise<boolean> | null = null;
    private teardownPromise: Promise<void> | null = null;

    private twilioService: TwilioChatService | null = null;
    private mirrorService: ParseMirrorChatService | null = null;

    private logger: DebugLogger = new DebugLogger("Chat");

    constructor(
        private conference: Conference,
        private profile: UserProfile,
        private sessionToken: string
    ) {
        // TODO: Remove this line in production
        this.logger.enable();
    }

    // TODO: Direct requests to the correct service
    // TODO: Handle + emit events for upgrade of service from Twilio to Mirrored
    // TODO: Notifications

    private async setup(): Promise<boolean> {
        if (!this.initialisePromise) {
            this.initialisePromise = new Promise(async (resolve, reject) => {
                try {
                    if (this.twilioService || this.mirrorService) {
                        this.logger.warn("Failed to teardown before re-initialising?!");
                    }

                    this.twilioService = new TwilioChatService(this);
                    await this.twilioService.setup(this.conference, this.profile, this.sessionToken);

                    this.mirrorService = new ParseMirrorChatService(this);
                    await this.mirrorService.setup(this.conference, this.profile, this.sessionToken);

                    resolve(true);
                }
                catch (e) {
                    reject(e);
                }
            });
        }
        else {
            this.logger.warn("Re-initialisation of chat without waiting for teardown.")
        }

        return this.initialisePromise;
    }

    private async teardown(): Promise<void> {
        if (!this.teardownPromise) {
            if (this.initialisePromise) {
                const doTeardown = async () => {
                    this.logger.info("Tearing down chat client...");

                    if (this.twilioService) {
                        try {
                            await this.twilioService.teardown();
                            this.twilioService = null;
                        }
                        catch (e) {
                            this.logger.error("Failed to tear down Twilio chat service", e);
                        }
                    }

                    if (this.mirrorService) {
                        try {
                            await this.mirrorService.teardown();
                            this.mirrorService = null;
                        }
                        catch (e) {
                            this.logger.error("Failed to tear down Parse Mirror chat service", e);
                        }
                    }

                    this.logger.info("Tore down chat client.");
                    this.initialisePromise = null;
                }

                this.teardownPromise = this.initialisePromise.then(async () => {
                    await doTeardown();
                }).catch(async (err) => {
                    this.logger.warn("Ignoring chat initialisation error as we're teraing down anyway.", err);
                    await doTeardown();
                });
            }
            else {
                return Promise.resolve();
            }
        }

        return this.teardownPromise ?? Promise.resolve();
    }

    public static async setup(conference: Conference, user: UserProfile, sessionToken: string) {
        let result = false;

        if (!Chat.chat) {
            Chat.chat = new Chat(conference, user, sessionToken);
            result = await Chat.chat.setup();

            if (!result) {
                Chat.chat = null;
            }
        }

        // @ts-ignore
        if (!window.clowdr || !window.clowdr.chat) {
            // @ts-ignore
            window.clowdr = window.clowdr || {};
            // @ts-ignore
            window.clowdr.chat = Chat.chat;
        }

        return result;
    }

    public static async teardown() {
        try {
            await Chat.chat?.teardown();
        }
        finally {
            Chat.chat = null;
            // @ts-ignore
            window.clowdr.chat = null;
        }
    }

    public static instance() {
        return Chat.chat;
    }
}
