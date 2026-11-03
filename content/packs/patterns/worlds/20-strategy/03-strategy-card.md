---
id: p20-strategy-card
title: One job, many rules, one question
order: 3
kind: concept
difficulty: 2
patterns: [strategy]
skills: [strategy, architecture]
terms: [instanced-subobjects, tsubclassof, newobject, abstract-specifier, uinterface]
prerequisites: [p20-target-rules]
xp: 25
estimatedMinutes: 10
concepts:
  - A strategy has a host, a shared question, and a child class for each way of answering it
  - An Instanced property lets a designer pick a rule class and tune its settings on each host in Details
  - A class reference lets code pick the rule class and make the rule object when it is needed
  - A strategy is chosen from outside and stays put, where a state moves itself, and it lives in a part the host holds, where a subclass sandbox lives in the host's own subclass
  - A rule that remembers things between calls needs an object for each host that uses it
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: ten launchers stand in a level. A designer wants each one to aim differently, chosen in Details on that launcher, and wants to add an eleventh kind of aim next month without touching any launcher. What should a launcher hold?"
choices:
  - A number that says which aim to use
  - One pointer to an aim object, and a call to a function every aim object shares
  - A list of every aim class in the game
  - A copy of the code of the aim it uses
answerIndex: 1
explanation: A pointer to a shared kind of object lets each launcher hold a different aim, and a new aim is a new class that no launcher has to know about.
```

# Card

What you built for the launcher is the **Strategy** pattern. One job can be done in several ways, and the object that needs the job done is not the right place for the ways. So each way becomes its own object behind one shared function, and the object that needs the job holds one of them and calls it.

**Three parts.**

- **The host.** The launcher, which needs a target and holds the rule. It knows the question and nothing about the ways of answering it.
- **The shared question.** An abstract `UObject` class, here `UDojoP20TargetRule`, with a `virtual` function, here `ChooseTarget`. This is all the host depends on.
- **The rules.** A child class for each way of answering: nearest, weakest, farthest. A new way is a new child class, and neither the host nor the other rules change.

**Two ways to hand the host a rule in Unreal.**

- **An instanced object.** `UPROPERTY(EditAnywhere, Instanced) TObjectPtr<UDojoP20TargetRule> Rule;` with the rule class marked `UCLASS(Abstract, Blueprintable, EditInlineNew)`. Details lists the rule classes, makes the one a designer picks inside the host, and shows its settings. Every host owns its own rule object, saved with the host, with its own tuning. This is the form you built.
- **A class reference.** `UPROPERTY(EditAnywhere) TSubclassOf<UDojoP20MoveRule> RuleClass;` and a `NewObject` call when the host needs the rule. A designer picks a class in a dropdown, and code can pick or change the class at run time. Settings come from the class, so tuning one host differently from another means another child class, often a Blueprint child.

A lighter form for a rule that is one line of code is a `TFunction` or a delegate on the host. It has no class to write, and also no Details picker, no settings, and no memory of its own.

**Why a class and not an interface.** An `Instanced` property has to point at a `UObject` class, because Details can make only objects, not something that implements an interface. A rule shaped as a `UINTERFACE` can be called, but it cannot be created inline.

**One rule object or one for each host.** A rule that keeps nothing between calls, such as nearest, could be shared by every host. A rule that remembers something, such as which way a patrol is heading, cannot: two hosts sharing it would tangle each other's memory. An instanced property gives each host its own object. With a class reference, each host makes its own.

**Who chooses, and how it differs from its neighbours.**

- **From State.** Both hand the work to a replaceable object, and the difference is who changes it and how often. A strategy is chosen from outside, by a designer, a game mode, or a key, and stays until someone changes it. A state is chosen by the host itself, as its mode changes, and each state usually knows which state comes next. The rules of a strategy do not know each other.
- **From Subclass Sandbox.** Both put variation in child classes with an overridden function. A sandbox puts it in children of the host: an actor class for each variation, fixed when the actor is spawned. A strategy puts it in children of a part the host holds, so the host class stays one class, the part can be changed while it runs, and the same rule can serve hosts of different kinds. When two things vary, three aims and three movements, subclasses of the host need nine classes, while rules need three and three.
- **From Type Object.** A type object is data that tunes numbers. A rule is behaviour, picked for what it does. A rule may carry numbers, as the patrol's distance, but it is chosen for how it acts.

**Unreal's own rules.**

- An Environment Query holds its generator and its tests as objects inside the query asset. The query runner calls each test's shared function and does not know which tests it has.
- A move request names a `UNavigationQueryFilter` class, which says what each kind of ground costs, so two characters can find different paths over the same map.
- A gameplay effect can name a calculation class, a child of `UGameplayModMagnitudeCalculation`, that works out how large its effect is. The effect runs whichever one it names.

**What it costs.** A class for every rule, even a tiny one, and a call through a pointer. The host has to decide what it does with no rule. And a rule can only use what it is given: pass the rule what it needs as parameters, as `ChooseTarget` takes the place and the dummies. A rule that needs the host's private data is a sign the line between them is in the wrong place.

# Example

```cpp
// The shared question: all the host ever depends on.
UCLASS(Abstract, Blueprintable, EditInlineNew)
class UDojoTargetRule : public UObject
{
	GENERATED_BODY()

public:
	virtual int32 ChooseTarget(const FVector& From, const TArray<FDojoCandidate>& Candidates) const;
};

// The host holds one and asks it. Details picks the class and tunes it on each launcher.
UPROPERTY(EditAnywhere, Instanced)
TObjectPtr<UDojoTargetRule> Rule;

// A class reference instead: the code makes the object when it needs one.
UPROPERTY(EditAnywhere)
TSubclassOf<UDojoMoveRule> RuleClass;
```

# Questions

```yaml
- id: three-parts
  type: multiple-choice
  prompt: "Which list names the parts of the pattern you built?"
  choices:
    - A producer, a consumer, a queue, and a lock
    - A host, a shared question on an abstract class, and a child class for each way of answering it
    - A base class, a component, a delegate, and a timer
    - A prototype, a copy, a registry, and a factory
  answerIndex: 1
  explanation: The host depends only on the shared question, and each rule is a child class that answers it its own way.
- id: fill-instanced
  type: fill-blank
  prompt: "For Details to create the rule object inside the host, the property is marked EditAnywhere and ___."
  acceptedAnswers: [Instanced]
  explanation: Instanced, together with an EditInlineNew rule class, makes Details list the rule classes and create the chosen one inside the host.
- id: state-or-this
  type: multiple-choice
  prompt: "A guard changes how it moves when it sees the player: it stops patrolling and starts chasing, and it switches back when it loses sight. Is that a rule chosen from outside?"
  choices:
    - Yes, patrol and chase are two rules
    - No, the guard changes its own behaviour in response to events, which is State
    - Yes, but only if each uses a TSubclassOf
    - No, because a guard has no host
  answerIndex: 1
  explanation: The guard switches itself, on events, and each mode leads to the next. A strategy is picked by a designer or a game mode and stays until it is changed.
- id: nine-or-six
  type: multiple-choice
  prompt: "A turret can aim three ways and move three ways. How many classes does it take to cover every pair as turret subclasses, and how many as rules held by one turret class?"
  choices:
    - Nine subclasses, or six rule classes
    - Six subclasses, or nine rule classes
    - Three in both cases
    - Nine in both cases
  answerIndex: 0
  explanation: Subclasses multiply, one for each pair. Rules add, one for each way, and any aim can be paired with any movement.
- id: spot-interface
  type: spot-the-bug
  prompt: A designer should pick the rule in Details and tune it there. Which line cannot work?
  code: |
    UPROPERTY(EditAnywhere, Instanced)
    TScriptInterface<IDojoTargetRule> Rule;
  bugLine: 2
  fix: Point the property at an abstract UObject class that is marked EditInlineNew, and put the shared function on that class.
  explanation: Details can create objects of a class inline. It cannot create something that only implements an interface.
- id: explain-strategy
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Strategy pattern.
  modelAnswer: Each way of doing one job becomes a child class behind one shared function, and the object that needs the job holds one of them and calls it, so a way can be chosen or swapped without changing that object.
  rubric:
    - Says each way is a separate object or class behind a shared function
    - Says the host holds one and calls it, so the way can be chosen or swapped without changing the host
  explanation: The host depends on the question, and the ways of answering are chosen from outside.
```
