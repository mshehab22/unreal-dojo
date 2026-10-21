---
id: p1-architecture-lens
title: Judge a design by the price of the next change
order: 1
kind: concept
difficulty: 1
patterns: []
skills: [architecture]
terms: [forward-declaration, coding-standard]
prerequisites: []
xp: 20
estimatedMinutes: 6
concepts:
  - A design is good when the next change is cheap, and most of that price is reading
  - Two pieces are coupled when you cannot understand or change one without the other
  - Every layer of flexibility is a bet that a change is coming; an unused layer is pure cost
  - Iteration speed, frame speed, and today's feature speed pull against each other
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an arena has exactly one gate and one alarm, and the design document says that will never change. Version A: the gate calls the alarm's Sound function directly. Version B: the gate talks to an abstract alarm interface, found through a registry, configured from a data file. Which is the better design for this game?"
choices:
  - Version B, because decoupled code is always better
  - Version A, because B pays for flexibility nobody will use
  - They are equal, because both make the alarm sound
  - Version B, because it runs faster
answerIndex: 1
explanation: Architecture is judged by how cheaply the game takes the changes it will really get. B adds three layers a reader must walk through for a change that is never coming, so it costs more and buys nothing here.
```

# Card

Every pattern in this pack is judged through one question: **when the design changes, how much does it cost to change the code?** If nobody will ever touch a piece of code again, its structure does not matter. Games are the opposite case: a designer plays a build, changes their mind, and the code has to follow, again and again.

**The price of a change is mostly reading.** Before you can move a door's alarm from the gate to the pressure plate, you have to load the gate, the plate, the alarm, and whatever calls them into your head. Typing the change is quick; finding out what it will break is slow. So the useful definition of **coupling** is about reading: two pieces of code are coupled when you cannot understand or change one without also understanding the other. Decoupling shrinks the amount of code you must load before you can act. In Unreal you can often see coupling in the headers: every `#include` of another system's header is a piece of that system a reader, and the compiler, must now load. A **forward declaration** (`class ADojoArenaGate;`) is the small, cheap version of that dependency.

**Flexibility is a bet.** An interface, an extra delegate, a registry, a data table: each one says "I expect this to change." When the change comes, the bet pays. When it never comes, the layer is a tax on every future reader, who has to walk through it to find the code that does the work. Codebases full of abstract managers with nothing behind them are what happens when every bet is placed and none pays. The counterweight has a name: "you aren't going to need it". Add a layer when a change is planned or has already happened twice, not because it might.

**Three speeds pull against each other.** How fast the team can change the game next month (structure), how fast the game runs each frame (optimization), and how fast this feature gets done today (shortcuts). Structure costs a little on every change; optimization costs engineering time and freezes assumptions into the code; shortcuts borrow from next month. There is no setting that wins all three, so each pattern in this pack comes with its price and its "when not".

**Simple is the way through.** The cheapest code to change is the smallest code that does the job, with the right data in the right place. Small is not the same as fast to write: a long chain of `if` statements, one per case a designer asked for, is quick to type and expensive to read, while one rule that covers all the cases takes thought and stays short.

**Throwaway code is allowed, if it is really thrown away.** A rough prototype that answers "is this fun?" in an afternoon is good work. The trap is a prototype that ships. If there is any chance it will be kept, write it as if it will be.

# Example

```cpp
// Inside one small feature, a direct call is the cheapest code to read and to change.
// The gate and its alarm ship together and nothing else cares, so no extra layer is worth paying for.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoArenaGate.generated.h"

// A forward declaration: readers of this header learn the alarm exists, and nothing more.
class ADojoArenaAlarm;

/** A gate that sounds its own alarm when it is forced open. */
UCLASS()
class ADojoArenaGate : public AActor
{
	GENERATED_BODY()

public:
	/** Opens the gate and sounds the alarm placed next to it. */
	UFUNCTION(BlueprintCallable, Category = "Gate")
	void ForceOpen();

	/** The one alarm this gate owns in the level. */
	UPROPERTY(EditAnywhere, Category = "Gate")
	TObjectPtr<ADojoArenaAlarm> Alarm;
};

// The question for every later quest: when the scoreboard, the music, and the tutorial
// also want to know the gate was forced, does this class grow a new pointer and a new call
// for each of them? That is the change this pack will make cheap, and only when it comes.
```

# Questions

```yaml
- id: measure-of-design
  type: multiple-choice
  prompt: "By the measure this pack uses, which code has the best architecture?"
  choices:
    - The code with the most interfaces
    - The code that runs in the fewest milliseconds
    - The code where the changes the game will really get are cheapest to make
    - The code with the fewest classes
  answerIndex: 2
  explanation: Interfaces, speed, and class counts are means. The test is the price of the next real change, and most of that price is reading.
- id: fill-coupled
  type: fill-blank
  prompt: "Two pieces of code are ___ when you cannot understand or change one without also loading the other into your head."
  acceptedAnswers: [coupled, tightly coupled]
  explanation: Coupling defined by reading cost is the one that matters for change, because reading is the slow part.
- id: spot-heavy-include
  type: spot-the-bug
  prompt: This header only stores a pointer to the scoreboard and never calls it inline. Which line makes every reader and every file that includes it pay for the scoreboard too?
  code: |
    #pragma once
    #include "CoreMinimal.h"
    #include "GameFramework/Actor.h"
    #include "Arena/DojoArenaScoreboard.h"
    #include "DojoArenaCrate.generated.h"
  bugLine: 4
  fix: Replace the include with a forward declaration of the scoreboard class and include its header in the crate's source file instead.
  explanation: A pointer member only needs the name of the class. The full include drags the scoreboard into every file that includes the crate, which is coupling you can measure in compile time and in reading.
- id: three-speeds
  type: multiple-choice
  prompt: "A designer wants a new trap in tonight's build. You write it as a quick hack inside the player character. Which of the three speeds did you buy, and which did you pay with?"
  choices:
    - Bought frame speed, paid with today's speed
    - Bought today's speed, paid with next month's speed of change
    - Bought next month's speed, paid with frame speed
    - Bought nothing, the three speeds are independent
  answerIndex: 1
  explanation: The shortcut lands the feature tonight, and every later change to the character now has to read around a trap that does not belong there.
- id: prototype-rule
  type: multiple-choice
  prompt: "You are asked for a one-day prototype of a grappling hook. Which plan follows the rule for throwaway code?"
  choices:
    - Write it fast and messy, and delete it once the question "is it fun?" is answered
    - Write it fast and messy, and clean it up later if the team likes it
    - Build the full component architecture first so the prototype can ship
    - Skip the prototype and design on paper
  answerIndex: 0
  explanation: Rough code is fine when it is truly thrown away. "Clean it up later" is how a prototype ships with its mess.
- id: explain-bet
  type: explain-in-one-sentence
  prompt: In one sentence, say why adding an abstraction layer is a bet.
  modelAnswer: A layer only pays when the change it allows actually comes, and until then every reader has to walk through it, so it costs something on every change whether or not it is ever used.
  rubric:
    - Says the layer pays off only if the anticipated change happens
    - Names an ongoing cost, such as more code to read or trace
  explanation: Treat every interface or extra indirection as a wager on the future, and place it when a change is planned or has already happened.
```
