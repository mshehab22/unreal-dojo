---
id: p15-who-do-i-call
title: Everyone wants the announcer
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [architecture, subsystems]
terms: [subsystem, world-subsystem, game-instance-subsystem, uinterface, null-object]
prerequisites: [p14-singleton-when-not]
xp: 25
estimatedMinutes: 8
concepts:
  - A caller that names a concrete class is stuck with it, in every place it appears
  - A small interface says what the caller needs and hides which class does it
  - Providers are the classes behind the interface, such as one that shouts, one that writes lines down, and one that does nothing
  - A subsystem is the engine's own place to keep something that must be found from many places
  - A world subsystem lives as long as its world, and a game instance subsystem lives as long as the whole play session
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: fifteen places in the dojo's code (the gong, the bout timer, the score screen, and twelve more) each create a loud speaker class and call its Shout function to announce a line. The testers want every automated test to run silently. How many places have to change?"
choices:
  - One, inside the speaker class itself
  - None, because the engine can mute a class
  - All fifteen places that create it
  - Only the test code, since the rest is untouched
answerIndex: 2
explanation: Each of the fifteen names the speaker class where it uses it, so each one has to change. Nothing else can reach inside them.
```

# Card

Plenty of the dojo needs to speak: the gong, the bout timer, the score screen, the tutorial. Every one of them wants the same thing, a way to say a line out loud. It is tempting to let each write `NewObject<UDojoLoudSpeaker>` and call `Shout`. It works until a tester wants the bouts silent, or the shipped game wants a different voice, or someone wants to read what was said. Then every one of those call sites has to change.

**Say what you need, not what you have.** The code that wants a line spoken only needs one thing: a way to call `Announce(Line)`. That can be written as a small interface, `IDojoAnnouncer`, with that one function. A caller that knows only the interface does not care how a line gets spoken.

**Providers.** Any number of classes can stand behind the interface. One shouts the line into the Output Log. One writes every line down so a test can read it afterwards. One does nothing. They are interchangeable, and none of them has to know who will call it.

**A place to ask.** A caller still has to get hold of an announcer. Passing one down through ten constructors is tedious, and making the caller create its own brings back the problem. A better answer is one place that holds the announcer in use and hands it to whoever asks. Unreal already has a home for that kind of thing: a subsystem. The engine creates it, keeps it alive, and lets any code find it by type with `GetSubsystem`. A **world subsystem** lives as long as the world it belongs to, so it suits things that belong to one level. A **game instance subsystem** lives as long as the whole play session and survives from level to level, so it suits things the player carries with them, such as a profile or a settings service.

**An announcer that always exists.** The first call may arrive before anyone has chosen an announcer. A caller should not have to check for nothing every time. So the place that holds the announcer starts with a stand-in, a **null object**: a real announcer that does nothing, except count the lines it was given. Callers always get something they can call, and a missing announcer cannot crash a bout.

**What this buys.** The gong, the timer, and the score screen all depend on the interface. A test provides the recording announcer and reads the lines back. A silent build provides nothing and gets the null object. Nobody changed any caller.

# Example

```cpp
// Before: the caller names a concrete class and creates it.
UDojoLoudSpeaker* Speaker = NewObject<UDojoLoudSpeaker>(this);
Speaker->Shout(TEXT("Fight!"));

// After: the caller finds the world's announcer and speaks through the interface.
UDojoAnnouncerDesk* Desk = GetWorld()->GetSubsystem<UDojoAnnouncerDesk>();
Desk->Get().Announce(TEXT("Fight!"));
```

# Questions

```yaml
- id: name-the-need
  type: multiple-choice
  prompt: "Which of these is a caller naming what it needs, not what it has?"
  choices:
    - It creates a UDojoLoudSpeaker and calls its Shout function
    - It calls Announce on an announcer interface
    - It includes the header of one particular speaker class
    - It copies the speaker's code into itself
  answerIndex: 1
  explanation: The interface names the one thing the caller wants done. The other three tie the caller to one particular class.
- id: fill-game-instance
  type: fill-blank
  prompt: "A subsystem that lives as long as the whole play session, across every level, is a ___ subsystem."
  acceptedAnswers: [game instance, game-instance, gameinstance, UGameInstanceSubsystem]
  explanation: A game instance subsystem is created with the game instance and survives level changes. A world subsystem lives and dies with one world.
- id: spot-concrete-class
  type: spot-the-bug
  prompt: A bout wants to announce its start, and the testers need to run bouts silently. Which line makes that impossible without editing the bout?
  code: |
    void ADojoBout::Begin()
    {
    	UDojoLoudSpeaker* Speaker = NewObject<UDojoLoudSpeaker>(this);
    	Speaker->Shout(TEXT("Fight!"));
    }
  bugLine: 3
  fix: Find the announcer the world provides and call it through the interface, so a test can provide a different one.
  explanation: The bout creates the one concrete class itself, so there is no way to give it another announcer from outside.
- id: why-null-object
  type: multiple-choice
  prompt: "Why does the place that holds the announcer start with a do-nothing announcer instead of an empty slot?"
  choices:
    - So that the do-nothing announcer is the fastest one
    - Because the engine refuses to create an empty subsystem
    - So that every line is announced twice
    - So callers never need to check for nothing
  answerIndex: 3
  explanation: With a stand-in in place, callers never have to check for nothing. It can count the lines it drops so that an accidental absence is still visible.
- id: which-host
  type: multiple-choice
  prompt: "A service remembers which profile the player chose, and the player moves from the arena level to the garden level. Where should it live?"
  choices:
    - In an actor placed in the arena level
    - In a world subsystem, one per level
    - In a game instance subsystem
    - In a local variable of the bout
  answerIndex: 2
  explanation: Only something owned by the game instance survives the level change. A world subsystem would be rebuilt empty in the garden.
- id: explain-need
  type: explain-in-one-sentence
  prompt: In one sentence, say how fifteen places can use an announcer without any of them naming its class.
  modelAnswer: Each one asks a single place for the announcer in use and calls it through a small interface, so which class stands behind it can be chosen elsewhere.
  rubric:
    - Says callers use an interface and not a concrete class
    - Says there is one place to ask for the announcer in use
  explanation: Callers name the need, one place holds the answer, and the choice is made somewhere else.
```
