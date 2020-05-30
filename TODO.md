# Short-term tasks

- Make the “lobby session” channels also show up in the slack-like
  interface.  So people can discover them that way too.

- add an option to invite people into channels

- add a video button to the slack-style interface to allow you to join those
  calls that way too

- support private chats, which will live outside of the slack-style window
  and in their own popped out little chat windows like in facebook messenger 

- integration with Researchr for #LIVE "go to what's happening now"

# Random fun features

- Snarky reviewer #3 bots

# Design notes and conversations

- (Benjamin) Should the chat history be readable by new participants joining
  the room? I can imagine either choice being reasonable. Maybe we want to
  allow this to be configured when the room is created (and make sure that,
  at any time, it is obvious who will be able to see any given chat message
  both now and in the future).

  (Crista) It can be configurable. But config vars make things less
  natural. A good rule of thumb is this: if it's a named channel, then the
  chat history is available for newcomers; if it's not a named channel, and
  it's just an ad-hoc group chat, then newcomers will only see messages from
  the time at which they join. Named channels are persistent spaces, they
  exist beyond the people there.

- From the Eurosys blog post: In a virtual environment, the “activation
  threshold” for conversations may be higher (e.g., grad students may feel
  even less comfortable initiating a conversation with a senior researcher
  than in person), so there may be a larger role for semi-structured forms
  of interaction like pairing students with mentors.
