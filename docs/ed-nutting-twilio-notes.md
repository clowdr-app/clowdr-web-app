# Twilio Notes

## JS SDK

https://www.twilio.com/docs/chat/initializing-sdk-clients#javascript

"
Some additional details on the JavaScript SDK behavior:

    - It will subscribe to notifications for changes to the Subscribed Channel list itself
    - It will subscribe to events from each Subscribed Channel in the list
    - It will retrieve the FriendlyName , UniqueName, and Attributes for each Subscribed Channel in the list
    - It will not retrieve any Messages for individual Channels
    - It will retrieve Member lists for Channels
    - It will not retrieve nor subscribe to Users linked to Members of Subscribed Channels
    - It will retrieve a currently logged in User object and subscribe to this User's events

"


## Creating tokens

https://www.twilio.com/docs/chat/create-tokens

- Twilio Account Sid
- Programmable Chat Service Sid
- Twilio API Key Sid
- Twilio API Secret 
- Identity
- Optional: TTL (Time To Live) 
  Default is 3600 seconds = 1 hour, Max is 24hr.
  We may want to increase this to 3 hours for a typical conference session.


## SDK Lifecycle

https://www.twilio.com/docs/chat/best-practices-sdk-clients

- Shutdown needs to be called only when doing logout / login within the same SDK session.
- It is highly recommended to create a new Chat SDK instance, do not reuse the old instance for the new SDK initialization after shutting down inside the same session.
- Pre-fetch token and store in temporary storage in case you would need faster startup - you can save round trip time to your token generator.


JavaScript

Some additional details about the JavaScript SDK behavior:

    1. Promise to create Client is resolved after we started all connections, not all channels fetched.
    2. Fetching of user's subscribed channels starts asynchronously and continues after Client instance is resolved in Promise.
    3. Due to (1) and (2) to get the list of subscribed channels, you will need first to subscribe to `Client#channelAdded` and `Client#channelJoined` events and only after call the `getSubscribedChannels` method.
	   `getSubscribedChannels` is paginated, hence duplicated channels might arrive from two sources: from events and from this method call, it's up to the developer to resolve it.
    4. Channel's Messages are not fetched on Channel load automatically - hence, only `Channel#messageAdded` event is emitted on new messages.
       - if customer deliberately fetched some messages, then `Channel#messageUpdated` and `Channel#messageRemoved` events are emitted only on those fetched messages.
    5. Some methods are semi-realtime, i.e. guarded by caching with some lifetime, calling them rapidly might not reflect actual value, but will catch up after cached value expires:
        - `Channel.getMembersCount()`
        - `Channel.getMessagesCount()`
        - `Channel.getUnconsumedMessagesCount()`


## Channels

Channel Descriptors can be used to obtain a full channel object or view the following information:

    Channel SID
    Friendly Name
    Unique Name
    Date Created
    Created By
    Date Updated
    Channel Attributes
    Messages and Members Count
    Last Consumed Message Index (if available)
    Status (if available)
    Type (private or public)

A full Channel object allows you to join and interact with the channel. Let's dive into a few of the key techniques you'll need to employ while working with channels and messages in your application.

    Listing public channel descriptors
    Listing user channel descriptors
    Get a channel from a channel descriptor
    Create a channel
    Join a channel
    Send messages to a channel
    Get most recent messages from a channel
    Invite other users to a channel
    Accept an invitation to a channel
    Get a list of subscribed channels
    Subscribe for channel events
    Delete a channel


## Retrieving messages

https://www.twilio.com/docs/chat/channels?code-sample=code-join-a-channel-13&code-language=JavaScript&code-sdk-version=default#get-the-most-recent-messages-from-a-channel

Note: The Message index property may increment by more than 1 between messages. These indices will be ordered by when the message was received and you should use the index property to order them in your UI.
