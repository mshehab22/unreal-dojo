---
id: p13-behavior-as-data
title: A recompile for every potion
order: 1
kind: concept
difficulty: 3
patterns: []
skills: [bytecode, data-modeling]
terms: [stack-machine, blueprint-vm, edit-condition, uparam-ref, ustruct, uenum]
prerequisites: [p12-prototype-when-not]
xp: 25
estimatedMinutes: 10
concepts:
  - Behavior that changes often, or comes from people who do not write C++, can be stored as a list of small steps instead of compiled code
  - A short loop reads the steps one at a time and does what each says, and it can only do what its steps allow
  - Steps hand values to each other on a stack, so a formula with brackets becomes a flat list
  - In Unreal the steps are a TArray of USTRUCT rows with a UENUM saying what each row does, edited in the Details panel
  - Blueprint graphs already run this way, compiled to script bytes that the engine reads one token at a time
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the vault's potions are C++ functions, one per potion. A designer wants a new potion that adds twice your Stamina to your Health, and modders want to share potions of their own. What does each new potion cost today?"
choices:
  - Nothing; a C++ function can be changed in the Details panel
  - A programmer, a C++ change, a compile, and a new build for every player, and modders cannot add one at all
  - Only a restart of the editor
  - A new Blueprint child of the potion for each one, with no code at all
answerIndex: 1
explanation: Behavior in C++ moves only with a compile and a shipped build, and nobody outside the team can add to it safely. Numbers can live in data; until now, behavior could not.
```

# Card

The vault ships a new potion every week. Each one is a few lines of arithmetic on the drinker's numbers: add 12 gold, give a key, raise health by twice the stamina. Written as C++ functions, every one of them waits for a programmer and a compile, and the modders who want to share potions of their own cannot add one without shipping native code, which nobody should load from a stranger.

**Write the behavior down as steps.** Instead of a function per potion, give every potion a list of small steps, and write one short loop that reads the list and does what each step says. Adding health to twice the stamina becomes: read Health, read Stamina, push 2, multiply, add, write Health. A new potion is a new list. Nobody compiles anything, and the list can be saved, sent, and edited like any other data.

**The steps pass values on a stack.** Each step takes the values it needs off the top of a small stack and puts its answer back on top. "Read Stamina" puts the stamina on the stack; "push 2" puts a 2 on top of it; "multiply" takes both off and puts back the product; "add" takes that product and the health under it and puts back the sum. Brackets are never written: the order of the steps already says what is worked out first, so a nested formula becomes a flat list.

**The loop is the only door to the game.** A step can do only what the loop's code does for it. If no step writes to anything but the four stats, no list of steps can touch anything else, however it is written. A list that asks for a value the stack does not have, or pushes more than the stack holds, is refused, and the loop gives up instead of crashing. Running the steps on a copy of the stats and keeping the copy only when every step worked means a broken potion changes nothing at all.

**How it looks in Unreal.** A step is a `USTRUCT` with a `UENUM` field naming what it does, plus the fields some steps need: a number to push, a stat to read or write. A `TArray` of those structs is a `UPROPERTY`, so a designer edits it row by row in the Details panel. The `EditCondition` meta specifier, with `EditConditionHides`, shows the number only on push rows and the stat only on read and write rows, so the panel offers only what makes sense. A `UFUNCTION` that changes a struct the caller passes in takes it as `UPARAM(ref)`, so the Blueprint node has one pin that goes in and comes back changed.

**You have used one already.** A Blueprint graph is compiled into a byte array of script tokens stored on its `UFunction` (`UStruct::Script`), and the engine's script interpreter, through `FFrame`, reads those tokens one by one, with a counter that stops a loop that runs away. Niagara does the same with its own machine for particles. Writing a small one yourself is for a narrow job Blueprint is too big or too trusting for, like a modder's potion.

# Example

```cpp
// A step of a potion, edited as one row in the Details panel.
USTRUCT(BlueprintType)
struct FPotionStep
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, Category = "Potion")
	EPotionOp Op = EPotionOp::PushNumber;

	UPROPERTY(EditAnywhere, Category = "Potion", meta = (EditCondition = "Op == EPotionOp::PushNumber", EditConditionHides))
	int32 Number = 0;
};

// Health = Health + Stamina * 2, as six rows:
// ReadStat Health, ReadStat Stamina, PushNumber 2, Multiply, Add, WriteStat Health
```

# Questions

```yaml
- id: what-steps-buy
  type: multiple-choice
  prompt: "What does storing a potion's effect as a list of steps buy over a C++ function per potion?"
  choices:
    - Faster code, because a loop is faster than a function
    - New potions without a compile, written by people who never touch C++, and unable to reach past what the steps allow
    - Nothing; the two are the same
    - Automatic replication of every potion
  answerIndex: 1
  explanation: The list is data, so it moves without a compile, and the loop that reads it decides everything a step can do.
- id: fill-stack
  type: fill-blank
  prompt: "Each step takes its values off the top of a ___ and puts its answer back on top."
  acceptedAnswers: [stack, value stack]
  explanation: The stack carries values from one step to the next, so no step needs to name where its inputs come from.
- id: flat-formula
  type: multiple-choice
  prompt: "Which list of steps leaves Health + Stamina * 2 on the stack?"
  choices:
    - Push 2, Multiply, ReadStat Health, ReadStat Stamina, Add
    - ReadStat Health, Add, ReadStat Stamina, Multiply, Push 2
    - ReadStat Health, ReadStat Stamina, Push 2, Multiply, Add
    - ReadStat Stamina, Add, Push 2, ReadStat Health, Multiply
  answerIndex: 2
  explanation: Stamina and 2 are multiplied first, because Multiply comes right after them; Add then joins that product to the health waiting underneath.
- id: spot-crash
  type: spot-the-bug
  prompt: A potion step loop handles a step that adds. Which line lets a modder's broken potion crash the game?
  code: |
    case EPotionOp::Add:
    {
    	check(Stack.Num() >= 2);
    	const int32 Top = Stack.Pop();
    	const int32 Under = Stack.Pop();
    	Stack.Push(Top + Under);
    	return true;
    }
  bugLine: 3
  fix: Return false when the stack holds fewer than two values, so the loop refuses the potion instead of stopping the game.
  explanation: check is for the programmer's own mistakes. A list of steps written by someone else is untrusted input, and it must be refused, not trusted to be right.
- id: edit-condition-what
  type: multiple-choice
  prompt: "On a step struct, what does meta = (EditCondition = \"Op == EPotionOp::PushNumber\", EditConditionHides) do to the Number field?"
  choices:
    - It deletes Number from the struct when Op is not PushNumber
    - It shows Number in the Details panel only on rows whose Op is PushNumber
    - It makes Number read only in C++
    - It sets Number to zero at runtime
  answerIndex: 1
  explanation: EditCondition decides when a property can be edited, and EditConditionHides hides it instead of greying it out. The field still exists in memory.
- id: blueprint-runs
  type: multiple-choice
  prompt: "How does a Blueprint graph run when the game plays?"
  choices:
    - It is turned into C++ and compiled each time it changes
    - Its compiled script bytes, stored on its UFunction, are read token by token by the engine's script interpreter
    - Each node is a separate actor that ticks
    - The graph is drawn and read off the screen
  answerIndex: 1
  explanation: The Blueprint compiler writes script bytes into UStruct::Script, and FFrame steps through them while the game runs.
- id: explain-steps
  type: explain-in-one-sentence
  prompt: In one sentence, say why a potion written as a list of steps can be safer to accept from a modder than a C++ function.
  modelAnswer: The steps can only do what the loop that reads them does for each one, so a broken or hostile list is refused or limited to the stats, while native code can do anything.
  rubric:
    - Says the steps can only do what the loop allows
    - Contrasts with native code, which can reach anything
  explanation: The loop is the only door the steps have into the game.
```
