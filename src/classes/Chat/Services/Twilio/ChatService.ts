import { Conference, ConferenceConfiguration, UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import IChatManager from "../../IChatManager";
import IChatService from "../../IChatService";
import Channel from "./Channel";
import { default as LocalStorage_TwilioChatToken } from "../../../LocalStorage/TwilioChatToken";
import DebugLogger from "clowdr-db-schema/src/classes/DebugLogger";
import assert from "assert";
import * as Twilio from "twilio-chat";
import { Channel as TwilioChannel } from "twilio-chat/lib/channel";

export default class TwilioChatService implements IChatService {
    private twilioToken: string | null = null;
    private conference: Conference | null = null;
    private profile: UserProfile | null = null;
    private sessionToken: string | null = null;

    private twilioClient: Twilio.Client | null = null;

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
                let confId = LocalStorage_TwilioChatToken.twilioChatTokenConferenceId;
                let profileId = LocalStorage_TwilioChatToken.twilioChatUserProfileId;
                this.twilioToken = null;

                if (confId && token && expiry) {
                    if (confId === conference.id &&
                        profileId === profile.id &&
                        expiry.getTime() >= Date.now()) {
                        this.twilioToken = token;
                        this.logger.info("Twilio token found in local storage (considered valid).");
                    }
                }

                if (!this.twilioToken) {
                    this.logger.info("Twilio token found in local storage considered invalid (expired, different conference, or some other issue).");
                }
            }
        }

        let retry: boolean;
        let attempCount = 0;

        do {
            retry = false;
            attempCount++;

            if (!this.twilioToken) {
                let { token, expiry } = await this.fetchFreshToken();
                if (token) {
                    this.twilioToken = token;
                    LocalStorage_TwilioChatToken.twilioChatToken = token;
                    LocalStorage_TwilioChatToken.twilioChatTokenExpiry = expiry;
                    LocalStorage_TwilioChatToken.twilioChatTokenConferenceId = conference.id;
                    LocalStorage_TwilioChatToken.twilioChatUserProfileId = profile.id;

                    this.logger.info("Twilio token obtained.");
                }
                else {
                    this.twilioToken = null;
                    LocalStorage_TwilioChatToken.twilioChatToken = null;
                    LocalStorage_TwilioChatToken.twilioChatTokenExpiry = null;
                    LocalStorage_TwilioChatToken.twilioChatTokenConferenceId = null;
                    LocalStorage_TwilioChatToken.twilioChatUserProfileId = null;

                    this.logger.warn("Twilio token not obtained.");
                    throw new Error("Twilio token not obtained.");
                }
            }

            assert(this.twilioToken);

            try {
                // TODO: Increase log level if debugger enabled?
                this.twilioClient = await Twilio.Client.create(this.twilioToken);
                this.logger.info("Created Twilio client.");

                this.enableAutoRenewConnection();
                this.enableAutoJoinOnInvite();

                // TODO: Attach to events
            }
            catch (e) {
                this.twilioClient = null;
                if (e.toString().includes("expired")) {
                    this.logger.info("Twilio token (probably) expired.");

                    this.twilioToken = null;

                    if (attempCount < 2) {
                        retry = true;
                    }
                }

                if (!retry) {
                    this.logger.error("Could not create Twilio client!", e);
                    throw e;
                }
            }
        }
        while (retry);
    }

    async teardown() {
        if (this.twilioClient) {
            await this.twilioClient.shutdown();
            this.twilioClient = null;
        }
    }


    private async get_REACT_APP_TWILIO_CALLBACK_URL(): Promise<string> {
        if (!this._REACT_APP_TWILIO_CALLBACK_URL) {
            assert(this.conference);
            let results = await ConferenceConfiguration.getByKey("REACT_APP_TWILIO_CALLBACK_URL", this.conference.id);
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

    private async fetchFreshToken(): Promise<{
        token: string | null,
        expiry: Date | null
    }> {
        assert(this.conference);
        assert(this.profile);
        assert(this.sessionToken);

        this.logger.info(`Fetching fresh chat token for ${this.profile.displayName} (${this.profile.id}), ${this.conference.name} (${this.conference.id})`);

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

    allChannels(filter?: string): Promise<Array<Channel>> {
        throw new Error("Method not implemented.");
    }
    publicChannels(filter?: string): Promise<Array<Channel>> {
        throw new Error("Method not implemented.");
    }
    userChannels(filter?: string): Promise<Array<Channel>> {
        throw new Error("Method not implemented.");
    }
    async activeChannels(filter?: string): Promise<Array<Channel>> {
        function convertChannels(chans: Array<TwilioChannel> | undefined) {
            return chans?.map(chan => {
                return new Channel(chan);
            }) ?? [];
        }

        let channelPages = await this.twilioClient?.getSubscribedChannels();
        let channels: Array<Channel> = convertChannels(channelPages?.items);
        while (channelPages?.hasNextPage) {
            channelPages = await channelPages.nextPage();
            channels = channels.concat(convertChannels(channelPages?.items));
        }

        return channels;
    }

    async createChannel(invite: Array<UserProfile>, isPrivate: boolean, title: string): Promise<Channel> {
        assert(this.conference);
        assert(this.profile);
        assert(this.sessionToken);
        assert(this.twilioClient);
        assert(invite.length > 0);

        let callbackUrl = await this.get_REACT_APP_TWILIO_CALLBACK_URL();
        const res = await fetch(
            `${callbackUrl}/chat/create`,
            {
                method: 'POST',
                body: JSON.stringify({
                    identity: this.sessionToken,
                    conference: this.conference.id,
                    invite: invite.map(x => x.id),
                    mode: isPrivate ? "private" : "public",
                    title: title
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        let data = await res.json();
        return new Channel(await this.twilioClient.getChannelBySid(data.channelSID));
    }

    async enableAutoRenewConnection(): Promise<void> {
        this.logger.info("Enabling auto-renew connection.");
        this.twilioClient?.on("tokenAboutToExpire", async () => {
            assert(this.conference);
            assert(this.profile);

            this.logger.info("Token about to expire");

            let { token, expiry } = await this.fetchFreshToken();
            if (token) {
                this.twilioToken = token;
                LocalStorage_TwilioChatToken.twilioChatToken = token;
                LocalStorage_TwilioChatToken.twilioChatTokenExpiry = expiry;
                LocalStorage_TwilioChatToken.twilioChatTokenConferenceId = this.conference.id;
                LocalStorage_TwilioChatToken.twilioChatUserProfileId = this.profile.id;

                this.logger.info("Twilio token for renewal obtained.");

                await this.twilioClient?.updateToken(token);
            }
            else {
                this.twilioToken = null;
                LocalStorage_TwilioChatToken.twilioChatToken = null;
                LocalStorage_TwilioChatToken.twilioChatTokenExpiry = null;
                LocalStorage_TwilioChatToken.twilioChatTokenConferenceId = null;
                LocalStorage_TwilioChatToken.twilioChatUserProfileId = null;

                this.logger.warn("Twilio token for renewal not obtained.");
                throw new Error("Twilio token for renewal not obtained.");
            }
        });
    }

    async enableAutoJoinOnInvite(): Promise<void> {
        this.logger.info("Enabling auto-join on invited.");
        this.twilioClient?.on("channelInvited", async (channel) => {
            channel.join();
        });
    }
}
