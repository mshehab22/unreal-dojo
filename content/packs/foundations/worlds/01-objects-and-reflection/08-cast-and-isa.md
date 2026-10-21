---
id: f1-cast-and-isa
title: Cast and IsA ask an object what it really is
order: 8
kind: concept
difficulty: 2
patterns: []
skills: [object-model]
terms: [cast, isa, isvalid, uclass, tarray]
prerequisites: [f1-popup-target]
xp: 25
estimatedMinutes: 6
concepts:
  - Cast returns a typed pointer or null
  - IsA answers yes or no without converting
  - Every Cast result is checked before use
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: `AActor* Thing` points at a plain test actor, and code runs `ADojoF1TrainingDummy* Dummy = Cast<ADojoF1TrainingDummy>(Thing);`. What is in Dummy?"
choices:
  - The same address as Thing, now typed as a dummy
  - nullptr
  - A brand new dummy actor
  - The build fails because the types differ
answerIndex: 1
explanation: Cast checks the real class through reflection and gives back null when the object is not that class or a child of it.
```

# Card

Engine functions usually hand you a general type: an overlap gives you an `AActor*`, and a `TArray<AActor*>`, Unreal's growable list, filled by a designer in the editor may hold anything. A ranged for loop such as `for (AActor* Thing : Things)` visits each entry in order. To use what is special about one kind of actor you need a pointer of that kind.

`Cast<ADojoF1TrainingDummy>(Thing)` asks reflection for the object's real class. If it is a training dummy, or any child of one, you get a typed pointer. If it is anything else, or Thing is already null, you get `nullptr`. So every Cast is followed by a check:

```cpp
if (ADojoF1TrainingDummy* Dummy = Cast<ADojoF1TrainingDummy>(Thing)) { ... }
```

`Thing->IsA<ADojoF1TrainingDummy>()` gives the yes or no without the pointer. Use it when the answer is all you need, such as counting how many dummies are in a list. It needs Thing to be valid first; `IsValid(Thing)` checks for null and for an actor already being destroyed.

A C++ `static_cast` does no check at all. On the wrong type it hands you a pointer that looks fine and corrupts memory when used, so in Unreal you cast UObjects with Cast.

When code casts to many different classes in a row, that is a sign a shared interface or event would decouple things better; later worlds cover both.

# Example

```cpp
// Counts how many of the given actors are dummies, and how many of those are already down.
void DojoF1CountDummies(const TArray<AActor*>& Things, int32& OutDummies, int32& OutDown)
{
	OutDummies = 0;
	OutDown = 0;

	for (AActor* Thing : Things)
	{
		if (!IsValid(Thing)) continue;

		if (Thing->IsA<ADojoF1TrainingDummy>()) OutDummies++;

		if (const ADojoF1TrainingDummy* Dummy = Cast<ADojoF1TrainingDummy>(Thing))
		{
			if (Dummy->IsKnockedDown()) OutDown++;
		}
	}
}
```

# Questions

```yaml
- id: cast-or-isa
  type: multiple-choice
  prompt: "You only need to know whether an overlapping actor is a pop-up target, to pick a sound. Which is the lighter fit?"
  choices: [Cast and use the pointer, IsA, static_cast, A tag string comparison]
  answerIndex: 1
  explanation: IsA answers the question without producing a pointer you would never use.
- id: spot-unchecked-cast
  type: spot-the-bug
  prompt: This crashes as soon as the list holds anything other than a dummy. Which line is wrong?
  code: |
    for (AActor* Thing : Targets)
    {
    	ADojoF1TrainingDummy* Dummy = Cast<ADojoF1TrainingDummy>(Thing);
    	Total += Dummy->GetHitsTaken();
    }
  bugLine: 4
  fix: Only read the hits when the cast result is not null, for example by moving the cast into an if statement.
  explanation: A failed Cast returns null, and calling a function through null crashes.
- id: fill-cast
  type: fill-blank
  prompt: "Fill the gap to turn an AActor pointer named Other into a target pointer: ADojoF1PopupTarget* Target = ___<ADojoF1PopupTarget>(Other);"
  acceptedAnswers: [Cast]
  explanation: Cast takes the wanted class in the angle brackets and the object in the parentheses.
- id: child-class-cast
  type: multiple-choice
  prompt: "BP_BigDummy is a Blueprint child of ADojoF1TrainingDummy. What does Cast<ADojoF1TrainingDummy> return for one?"
  choices:
    - nullptr, because the class is not exactly ADojoF1TrainingDummy
    - A valid dummy pointer, because a child is also a dummy
    - A copy of the dummy's class default object
  answerIndex: 1
  explanation: Cast and IsA both accept the class itself and every child of it.
- id: explain-static-cast
  type: explain-in-one-sentence
  prompt: In one sentence, say why Unreal code uses Cast instead of static_cast on UObjects.
  modelAnswer: Cast checks the object's real class through reflection and returns null on a mismatch, while static_cast trusts you and returns a bad pointer when you are wrong.
  rubric:
    - Says Cast checks the real type
    - Says static_cast does no check or gives a bad pointer
  explanation: The null from Cast is something you can test; a wrong pointer from static_cast is a crash waiting somewhere else.
```
