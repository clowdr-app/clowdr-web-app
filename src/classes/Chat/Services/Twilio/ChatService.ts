import { Conference, ConferenceConfiguration, UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import IChatManager from "../../IChatManager";
import IChatService from "../../IChatService";
import Channel from "./Channel";
import { default as LocalStorage_TwilioChatToken } from "../../../LocalStorage/TwilioChatToken";
import DebugLogger from "clowdr-db-schema/src/classes/DebugLogger";
import assert from "assert";

export default class TwilioChatService implements IChatService {
    private twilioToken: string | null = null;
    private conference: Conference | null = null;
    private profile: UserProfile | null = null;
    private sessionToken: string | null = null;

    private _REACT_APP_TWILIO_CALLBACK_URL: string | null = null;

    private logger: DebugLogger = new DebugLogger("TwilioChatService");

    constructor(private manager: IChatManager) {
        // TODO: Remove this line in production
        this.logger.enable();
    }

    async setup(conference: Conference, profile: UserProfile, sessionToken: string) {
        this.conference = conference;
        this.profile = profile;
        this.sessionToken = sessionToken;

        if (!this.twilioToken) {
            if (LocalStorage_TwilioChatToken.twilioChatToken) {
                let token = LocalStorage_TwilioChatToken.twilioChatToken;
                let expiry = LocalStorage_TwilioChatToken.twilioChatTokenExpiry;
                this.twilioToken = null;

                if (token && expiry) {
                    if (expiry.getTime() >= Date.now()) {
                        this.twilioToken = token;
                        this.logger.info("Twilio token found in local storage (considered valid).");
                    }
                }

                if (!this.twilioToken) {
                    this.logger.info("Twilio token found in local storage has expired (considered invalid).");
                }
            }
        }

        if (!this.twilioToken) {
            let { token, expiry } = await this.getToken();
            if (token) {
                this.twilioToken = token;
                LocalStorage_TwilioChatToken.twilioChatToken = token;
                LocalStorage_TwilioChatToken.twilioChatTokenExpiry = expiry;

                this.logger.info("Twilio token obtained.");
            }
            else {
                this.twilioToken = null;
                LocalStorage_TwilioChatToken.twilioChatToken = null;
                LocalStorage_TwilioChatToken.twilioChatTokenExpiry = null;

                this.logger.warn("Twilio token not obtained.");
                throw new Error("Twilio token not obtained.");
            }
        }
    }
    async teardown() {
        throw new Error("Method not implemented.");
    }


    private async get_REACT_APP_TWILIO_CALLBACK_URL(): Promise<string> {
        if (!this._REACT_APP_TWILIO_CALLBACK_URL) {
            assert(this.conference);
            let results = await ConferenceConfiguration.getByKey("REACT_APP_TWILIO_CALLBACK_URL", this.conference.id);
            assert(results.length, "Conference Twilio not configured.");
            this._REACT_APP_TWILIO_CALLBACK_URL = results[0].value;
        }
        return this._REACT_APP_TWILIO_CALLBACK_URL;
    }

    private async getToken(): Promise<{
        token: string | null,
        expiry: Date | null
    }> {
        assert(this.conference);
        assert(this.profile);
        assert(this.sessionToken);

        this.logger.info(`Fetching chat token for ${this.profile.displayName} (${this.profile.id}), ${this.conference.name} (${this.conference.id})`);

        let callbackUrl = await this.get_REACT_APP_TWILIO_CALLBACK_URL();
        const res = await fetch(
            `${callbackUrl}/chat/token`,
            {
                method: 'POST',
                body: JSON.stringify({
                    identity: this.sessionToken,
                    conference: this.conference.id
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        let data = await res.json();
        return { token: data.token, expiry: new Date(data.expiry) };
    }

    allChannels(filter?: string): Promise<Channel> {
        throw new Error("Method not implemented.");
    }
    publicChannels(filter?: string): Promise<Channel> {
        throw new Error("Method not implemented.");
    }
    userChannels(filter?: string): Promise<Channel> {
        throw new Error("Method not implemented.");
    }
    createChannel(name: string, isPrivate: boolean): Promise<Channel> {
        throw new Error("Method not implemented.");
    }
    enableAutoRenewConnection(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    enableAutoJoinOnInvite(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    
}
