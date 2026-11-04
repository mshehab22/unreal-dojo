---
id: p15-service-locator-when-not
title: When asking a phone book hides too much
order: 6
kind: concept
difficulty: 2
patterns: [service-locator]
skills: [service-locator, architecture]
terms: [subsystem, world-subsystem, null-object, beginplay, cdo]
prerequisites: [p15-gong-refactor]
xp: 25
estimatedMinutes: 8
concepts:
  - A dependency that belongs to one relationship should be passed in or found through its owner, not located
  - A locator hides what a class needs, so a class cannot be read or tested from its signature alone
  - A provider fetched once and kept goes stale when the desk's provider changes
  - A subsystem used as a bag of shared state is a global in disguise
  - Located services are not ready before setup has provided them
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a bell's chime should be as loud as the gong that set it ringing. A teammate proposes registering every gong's volume with a locator so the bell can look it up. Right call?"
choices:
  - Yes, a locator is the right place for anything many classes need
  - No; the bell already knows which gong rang it, so pass that gong in or read the volume through it
  - Yes, but only with a game instance subsystem
  - No; health should be a console variable
answerIndex: 1
explanation: The gong is part of this one chime, not a service for the whole game. Passing it in, or reaching its volume through it, keeps the relationship visible.
```

# Card

A locator is useful for a few things and harmful when it becomes the default way to get anything. Leave it out in these cases.

**A dependency that belongs to one relationship.** The announcer is wanted by the gong, the timer, and the score screen alike. The health of the fighter being hit is wanted by one attack, about one target. That target is already in the attack's hands, or reachable through the actor that owns it. Looking it up through a locator hides a connection the code should show.

**Hidden dependencies.** A function that takes its target as a parameter tells you what it needs. A function that quietly asks three services for what it needs tells you nothing in its signature. To read it you have to read its body, and to test it you have to set up every service it might reach. The more the code leans on a locator, the more of the game each class secretly needs.

**A provider fetched once and kept.** The desk's provider can change while the game runs: a test slips a tracer in front, a setup swaps in a new announcer. A caller that asked for the announcer once, in `BeginPlay` or the constructor, and keeps the pointer, goes on talking to the one it fetched. The tracer sees nothing, the new announcer hears nothing, and the old one may even be gone. Ask the desk each time you need the service, and keep the desk's address if you like, but not the provider.

**A subsystem as a bag of shared state.** It is easy to hang "the current target", "the selected weapon", and "the last score" on a world subsystem because everyone can reach it. That is a global variable with a nicer name. State that belongs to a bout belongs to the bout. A subsystem should hold a service, not the facts one part of the game is passing to another.

**Before setup has run.** A located service only exists in the form you want after setup code has provided it. A constructor, which also runs for the class default object, has no world to ask. Code that runs very early may find only the null object. The null object keeps it from crashing, but also hides the mistake, so make it count or log what it drops.

**A place that is only valid sometimes.** If a facility must only be used during one phase, or by one family of classes, a global lookup cannot make sure of that. Put it behind the objects that own the phase, or make the getter reachable only by those classes.

# Example

```cpp
// Right-sized: the attack gets its target, so nothing is hidden.
void ADojoRival::Strike(ADojoFighter* Target)
{
	Target->TakeHit(Damage);
}
```

# Questions

```yaml
- id: when-not-target
  type: multiple-choice
  prompt: "Which of these is the poorest fit for a service locator?"
  choices:
    - The announcer every system speaks through
    - The analytics sink every system reports to
    - The particular crate a player is opening right now
    - The saving of the player's profile
  answerIndex: 2
  explanation: The crate belongs to one interaction. It is not a service for the whole game, so it should be passed in or reached through the actor that owns it.
- id: when-not-stale
  type: multiple-choice
  prompt: "A bell fetches the announcer in BeginPlay and keeps the pointer. Later a test provides a different announcer. Whom does the bell announce to?"
  choices:
    - The new announcer, because the desk tells it
    - Both announcers
    - Nobody; the engine stops the bell
    - The one it fetched at BeginPlay, which is no longer the one in place
  answerIndex: 3
  explanation: A pointer kept from BeginPlay keeps pointing at the old announcer. The desk can only answer when it is asked again.
- id: spot-kept-provider
  type: spot-the-bug
  prompt: A bell announces when rung, and tests swap the announcer between rings. Which line makes the bell keep talking to an old announcer?
  code: |
    void ADojoBell::BeginPlay()
    {
    	Super::BeginPlay();
    	Announcer = &UDojoAnnouncerDesk::Locate(GetWorld())->Get();
    }
  bugLine: 4
  fix: Keep nothing from BeginPlay; locate the desk and ask for the announcer each time the bell is rung.
  explanation: The announcer in place can change after BeginPlay, and the bell would go on using the one it stored.
- id: when-not-bag
  type: multiple-choice
  prompt: "A teammate adds fields for the current target, the selected weapon, and the last score to a world subsystem so that any class can read them. What is this?"
  choices:
    - A global variable in disguise
    - A good use of a locator
    - A null object
    - A decorator
  answerIndex: 0
  explanation: The values are facts passed between parts of the game, not a service. Everyone can reach and change them, which is what a global is.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a service locator is the wrong choice.
  modelAnswer: When the dependency belongs to one relationship and should be passed in or reached through its owner, because a locator hides what a class needs and lets stale or global state creep in.
  rubric:
    - Names a case such as a dependency for one relationship, hidden dependencies, shared state in disguise, or a kept provider going stale
    - Says what to do instead, such as passing it in or reaching it through its owner
  explanation: Use a locator for a few cross-cutting services, and pass in or reach through the owner everything else.
```
