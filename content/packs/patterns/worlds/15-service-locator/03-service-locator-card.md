---
id: p15-service-locator-card
title: A phone book for services
order: 3
kind: concept
difficulty: 2
patterns: [service-locator]
skills: [service-locator, subsystems]
terms: [subsystem, world-subsystem, game-instance-subsystem, uinterface, null-object, tscriptinterface, console-command]
prerequisites: [p15-announcer-desk]
xp: 25
estimatedMinutes: 9
concepts:
  - A service locator has three parts, an interface, providers behind it, and one place that hands out the provider in use
  - Callers depend on the interface only, and the choice of provider is made in one place elsewhere
  - A missing service can be answered with nullptr, with an assert, or with a null object, and each has a price
  - Unreal's subsystems are the usual locator, and the engine has older forms too
  - The pattern hides dependencies, so it is for cross-cutting services and not for everything a class needs
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the dojo's gong, bout timer, and score screen all announce lines through the announcer interface. Where should the decision about which announcer class to use (loud, recording, or silent) be made?"
choices:
  - In each of the three callers, with a switch on a setting
  - In one place that sets the world up, which provides the announcer once
  - Inside every announcer class, which checks whether it should speak
  - Nowhere; the engine picks the loudest one
answerIndex: 1
explanation: The point of the interface is that callers do not choose. One setup place picks the provider, and every caller follows without changing.
```

# Card

What you built with the announcer desk is the **Service Locator** pattern. A service is something many parts of the game need but none of them owns: speaking a line, writing an analytics event, saving a file, playing a sound. A locator is how code finds a service by what it can do: the caller asks for the interface and is handed whichever provider is set up, never a class name.

**Three parts.**

- **The service interface.** `IDojoP15Announcer` says what can be asked: `Announce(Line)`.
- **Providers.** The classes that implement it: the shouting one, the recording one, the do-nothing one.
- **The locator.** The place that holds the provider in use and hands it out. In Unreal that is usually a subsystem: `UWorld::GetSubsystem<T>()` finds a world subsystem, and `UGameInstance::GetSubsystem<T>()` finds a game instance subsystem, by type. It can store the provider as a plain object pointer and cast it when needed, or as a `TScriptInterface<IDojoP15Announcer>`, a pointer that is known to implement the interface.

Somewhere there is setup code, a game mode, a game instance, or a developer setting, that picks a provider and puts it in place. Callers never do. That is the whole gain: the gong, the timer, and the score screen did not change when the tests got a recording announcer.

**When the service is missing.** Something has to happen if no provider was set. There are three common answers.

- **Return nullptr.** Flexible, but each caller has to test the result, and a single missed test is a crash.
- **Assert.** The callers carry no checks, and the game halts the moment a service is missing, which suits a small team and blocks a large one.
- **Provide a null object.** The callers carry no checks and the game keeps running. The price is that a mistake can go unnoticed, so a null object should at least count or log what it drops.

**Where Unreal already does this.**

- **Subsystems.** Engine, game instance, world, and local player subsystems are located by type, and the engine owns their lifetime. This is the usual choice in new code.
- **Modular features.** `IModularFeatures` is a registry keyed by name. You check `IsModularFeatureAvailable` first, because asking for a missing feature asserts: the assert policy.
- **Online services.** `IOnlineSubsystem::Get()` returns a pointer that is null when that platform service is not loaded: the nullptr policy.
- **Choosing a provider from settings.** A console variable or a developer settings class can name the provider class, and the setup code reads it.

**Locator versus a global.** A global singleton makes every caller depend on one concrete class. A locator makes them depend on an interface, the provider can change, and it can be put around a class that was not written for it. It is still reached from anywhere, and that is its price: a class that uses a service shows no sign of it in its signature, so you cannot see what it needs, and you cannot read it or test it on its own without setting that service up. Keep it for services that cut across the game, like announcing, logging, and analytics. Something that belongs to one particular relationship, such as the health of the player an enemy is attacking, should be passed in or found through the actor that owns it.

**Scope.** A domain-specific service can be made reachable only by the classes that need it, for example through a protected getter on a base class, so unrelated code cannot reach it. A service used everywhere may be global.

# Example

```cpp
// Setup, once: the game picks a provider.
Desk->Provide(NewObject<UDojoLogAnnouncer>(this));

// Anywhere else: ask for the service by its interface.
UDojoAnnouncerDesk::Locate(GetWorld())->Get().Announce(TEXT("Fight!"));
```

# Questions

```yaml
- id: three-parts
  type: multiple-choice
  prompt: "What are the three parts of a service locator?"
  choices:
    - A singleton, a factory, and an observer
    - A base class, a component, and a delegate
    - A header, a source file, and a build file
    - A service interface, providers behind it, and a place that hands out the provider in use
  answerIndex: 3
  explanation: Callers use the interface, the providers implement it, and the locator hands out whichever provider is in place.
- id: fill-get-subsystem
  type: fill-blank
  prompt: "A world subsystem is found by type with UWorld::___<T>()."
  acceptedAnswers: [GetSubsystem]
  explanation: GetSubsystem is the engine's locator call for subsystems. The same name is used on the game instance and on the local player.
- id: null-policy
  type: multiple-choice
  prompt: "Which answer to a missing service keeps the game running without any check in the callers, but can hide a mistake?"
  choices:
    - Return nullptr
    - Assert
    - Provide a null object
    - Create the first class that compiles
  answerIndex: 2
  explanation: A null object accepts every call and ignores it, so callers need no checks, and an accidental absence goes unseen unless the null object counts or logs.
- id: locator-or-singleton
  type: multiple-choice
  prompt: "What is the main difference between a locator and a singleton?"
  choices:
    - A locator makes callers depend on an interface, and the provider behind it can change
    - A locator can only hold one instance
    - A locator is always faster
    - There is no difference
  answerIndex: 0
  explanation: Both are reached from anywhere. The locator gives out an interface, so the provider can be swapped, which a singleton's concrete class does not allow.
- id: spot-early-locate
  type: spot-the-bug
  prompt: A bell announces itself when it is created. Which line fails because the world does not exist yet?
  code: |
    ADojoBell::ADojoBell()
    {
    	UDojoAnnouncerDesk* Desk = GetWorld()->GetSubsystem<UDojoAnnouncerDesk>();
    	Desk->Get().Announce(TEXT("Bell created"));
    }
  bugLine: 3
  fix: Locate the desk later, for example in BeginPlay, when the actor is in a world.
  explanation: A constructor also runs for the class default object, which belongs to no world, so GetWorld returns nullptr and the call crashes.
- id: explain-locator
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Service Locator pattern.
  modelAnswer: Code reaches a service through an interface, handed out by one place that holds the provider in use, so callers name no concrete class, and the provider is chosen or swapped elsewhere.
  rubric:
    - Says callers use an interface and not the concrete class
    - Says one place holds and hands out the provider in use, and that the choice is made elsewhere
  explanation: Callers ask, one place answers, and setup chooses.
```
