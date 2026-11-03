---
id: p13-bytecode-when-not
title: When a little machine is too much
order: 6
kind: concept
difficulty: 3
patterns: [bytecode]
skills: [bytecode, architecture]
terms: [blueprint-vm, data-asset, data-table, blueprint-class, profiling]
prerequisites: [p13-trap-refactor]
xp: 25
estimatedMinutes: 8
concepts:
  - When only numbers change, a Data Asset or a Data Table is enough and a machine is overkill
  - When designers can already use Blueprint and nobody outside the team writes behavior, Blueprint is the machine
  - Interpreting steps is slower than compiled code, so hot paths that run thousands of times a frame stay native
  - A machine without a front end and debugging aids moves bugs where nobody can see them
  - An instruction set that keeps growing turns into a second programming language to maintain
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: forty kinds of dart trap differ only in damage, dart speed, and how often they fire. A teammate proposes a little step machine so designers can write each trap's numbers as push steps. Is that the right tool?"
choices:
  - Yes; behavior should always be data
  - No; when only numbers differ, a Data Asset or a row in a Data Table per kind is enough
  - Yes, as long as the stack holds at least sixteen values
  - No; traps can never be data driven
answerIndex: 1
explanation: A machine earns its cost when behavior has to be composed. Numbers that only vary per kind are plain data, and a machine around them adds a front end and a debugger to build for nothing.
```

# Card

A small machine is the most work any pattern in this course asks for: an instruction set, a sandbox, a front end, and tools to see what ran. Leave it out in these cases.

**Only the numbers change.** Kinds that differ in damage, speed, or cost are rows in a Data Table or assets of a data asset class. A machine is for behavior that is put together from steps, like a rule that reads two stats and compares them; it adds nothing when every kind runs the same code with different numbers.

**Blueprint already does the job.** If the people writing the behavior are designers on the team, and they have the editor, Blueprint is a finished machine with a graph editor, a debugger with breakpoints, and the whole engine behind it. Your own machine is worth it when the authors are outside the team (modders, players sharing creations), when the behavior must be tightly limited, or when a program must be small data that travels over the network or into a save.

**The path is hot.** Each step pays for a loop, a switch, and the stack. That is nothing for a potion drunk once a minute and too much for code that runs for ten thousand particles every frame. Hot paths stay in C++, or use a machine the engine already optimizes, such as Niagara's.

**Nobody will build the tools.** The C++ debugger cannot step through a list of steps. Without a way to print a program and to log the steps it ran, a broken script fails silently and someone stares at numbers. If there is no time for a front end and those aids, the machine moves bugs to where nobody can see them.

**The instruction set keeps growing.** Every request ("can a potion also give an item, branch, start a timer, call another potion") adds an op and a case. Unchecked, that becomes a second programming language with no documentation and one maintainer. Decide what the machine is for and say no to the rest.

# Example

```cpp
// Right-sized: forty trap kinds that differ only in numbers are rows, not programs.
USTRUCT(BlueprintType)
struct FDartTrapKind : public FTableRowBase
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, Category = "Trap")
	float Damage = 10.f;

	UPROPERTY(EditAnywhere, Category = "Trap")
	float SecondsBetweenShots = 0.5f;
};
```

# Questions

```yaml
- id: when-not-numbers
  type: multiple-choice
  prompt: "Which job is the poorest fit for a custom step machine?"
  choices:
    - Door rules that modders write and share
    - Card effects that combine reading, comparing, and changing stats
    - Fifty enemy kinds that differ only in health and speed
    - A trap rhythm that designers change every week without a compile
  answerIndex: 2
  explanation: Values that vary per kind are plain data; nothing about them needs a program.
- id: when-not-hot
  type: multiple-choice
  prompt: "Why should the movement of ten thousand particles each frame not run through your own step machine?"
  choices:
    - A machine cannot do arithmetic
    - Each step pays for a loop, a switch, and the stack, which adds up to far too much at that scale
    - Particles cannot be data driven
    - A machine cannot run during play
  answerIndex: 1
  explanation: Interpretation costs a little per step, which matters only when the steps run very often. Keep hot paths native or in a machine the engine already optimizes.
- id: when-not-blueprint
  type: multiple-choice
  prompt: "Your designers all have the editor and want to script one-off level events. Nobody outside the team will write behavior. What is the better choice?"
  choices:
    - A custom step machine with its own text language
    - Blueprint, which is already a machine with a graph editor and a debugger
    - Hard-coded C++ for every event
    - A Data Table with one row per event
  answerIndex: 1
  explanation: When the authors are on the team and have the editor, Blueprint gives you the machine, the front end, and the debugger for free.
- id: spot-no-tools
  type: spot-the-bug
  prompt: A machine runs a modder's potion. Which line leaves a broken potion impossible to diagnose?
  code: |
    bool FPotionMachine::Run(const TArray<FPotionStep>& Program, FStats& Stats)
    {
    	FStats Working = Stats;
    	for (const FPotionStep& Step : Program)
    	{
    		if (!Execute(Step, Working)) return false;
    	}
    	Stats = Working;
    	return true;
    }
  bugLine: 6
  fix: Before returning false, log which step failed, its index, and what was on the stack, so the author can see where the potion went wrong.
  explanation: Refusing the program is right, but silently. Without a log or a printout of the steps, nobody can tell which of twenty steps failed or why.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when writing your own step machine is the wrong choice.
  modelAnswer: When only numbers vary, when Blueprint already serves authors who are on the team, when the code is a hot path, or when nobody will build a way to write programs and to see what they did, data, Blueprint, or C++ is the better choice.
  rubric:
    - Names a case such as numbers only, Blueprint already fitting, a hot path, or no tools
    - Names a better alternative such as data, Blueprint, or C++
  explanation: A machine is for composed behavior from authors you cannot fully trust or cannot wait on; anything less is cheaper without one.
```
