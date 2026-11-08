---
id: p20-one-function-every-aim
title: One function that knows every aim
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [architecture, refactoring]
terms: [uobject, abstract-specifier, virtual-function]
prerequisites: [p19-boss-dusk]
xp: 25
estimatedMinutes: 8
concepts:
  - A function that picks between several ways of doing one job grows a branch for every new way
  - Each new way means editing, rebuilding, and retesting the class that every user of the function depends on
  - A designer cannot pick or tune a branch without a programmer, because the choice is buried in code
  - Moving each way into its own small object behind one shared function leaves the host asking the same question every time
  - A virtual function on a small object lets a new way arrive as a new class and touch nothing else
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a turret picks its target with a switch on a number. Number 0 aims at the nearest dummy, 1 at the weakest, 2 at the farthest. A designer asks for a fourth aim, the dummy that was shot last. What must a programmer change?"
choices:
  - None, the designer can type a new number into Details
  - Only the new aim, because the switch finds it by itself
  - Only the tests, because the aims are already written
  - The picking function every turret in the game shares
answerIndex: 3
explanation: A new number means a new case in the one function that all turrets share, so every turret is rebuilt and has to be tested again, whichever aim it uses.
```

# Card

A practice yard has a turret and a row of dummies. The turret has one job that can be done in several ways: choose which dummy to shoot. The first version of the code does what comes naturally.

```cpp
FName ADojoTurret::PickTarget() const
{
	int32 Best = INDEX_NONE;

	for (int32 Index = 0; Index < Dummies.Num(); Index++)
	{
		if (Dummies[Index].Health <= 0) continue;

		if (Best == INDEX_NONE)
		{
			Best = Index;
			continue;
		}

		switch (AimStyle)
		{
		case 1:
			if (Dummies[Index].Health < Dummies[Best].Health) Best = Index;
			break;
		case 2:
			if (DistanceTo(Index) > DistanceTo(Best)) Best = Index;
			break;
		default:
			if (DistanceTo(Index) < DistanceTo(Best)) Best = Index;
			break;
		}
	}

	return Best == INDEX_NONE ? NAME_None : Dummies[Best].Name;
}
```

It works, and for a day it is fine. Then it stops being fine in three ways.

**Every new way edits the same function.** A fourth aim is a fourth case, and the function is the one every turret runs. A slip in the new case can break the three that were working, so all of them are tested again.

**The choice is hidden in code.** `AimStyle` is a bare number. A designer has to know what 2 means, and cannot tune anything about an aim, such as how far the farthest aim looks, without a programmer adding another variable to the turret that only one case reads.

**The turret knows too much.** Skipping dummies that are down, measuring distance, comparing health: the turret is a launcher that also contains every way of judging a dummy. The more aims it learns, the less it is about turrets.

**The way out.** Give the job one shared shape, a function that takes where the turret is and the dummies and answers with the one to aim at, and put each way of doing it in its own small object. Declare the shape once, as an abstract `UObject` class with a `virtual` function. Write each aim as a child class that overrides the function. The turret keeps one pointer to such an object and asks it:

```cpp
const int32 Index = Rule->ChooseTarget(GetActorLocation(), Dummies);
```

The turret no longer knows how many aims there are. A new aim is a new child class, and no existing file changes. The pointer is a property on the turret, so a designer can choose an aim in the editor. The next quest builds exactly this.

**What the objects are not.** A rule object is not an actor. It has no place in the world and does not tick. It is a small piece of behaviour that an actor holds, which is why a plain `UObject` is enough.

# Example

```cpp
// Before: the turret itself contains every aim.
switch (AimStyle)
{
case 1:
	/* weakest */
	break;
case 2:
	/* farthest */
	break;
default:
	/* nearest */
	break;
}

// After: the turret holds one object and asks it the same question whichever aim it is.
const int32 Index = Rule->ChooseTarget(GetActorLocation(), Dummies);
```

# Questions

```yaml
- id: edit-the-same-function
  type: multiple-choice
  prompt: "A turret picks its aim with a switch, and a designer asks for a fifth aim. What is the cost of the switch?"
  choices:
    - Nothing, because a switch is the fastest way to branch
    - The fifth case cannot be added to a switch once it is saved
    - The shared function is edited, so every turret is retested
    - The designer has to edit every level that uses a turret
  answerIndex: 2
  explanation: A new case lives in the shared function. The cost is not speed, it is that a change meant for one aim can break the others.
- id: fill-virtual
  type: fill-blank
  prompt: "A base class declares the shared question, and each child class answers it by overriding a ___ function."
  acceptedAnswers: [virtual]
  explanation: A virtual function is looked up on the real object at run time, so the caller does not need to know which child it holds.
- id: spot-the-growth
  type: multiple-choice
  prompt: A designer wants another aim that targets the dummy with the most health, and the turret picks with a switch on AimStyle. What has to change?
  choices:
    - Nothing in the turret, the designer types a new number into Details
    - A new case in the switch, which every turret in the game runs
    - Only a new file, because a switch finds new cases by itself
    - Only the tests, since the new aim is already written
  answerIndex: 1
  explanation: The switch has to learn every aim, so the shared function is edited for each new one.
- id: what-turret-keeps
  type: multiple-choice
  prompt: "After the aims move into their own objects, what does the turret keep?"
  choices:
    - One pointer to an aim object, and a call to its function
    - A copy of the code of every aim, kept inside the turret
    - A list of every aim class that exists, checked one by one
    - Nothing, because the aim object does its own shooting
  answerIndex: 0
  explanation: The turret asks one question of whatever object it holds. Which aim that is no longer matters to it.
- id: explain-split
  type: explain-in-one-sentence
  prompt: In one sentence, say what changes in a class when each way of doing one of its jobs moves into its own small object.
  modelAnswer: The class stops containing every way and keeps one pointer to an object with a shared function, so a new way is a new class and the class itself is not edited.
  rubric:
    - Says the class keeps or calls one object through a shared function
    - Says a new way is a new class and the host class is not changed
  explanation: The host depends on one question, and each way of answering it lives somewhere else.
```
