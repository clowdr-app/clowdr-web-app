# Things to do

## High-priority small things (for ICSE if possible)

Highest priority:
    - Documentation
         - lots more writing to be done!
         - @Jon and @Crista please take a look if you have time
         - One specific thing where I need help from one of you is
    - Who can delete rooms (e.g., can BCP?)

Little UI things for Jon
    - Did we implement the "mute someone else's mic and put a message in the
      chat" feature?  Seems important!
    - Make max width of the the sidebar larger, so that people can expand it
      when they're using it to view the slido
    - Make avatars a little larger!
    - Put the sidebar user list back to most-recent-first
    - Change number of columns in lobby display depending on screen size
      (implemented, but needs to be checked with several different sizes)

Little UI things for anybody:
    - make sure all controls have hover text
    - make all popovers take .5 seconds to appear
    - Try slightly more muted colors for the tags / flairs

- Design issues
    - I don't like the way going to look at the program, look at My Account,
      etc. takes me out of whatever conversation I'm in
    - The way chats pop up as you move around (and then stay up after you
      leave a space) seems suboptimal.  And the full-height chat bar on the
      right-hand side is using up a lot of screen real estate for (to me)
      unknown benefit (why do I want to spend that much screen on that
      particular chat window?).  In general, I don't think our chat
      interface is quite there yet.

## Lower-priority small things (after ICSE)

- Screen layout nit: When displaying on a laptop, it would be good to put
  other people's videos on the very top of the screen, near the camera!

- Consider (optionally) sorting participant list by
    - whether I've designated them as a friend
    - their topics / research interests
    - do they want to be visible at all
- room lists could be sorted the same way, BTW -- or, e.g., color all the
  type theory people green, and show green dots on the rooms where they are
  hanging out

- What about a button to make a public room temporarily private (and then it goes
  back to public when everybody leaves)

- if we added a couple of small features to a slack-like chat channel,
  maybe we could get away without slido.
     - Thumbs-up button (like slack)
     - This-is-a-question-for-the-speaker button
     - Display only questions from this channel, sorted by
       most-thumbs-first.

- dntWaiver = "Only you can see this status. Others will still see your
  presence in public rooms, but won't see a status" -- ... But this is the
  only status that will be displayed as blank, so won't people be able to
  infer it?

- Try to rename the "End call" button to "Back to lobby"

- need to think about screen real estate on small (laptop, ipad) screens --
  e.g.
       - the title bar across the top uses a lot of space
       - the "live questions to the speakers" goes entirely off the bottom

- The pop-up for someone's name in the lobby does not include their textual
  status (or profile); the one on the left sidebar does

- presenceDesc = "In a conversation; come join if you like"; -- have we made
  it possible / obvious how to go to where someone else is??

- should there be a visual indication of which rooms are small/large/P2P?

## Larger things to think about post-ICSE

- integration with Researchr for #LIVE "go to what's happening now"

- What about watching multiple channels at the same time?

- Mobile friendliness
- Logging in from multiple devices??

- Implement Jon's "Post a 'come to me' button in a chat" feature

- What about live captioning (as an eventual feature).

- should chat logs be logged somewhere so that, for example, allegations of
  misconduct can be investigated?  (Or should there be, for example, an
  option to include the chat log in what gets sent to a moderator? or?)
  More generally, what information do moderators need to do their job?

## Random fun features

- Snarky reviewer #3 bots


# --------------------------------------------------
# Design notes

## Design alternatives for "take me someplace random"

manual version:
  - Lobby session has ten (or more, if we want) breakout rooms, named
    something obvious like "Looking for conversation #1", etc.
  - If you want random conversation, take a look at who is in these rooms
    and join one if you like.
  - Otherwise, park yourself in an empty room and wait for other people to
    show up.
  - Alternatively, roll a ten-sided die and go to the indicated room.
  - Done.  :-)

almost manual version:
  - Same as above, except there's a button at the bottom of the screen when
    you're in the lobby session that says "Go to a random Looking For
    Conversation" room.  Press the button and it takes you to one of the
    rooms with this label (that does not have more than four people in it
    right now).

## Thoughts about Sli.do

- First question: How hard would it be to include Sli.do functionality in
  the talk chat?  I think we'd need, at at minimum, (1) to be able to add an
  annotation to a post marking it as a question for the speaker, (2) a way
  for other people to "upvote" questions (by adding a thumbs up or
  something), and (3) a way for session hosts (and maybe everybody) to
  filter and sort posts to see only questions.

  However, having said this, I am actually beginning to wonder whether we
  need this sort of functionality at all in Clowdr.  After all, the plan (at
  least for ICSE, I believe) is to have essentially all the talks
  pre-recorded.  So authors themselves are going to be watching the chat
  stream and either they or session chairs can choose which questions and
  comments to respond to live.

  To make the platform flexible, we may well want to support easy
  integration with sli.do and other such tools, but perhaps this is as easy
  as a generic "embed such-and-such URL in an iframe when this talk is going
  on."

## Design ideas from SCW

Just talking with Richard and he mentioned two ideas for Clowdr:

- "Random" social event.  Everyone who signs up gets placed in a random room
  for a short meet & greet. I guess this is similar to Zoom's breakout room
  feature, but we should look into how many people this could support at
  once. A better option would be to let people specify/select a few topics
  when they sign up that they are interested to increase the chance that the
  interactions go well.

- Q&A specific video room. Only three video streams allowed at a time:
  author, current question asker and moderator. Any one who wants to ask a
  question needs to join the queue and wait for their turn. Any number of
  people can observe the discussion

## Design notes from / PLMW debrief

- Lots of disagreement about whether lurking is a good thing.  Roopsha
  observed that shy people may have a lot of trouble goijng from lurking to
  participating mode.  She would actually prefer that there NOT be this
  lurking mode that we've discussed.  As she said, perhaops all we need to
  do is to socialize people so that popping into and out of rooms is
  considered acceptable, not rude.

  This also makes me wonder about different mechanisms for making it easy
  for people to join rooms.  E.g., we could mark rooms when they are created
  (and indicate when we show them) whether they are "manual join only" or
  "random join allowed."  And then we make a "join a random room" button.

  We might need to have a "block this person" feature where, for example,
  "take me to a random room" would never take me to a room where this person
  is currently present.  Or maybe this is inventing too much mechanism to
  deal with problems that we don't udnerstand yet.

- Create a “How to get the most out of this virtual experience” document for
  attendees? Our tips/lessons learned to stay engaged
     - Quiet space, write on slack, engage in Disco to actually meet people, …
     - Clear out other meetings: you are attending PLMW, trying to do your
       day job  at the same time doesn’t work
     - Popping into and out of rooms is fine

- Scheduling: Both the official and especially the unofficial parts of a
  conference are a gigantic constraint solving problem.  It's not so bad
  when people are onsite because there's a global structure that lots of
  little things can happen within, serendipitiously.  Less good if many
  more, even informal, things need to be scheduled.  We could build some
  technology to help with this, but I wonder if there is some kind of
  third-party scheduling tool that we could integrate... Surely this is a
  common problem?

## Further design notes and conversations

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


# --------------------------------------------------
# Miscellaneous notes
## Notes and observations from PLDI 2020

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

## Notes from the 6/12 stress test

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

## Notes on other systems

### Gather / Online town

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
