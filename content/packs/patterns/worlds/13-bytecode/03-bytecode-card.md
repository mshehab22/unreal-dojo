---
id: p13-bytecode-card
title: Behavior written as data
order: 3
kind: concept
difficulty: 3
patterns: [bytecode]
skills: [bytecode]
terms: [stack-machine, blueprint-vm, instanced-specifier, data-asset, edit-condition]
prerequisites: [p13-potion-recipes]
xp: 25
estimatedMinutes: 10
concepts:
  - Bytecode stores behavior as a flat list of small instructions that a tiny machine inside the game runs
  - The machine is the sandbox, because nothing outside its op list is reachable, its stack has a fixed size, and its steps are counted
  - The program is read-only data, and where the machine is in it belongs to whoever runs it
  - Blueprint, Niagara, and the engine's own script interpreter are Unreal's versions; you write your own only for a narrow job
  - The hard part is the front end that lets people write programs, and the tools to see what a program did
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a teammate wants each step of a potion to be its own UObject with a virtual Apply function, built as a tree in the Details panel, instead of a flat array of small structs. What is the main cost of the tree?"
choices:
  - Nothing; trees and flat arrays cost the same
  - A tree cannot be edited in the Details panel
  - Every step is a separate object to create, track, and follow by pointer, which is heavier to load and slower to walk than one flat array
  - A tree cannot express addition
answerIndex: 2
explanation: An object per step works and is easy to read, but a recipe becomes many small allocations walked through pointers and virtual calls. A flat array of structs is one block of memory walked by one loop.
```

# Card

What you built for the potions is the **Bytecode** pattern. Behavior is written as a flat list of small instructions, stored as data, and a tiny machine inside the game runs the list. New behavior is a new list, written by a designer or a modder, with no compile and no native code to trust.

**Unreal's own versions.** Blueprint is one: the Blueprint compiler turns a graph into script bytes stored on a `UFunction`, and the engine's script interpreter steps through them with `FFrame` while the game runs, stopping a loop that runs away after a set number of passes. Niagara turns a particle system's modules into work for its own vector machine. Behavior Trees and State Trees also keep AI logic in assets rather than code, but they walk a tree of nodes rather than a flat list. You write your own machine only for a narrow job those are too large or too trusting for: modders' potions, card effects, door rules, a trap's rhythm.

**Pieces of a machine.**

- **Instructions.** Some reach into the game (read a stat, write a stat, shoot a dart): they decide everything a program can ever affect. Some only work on values (push a number, add, compare). Some change which instruction comes next (jump, wait until later).
- **Values.** The potions used whole numbers only, which keeps every instruction simple. A machine that needs several kinds of value tags each value with its kind and checks it.
- **A stack.** Instructions take their inputs from the top and put their answer back, so instructions carry no operand addresses, and a nested formula becomes a flat list. A register machine names its operands inside each instruction instead: fewer instructions, larger ones.

**The machine is the sandbox.** A program can do only what the machine's instructions do. The stack has a fixed size. A program that could loop gets a budget of steps, per frame or per run, and stops when it is spent. A program that asks for something impossible is refused, not trusted: return false, never `check`.

**Program and run state are different things.** The list of instructions is read-only data. It can live in a `UPROPERTY` array or a Data Asset and be shared by every actor that runs it. Where a machine has got to in the list (which instruction is next, what is on the stack, how long a wait has lasted) belongs to whoever is running it, not to the list.

**The tree form.** Each step can instead be its own `UObject` with a virtual function, nested in the Details panel through the `Instanced` property specifier and `EditInlineNew` classes. That form is easy to read and to extend with a new class, and it suits a handful of steps. For many programs it means many small objects, pointer chasing, and steps that are tempted to keep state of their own. An authoring tool may build such a tree and then flatten it into the instruction list once.

**The hard part is the front end.** Somebody has to write the programs. A Details panel of rows, with `EditCondition` hiding the fields an op does not use, is a front end that makes many mistakes impossible. A text language is shorter to write but needs a parser and clear error messages. Either way, plan a way to see what a program did, at least a printout of its instructions and a log of the steps it ran, because the C++ debugger cannot step through the list for you.

# Example

```cpp
// The program: read-only data any number of potions can share.
UPROPERTY(EditAnywhere, Category = "Potion")
TArray<FDojoP13Instruction> Recipe;

// The run state: made fresh for every drink.
FDojoP13RecipeMachine Machine;
Machine.Run(Recipe, Stats);
```

# Questions

```yaml
- id: sandbox-three
  type: multiple-choice
  prompt: "Which three things keep a modder's program inside its sandbox?"
  choices:
    - Instructions that reach only what you allow, a fixed-size stack, and a budget of steps
    - A UPROPERTY on the program, a Data Asset, and a Blueprint child
    - Replication, garbage collection, and ticking
    - check on every instruction, a crash dump, and a log
  answerIndex: 0
  explanation: What the instructions can touch, how much memory the stack can use, and how long a program can run are the three limits the machine enforces.
- id: fill-run-state
  type: fill-blank
  prompt: "The instruction list is read-only data; which instruction is next and what is on the stack is the ___ state, and it belongs to whoever runs the program."
  acceptedAnswers: [run, running, execution]
  explanation: Keeping run state out of the program lets one program be shared by many runners at once.
- id: blueprint-is
  type: multiple-choice
  prompt: "Which Unreal feature is itself an example of the Bytecode pattern?"
  choices:
    - Gameplay Tags
    - Level Streaming
    - Blueprint, whose graphs compile to script bytes the engine's interpreter runs
    - The Asset Manager
  answerIndex: 2
  explanation: Blueprint graphs are compiled to script bytes stored on each UFunction and stepped through by FFrame.
- id: spot-runaway
  type: spot-the-bug
  prompt: A trap's machine runs steps until one tells it to wait. Which line lets a routine of Fire then Jump to 0 freeze the game?
  code: |
    void ATrap::RunSteps()
    {
    	while (true)
    	{
    		const FTrapStep& Step = Routine->Steps[StepIndex];
    		if (Step.Kind == ETrapStepKind::ETSK_Wait) return;
    		StepIndex = Step.Kind == ETrapStepKind::ETSK_Jump ? Step.Target : StepIndex + 1;
    	}
    }
  bugLine: 3
  fix: Loop at most a fixed number of steps per frame and jam the trap when the budget runs out.
  explanation: A program that loops without waiting never returns, so the machine needs its own budget of steps; the program cannot be trusted to stop.
- id: tree-or-flat
  type: multiple-choice
  prompt: "When is a tree of Instanced UObject steps a reasonable choice over a flat instruction list?"
  choices:
    - For thousands of programs run every frame
    - For a handful of steps that programmers extend with new classes, where readability matters more than speed
    - When modders must not be able to add behavior
    - Never; UObjects cannot be nested
  answerIndex: 1
  explanation: The tree is clear and easy to extend; it costs objects and pointer chasing, which matters only at scale.
- id: explain-bytecode
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Bytecode pattern.
  modelAnswer: Behavior is stored as a flat list of small instructions, written as data, and run by a tiny machine inside the game that can do only what its instructions allow.
  rubric:
    - Says behavior is stored as data, a list of instructions
    - Says a small machine in the game runs it, limited to its instructions
  explanation: Behavior moves into data, and the machine is the only door it has into the game.
```
