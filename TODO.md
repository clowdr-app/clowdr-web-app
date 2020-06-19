# Ideas for short-term tasks

- "raise hand" feature

- should chat logs be logged somewhere so that, for example, allegations of
  misconduct can be investigated?  (Or should there be, for example, an
  option to include the chat log in what gets sent to a moderator? or?)
  More generally, what information do moderators need to do their job?

- should rooms have "owners" or "moderators" who can do things like mute
  participants?

- should there be a visual indication of which rooms are small/large/P2P?

- What does "Lobby Session" mean and why are we spending so much screen real
  estate on it. :-)

- Make the “lobby session” channels also show up in the slack-like
  interface.  So people can discover them that way too.

- Rephrase the Report button hover-over text: "Report a user or ban them
  from this room" or something
- add hover text for the maximize and other buttons

- add an option to invite people into channels

- integration with Researchr for #LIVE "go to what's happening now"

- What about watching multiple channels at the same time?

- Mobile friendliness??

- Logging in from multiple devices??

- Sorting participant list by
    - whether I've designated them as a friend
    - their topics / research interests
    - do they want to be visible at all
- room lists could be sorted the same way, BTW -- or, e.g., color all the
  type theory people green, and show green dots on the rooms where they are
  hanging out

- make max people in room be a parameter when you create the room (maybe
  correlated with what type of room)

- people also wondered what kind of web analytics is happening when you're
  running this in your browser

# Notes and observatoons from PLDI 2020

- Slack is problematic for structuring discussion about many talks: e.g. for
  REMS-DeepSpec, there was one slack channel and the organizers sent a
  message for each talk, which people were asked to use to ask questions.
  This worked sort-of OK, but as the day wore on it became increasingly hard
  to find the pinned talk threads.

- In the top-level Lobby view, each room says "No data" under the title.

- It's a bit weird to arrive at an empty room and notice that I can view the
  transcript of earlier conversations in that space in the chat. The video
  and chat modalities raise conflicting expectations.

- Using a Slack DM to get someone's attention in Clowdr doesn't always work
  very well!  More generally, there is (expectedly) a big problem with focus
  of attention!

- It would be so helpful to have a timezone converter constantly visible
  (e.g., a little clock in the corner displaying the current time in the
  "conference timezone").  Yes, people can set up their own, but I think it
  might also help lend a sense of cohesion to the program.

# Notes from the 6/12 stress test

- Change "Not following" to "Follow"

- Names don't display for audio-only participants

- Sound quality is not fantastic -- lots of crackling, distortion, dropouts,
  etc.  (Zoom has spoiled us, I'm afraid.)  Also, the "speaker override"
  feature seems quite heavy. Rooms with very many people did not work well.

- When I join a room I seem to get a huge dump of notifications for that
  room.

- The activity notification is way too distracting

- GUI jumps all over the place when people come and go.  And I think the
  sound disruptions tend to happen then too.

- Room contents in the list on the left should definitely be minimized by
  default

- We need a way of garbage collecting persistent rooms; otherwise there are
  going to be hundreds of them!

- I wasn't sure what the connection quality indicator meant.  Maybe we
  should try to use the semi-circular wifi icon?

- People with bad connections sounded _WAY_ worse than they do on Zoom.

- Lots of people got the Insufficient Bandwidth thing

- Could not figure out how to get back to the top-level lobby (with all the
  rooms displayed in the middle of the screen) except at the very beginning
  when I arrive from slack.  (And why didn't I arrive in the foo room if I
  said "/video foo" to slack?)

- The current speaker should be identified visually (especially if they are
  audio-only).

- Different aspect-ratio videos get displayed in different size thumbnails
  (this is distracting)

- What's the recommended procedure for creating a new room and inviting
  someone to go there.

- maybe we can make the little photo thumbnails smaller to conserve vertical
  real estate when the list of rooms and people in rooms gets longer?

# Random fun features

- Snarky reviewer #3 bots

# Design notes and conversations

- There could be multiple ways of using user profile / list of topics /
  micro-CV information. The obvious one is for search: show a score next to
  people’s names based on topic similarity, or whatever (I’ve heard that
  neurips used this idea to do some kind of speed dating thing). A less
  obvious but perhaps more useful one is for quick introductions: If I’m
  standing next to someone in a virtual conversation, I can click on their
  name and see a pop-up window with a little half-page summary of things
  they want other people to know about them — interests and passions, a few
  publications, extracurriculars, ….

- "Monopresence": each participant should have at most one place where they
  "are": i.e., where they are partipating with full attention.  Not sure I
  am sold on this yet, though it's certainly a design principle worth
  discussing.  For example, when we get around to creating our own text
  chat, I really want to be able to quickly read and respond to occasional
  text messages in several channels at the same time.  Maybe the two wishes
  can be reconciled by saying that I can be in multiple places in "watching
  mode" but only one in "participating mode" -- e.g., if I see a chat
  message I need to respond to, I have to "go" to that chat to do so.  (But
  even this model leaves me "present" in two places in two ways: text and
  video.)

- "Locatability": What if each attendee could maintain an associated
  "current status" that would be displayed along with their name (and, when
  appropriate, current location)?  Possible statuses could include
    - In a session (i.e., paying attention to something, not interruptable)
    - Hanging out (along with maybe a button to DM them on Slack)
    - Offline

- One acid test for a flexible platform: The industrial reception
    - Another: the "town hall" or business meeting
    - Another: Posters
    - Other receptions

- (Benjamin) I really liked some aspects of the “attenuated A/V” thing that
  Gather does when someone is joining a group, or is nearby but hasn’t
  joined it yet. I still want to experiment with finding an analog of this
  in the 1d metaphor. E.g., what if each room had a “center” and a “lobby”,
  and you had to explicitly choose which to be in... Only people in the
  center can talk, but everybody can see and hear the peopler in the
  center. The people in the lobby are also visible, but a bit grayed out (or
  smaller, or something), and not audible.

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

  How do the participants in an ongoing conversation signal that it is OK
  for you to join?

- what if each room had a “center” and a “lobby”, and you had to explicitly
  choose which to be in?  Only people in the center can talk, but everybody
  can see and hear the peopler in the center.  The people in the lobby are
  also visible (to all), but a bit grayed out (or smaller, or something),
  and not audible.

# Notes on other systems

## Gather / Online town

This seems very preliminary!  They seem full of ideas, but not ready for
prime time.

The spatialized audio is a mixed blessing.  If you're close to two
conversations, you'll hear both of them, but the people on the far ends of a
single conversation can't necessarily hear each other.

The 2d metaphor is actually makes it quite hard to figure out who is where
(or even to figure out what the map looks like).

Users
  ICLR used it as a social space (they put it together the night before!)
  60-70 people in the room at the same time
  (they had been using rocketchat, but this is better)
  SIGMOD is upcoming

they've been working on this for a total of nine weeks!

talking to a bunch of other July / Aug conferences

Alex, Phillip, Saleem, ...

They rely on firebase, which doesn't work in china
