---
id: p22-facade-when-not
title: When a front becomes the whole game
order: 6
kind: concept
difficulty: 3
patterns: [facade]
skills: [facade, architecture]
terms: [god-object, gameplay-statics, kismet-system-library, blueprint-function-library, subsystem]
prerequisites: [p22-feedback-refactor]
xp: 25
estimatedMinutes: 8
concepts:
  - A facade over one simple system with one caller adds a class and saves nothing
  - Pass-through calls that only forward to the system behind them make the facade a second copy of that system's interface
  - A facade that collects game state and rules from every corner turns into a god object everything depends on
  - Callers that need a system's full power should use the system, not wait for the facade to grow
  - Split a growing front by job, and give state back to the class that owns it
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: over a year, UGameServices grew from PlayHitFeedback and SaveCheckpoint to 60 functions, and it now keeps the score, the inventory, and the quest log. Every actor includes it. What is the most likely cost?"
choices:
  - None at all, because finding one class is much easier than finding sixty of them
  - The game runs slower, because a class with sixty functions costs more to call
  - Every change risks something unrelated, and nothing can be tested without it
  - It can no longer be made a subsystem, because it has grown too large for one
answerIndex: 2
explanation: A front that owns state and rules for everything has become a god object. Its size is the symptom; the cost is that every class depends on everything inside it.
```

# Card

A facade earns its place by making a common job one call and keeping that job's rules in one place. Leave it out, or stop it growing, in these cases.

**There is nothing to hide.** A system with a small, clear interface and one caller does not need a front. Wrapping `UGameplayStatics::PlaySoundAtLocation` in `UMySounds::PlaySound` with the same parameters adds a class, a file, and a level of indirection, and hides nothing. The engine's own libraries, `UGameplayStatics` and `UKismetSystemLibrary`, are already one call per job.

**The calls only pass through.** A facade function whose whole body is a call to the same function on the system behind it is not a shortcut; it is a copy of that system's interface. Each one makes more callers depend on the facade for things the facade does not decide. A caller that needs the system's full power, like a replay that plays cues on its own bus, should talk to the system, and the facade should stay small.

**It starts collecting the game.** The warning signs come in order: the facade gains a function for every other team's need, then state that belongs elsewhere (the score, the inventory, the current level), then rules about that state. Soon every actor includes it, every change to it risks the rest, and nothing can be tested without building it first. That is a god object. Split it by job, such as a hit feedback front, a checkpoint front, and a score that lives in its own subsystem, and let each piece of state live with the class that owns it.

**One caller, one place.** If only one actor will ever play hit feedback, the rules can live in that actor until a second caller appears. Extract the front when the second copy of the rules shows up, not before; the refactor in this world is what that looks like.

**The callers need to choose.** A facade makes decisions for its callers, such as what counts as a heavy hit. When callers legitimately need different decisions, either give the facade a setting for the difference or let those callers drive the systems themselves. A facade full of flags for every caller's special case is a god object in waiting.

# Example

```cpp
// A pass-through that hides nothing: the same parameters, the same call, one more class.
void UMySounds::PlaySound(const UObject* WorldContext, USoundBase* Sound, FVector Where)
{
	UGameplayStatics::PlaySoundAtLocation(WorldContext, Sound, Where);
}
```

# Questions

```yaml
- id: when-not-thin
  type: multiple-choice
  prompt: "Which front is the poorest fit for a facade?"
  choices:
    - One call that drives the sound desk, the spark pool, and the HUD for every hit in the game
    - SaveCheckpoint and LoadLatest over save objects, bytes, and slots, used by every gate and pit
    - A wrapper around PlaySoundAtLocation with exactly the same parameters, used by one actor
    - One call that starts a dialogue by loading a row, building a widget, and pausing input
  answerIndex: 2
  explanation: The wrapper hides nothing and has one caller; the others each turn several steps into one call for many callers.
- id: when-not-god
  type: multiple-choice
  prompt: "A hit feedback facade gains AddScore, GetInventory, and SetCurrentLevel. What should happen to them?"
  choices:
    - Nothing happens to them, because one class that holds everything is simpler to find
    - They move into UGameplayStatics, where every other game already keeps its state
    - The facade turns into a global variable so that nothing needs to depend on it
    - They move to the classes that own that state, and the facade goes back to feedback
  answerIndex: 3
  explanation: State and rules for other jobs turn a front into a god object; each job's state belongs to its own class.
- id: when-not-power
  type: multiple-choice
  prompt: "A cutscene needs to play a cue on a special bus at a chosen pitch, which the hit feedback facade does not offer. What is the better choice?"
  choices:
    - Let the cutscene call the sound desk directly for this one need
    - Add PlayCueOnBusAtPitch to the facade for the cutscene to use
    - Copy the facade into the cutscene and change the copy as needed
    - Remove the special bus from the sound desk so the problem goes away
  answerIndex: 0
  explanation: The facade is a shortcut for the common job. A caller with an unusual need uses the system; the facade does not grow a call for each one.
- id: spot-state
  type: spot-the-bug
  prompt: A feedback facade is growing. Which line starts turning it into a god object?
  code: |
    void UHitFeedback::PlayHitFeedback(FVector Where, float Damage)
    {
    	PlayHitCue(Where, Damage);
    	ThrowSparks(Where, Damage);
    	PlayerScore += FMath::RoundToInt32(Damage);
    	ShowDamage(Damage);
    }
  bugLine: 5
  fix: Keep the score where it belongs, in a class that owns it, and let whoever dealt the damage tell that class; the facade only plays feedback.
  explanation: Scoring is a rule of the game, not of how a hit looks. Once the facade keeps it, everything that cares about the score depends on the feedback front.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a facade is the wrong choice or has grown too far.
  modelAnswer: When it hides nothing, such as a pass-through wrapper with one caller, or when it starts collecting other jobs' state and rules until everything depends on it, use the system directly or split the front by job.
  rubric:
    - Names a case such as a wrapper that hides nothing, pass-through calls, or collected state
    - Names the fix such as calling the system directly or splitting the front by job
  explanation: A facade is worth it while it stays small and about one job.
```
