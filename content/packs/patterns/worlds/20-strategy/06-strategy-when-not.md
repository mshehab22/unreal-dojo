---
id: p20-strategy-when-not
title: When a plain if is the better rule
order: 6
kind: concept
difficulty: 2
patterns: [strategy]
skills: [strategy, architecture]
terms: [tsubclassof, newobject, uinterface, instanced-subobjects]
prerequisites: [p20-turret-refactor]
xp: 25
estimatedMinutes: 9
concepts:
  - Two fixed variants that never grow are plainer as a bool and an if than as a base class and two rules
  - A host that changes its own behaviour as events happen is a state machine, not a host holding a rule
  - A rule that needs a lot of the host's private data means the line between them is in the wrong place
  - A rule that remembers things belongs to one host, and a rule object made for one class must not outlive a change of class
  - A rule that is a line of code can be a function, and one that is only numbers can be data
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a pickup in the yard is either a coin or a gem, and the design says it will never be anything else. A teammate wants a pickup rule base class, a coin rule, a gem rule, and a Details picker. Is that the right tool?"
choices:
  - Yes, every choice between two behaviours should be a rule class
  - Yes, but only if the rules are marked Instanced
  - No; a bool and an if are clearer, and there is nothing to add later
  - No; use a Blueprint instead
answerIndex: 2
explanation: A base class and two rules cost three files and a pointer to choose between two things that will never become three. An if says the same thing in one place.
```

# Card

Strategy takes a class for every way of doing a job, and the host takes a pointer and a call. That is a good trade when the ways are many, change, or are chosen by a designer. It is a bad one in these cases.

**Two fixed variants.** If the job has two ways and the design says there will never be a third, a `bool` and an `if` is shorter and easier to read than a base class, two children, and a property. Build the rule objects when a third way appears, or when a designer needs to choose, not before.

**A host that changes itself.** A guard that patrols until it sees the player, chases until it loses sight, and then searches is switching modes in response to events, and each mode usually knows which comes next. Giving it rule objects and a game mode to change them from outside gets the direction wrong. That is State: the host owns the switching, and the objects it switches between may know each other.

**Variation that needs the host's tools.** If each way needs many protected helpers of the host, and ways are chosen when the actor is made and never change, a subclass of the host with a base class full of helper functions is the plainer shape. That is Subclass Sandbox. Reach for a strategy when the way must change on one actor, or be shared by different kinds of actors, or be tuned by a designer in Details.

**A rule that wants the host's private data.** The rule can only use what it is given. If a rule needs six of the turret's private fields to answer, the work probably belongs in the turret, or the right things should be passed as parameters. A rule handed the whole host and reaching into it ties each rule to the host again.

**A rule that remembers.** The patrol rule remembers which way it is heading. Two hosts sharing one such rule object tangle each other. Each host needs an object of its own, which an instanced property gives it, and a class reference does only when the host makes the object itself.

**A swap that leaves the old rule behind.** A host that makes its rule object from a class reference makes it once and keeps it. When the class is changed, the object made for the old class is still there, and the next step runs the old rule. The host has to let go of the old object when the class changes, or check the object against the class before it uses it. The same trap hides in any code that remembers something made from a choice and then lets the choice change.

**A rule made on every call.** Making a new object on every call turns a tiny decision into a stream of short-lived objects for the garbage collector to clear. Make the object once and keep it.

**A rule that is a line of code.** If the whole rule is one comparison, a `TFunction` or a delegate on the host is lighter than a class. If the rule is only numbers, such as how far a patrol goes, that is data for a Type Object or a data asset, not behaviour.

**A strategy for a thing that has one way.** A base class with a single child is a plan for a future that may not come. Wait for the second way.

# Example

```cpp
// Right-sized: two fixed variants, and no third is planned. An if is the whole design.
void ADojoPickup::Collect(ADojoPlayer* Collector)
{
	if (bIsGem) Collector->AddGems(1);
	else Collector->AddCoins(1);
}
```

# Questions

```yaml
- id: when-not-state
  type: multiple-choice
  prompt: "A door is closed, opening, open, or closing, and it moves from one to the next when the player acts and when its timer ends. Which pattern fits?"
  choices:
    - Strategy, with a rule for each of the four
    - State, because the door changes its own behaviour in response to events
    - Subclass Sandbox, with a door class for each of the four
    - Type Object, with a data row for each of the four
  answerIndex: 1
  explanation: The door switches itself, and each mode leads to the next. A strategy is chosen from outside and stays put.
- id: when-not-private-data
  type: multiple-choice
  prompt: "A targeting rule needs seven of the turret's private fields to do its job. What does that suggest?"
  choices:
    - The rule should be marked Instanced
    - The line between the rule and the turret is in the wrong place, so pass only what the rule needs or keep the work in the turret
    - The turret's fields should all become public
    - The rule should be a Blueprint
  answerIndex: 1
  explanation: A rule is supposed to need little from its host. One that needs a lot is really part of the host.
- id: spot-leftover-rule
  type: spot-the-bug
  prompt: A dummy makes its rule object from its class the first time it steps and keeps it, and its class can be changed at any time. Which line keeps the dummy moving by the old rule after the class is changed?
  code: |
    void ADojoMover::Step(float DeltaSeconds)
    {
    	UClass* Chosen = RuleClass.Get();
    	if (Rule == nullptr) Rule = NewObject<UDojoMoveRule>(this, Chosen);
    	SetActorLocation(Rule->NextLocation(GetActorLocation(), Anchor, DeltaSeconds));
    }
  bugLine: 4
  fix: Check the held object against the class as well as against nullptr, or let go of the object whenever the class is changed.
  explanation: The object made for the old class is still held and is not null, so the step keeps asking it.
- id: when-not-shared-memory
  type: multiple-choice
  prompt: "A patrol rule remembers which way it is heading, and one patrol rule object is given to two dummies. What happens?"
  choices:
    - Nothing, each dummy has its own heading inside the dummy
    - Each dummy turns round when the other reaches an end, because they share the one heading
    - The second dummy cannot be given a rule
    - Both dummies stand still
  answerIndex: 1
  explanation: The heading lives in the rule object, so two dummies that share the object share the heading.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when the Strategy pattern is the wrong choice.
  modelAnswer: When there are only two fixed ways, when the host should change its own behaviour as events happen, or when the rule would need a lot of the host's private data, a plain if, State, or a different split is better.
  rubric:
    - Names a case such as two fixed variants, a host that changes itself, or a rule that needs the host's private data
    - Says what to use instead or why the rule would not work
  explanation: Use a strategy when the way varies, is chosen from outside, and needs little from its host.
```
