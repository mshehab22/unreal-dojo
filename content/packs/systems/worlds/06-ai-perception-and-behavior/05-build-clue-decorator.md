---
id: s6-clue-decorator
title: A decorator that drops the beat for a near clue
order: 5
kind: build
scaffold: blank
difficulty: 4
patterns: [state, observer]
skills: [ai, state]
terms: [bt-decorator, blackboard, behavior-tree, bt-service, ai-controller]
prerequisites: [s6-memory-service, s6-walk-beat, s6-sense-memory]
xp: 90
estimatedMinutes: 30
concepts:
  - A condition that lets a branch run only while a fresh clue is near enough
  - Switching branches the moment the condition changes, in both directions
  - A designer-tunable distance on a node
---

# Brief

When a guard walking a long beat gets a fresh clue within 1500 units, it stops walking within half a second and runs the branch under the Near Clue decorator; when the clue goes stale, it goes back to its beat within half a second; and a clue farther away than the limit is ignored.

Write `UDojoS6BTDecorator_NearClue` from nothing. It is a Behavior Tree decorator. Its condition holds when the blackboard's `HasClue` key is set and the point in `ClueLocation` lies within `MaxDistance` of the guard's pawn. The key names come from `FDojoS6TreeKit`. The tests put it on a sequence holding the Hold task, which never finishes on its own, in a tree like this:

- Root selector, with Read Memory from the last quest
  - Sequence with Near Clue on top, holding Hold
  - Walk Beat

The tests use this public interface, so keep these names:

- `UDojoS6BTDecorator_NearClue()`, the default constructor, which sets everything the decorator needs; the tests change nothing else.
- `UPROPERTY(EditAnywhere) float MaxDistance = 1500.f;`, how far from the guard a clue may be.

Compiles against earlier quests: s6-walk-beat (`Quests/s6-walk-beat/DojoS6TreeKit.h`, `Quests/s6-walk-beat/DojoS6BTTask_Hold.h`, `Quests/s6-walk-beat/DojoS6BTTask_WalkBeat.h`, `Quests/s6-walk-beat/DojoS6Guard.h`), s6-memory-service (`Quests/s6-memory-service/DojoS6BTService_ReadMemory.h`), and s6-sense-memory (`Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h`).

Dependency direction: the decorator reads two blackboard keys and the pawn's location; it knows nothing about the memory component, the service that fills the keys, or the tasks below it.

This is the fourth piece of the Night Shift boss.

## See it in the editor

In `BT_Guard`, change the root to a Selector. Under it put a Sequence with a Wait task of 3 seconds, then the Walk Beat task to its right. Right-click the Sequence, choose Add Decorator, and pick Near Clue; set Max Distance in its Details. Keep Read Memory on the root. Press Play, call Note Noise on the guard's memory near the guard from the level Blueprint, and watch the Behavior Tree editor: the Near Clue branch lights up while the guard stands still, and the beat lights up again once the clue is stale.

# Files

## DojoS6BTDecorator_NearClue.h

```cpp
// Declare UDojoS6BTDecorator_NearClue here.
```

## DojoS6BTDecorator_NearClue.cpp

```cpp
// Define UDojoS6BTDecorator_NearClue here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "BehaviorTree/Composites/BTComposite_Selector.h"
#include "BehaviorTree/Composites/BTComposite_Sequence.h"
#include "Quests/s6-clue-decorator/DojoS6BTDecorator_NearClue.h"
#include "Quests/s6-memory-service/DojoS6BTService_ReadMemory.h"
#include "Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h"
#include "Quests/s6-walk-beat/DojoS6BTTask_Hold.h"
#include "Quests/s6-walk-beat/DojoS6BTTask_WalkBeat.h"
#include "Quests/s6-walk-beat/DojoS6Guard.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS6NearClueTest
{
	/** A root selector with Read Memory over a Near Clue branch that holds, and the beat to its right. */
	UBehaviorTree* MakeClueTree(float MaxDistance)
	{
		UBehaviorTree* Tree = FDojoS6TreeKit::MakeTree();
		UBTComposite_Selector* Root = FDojoS6TreeKit::AddRootSelector(Tree);
		FDojoS6TreeKit::AddService<UDojoS6BTService_ReadMemory>(Root);

		UBTComposite_Sequence* Investigate = FDojoS6TreeKit::AddSequence(Root);
		FDojoS6TreeKit::AddDecorator<UDojoS6BTDecorator_NearClue>(Root)->MaxDistance = MaxDistance;
		FDojoS6TreeKit::AddTask<UDojoS6BTTask_Hold>(Investigate);

		FDojoS6TreeKit::AddTask<UDojoS6BTTask_WalkBeat>(Root);
		return Tree;
	}

	/** Spawns a guard walking east toward a far point, with a sense memory on its controller, and starts the tree. */
	ADojoS6Guard* StartGuard(FDojoTestWorld& TestWorld, UBehaviorTree* Tree)
	{
		ADojoS6Guard* Guard = TestWorld.SpawnActor<ADojoS6Guard>();
		Guard->Beat = { FVector(3000.f, 0.f, 0.f) };
		Guard->WalkSpeed = 300.f;
		TestWorld.AddComponent<UDojoS6SenseMemoryComponent>(Guard->GetController());
		FDojoS6TreeKit::Run(Guard, Tree);
		return Guard;
	}

	/** The sense memory on the guard's AI controller. */
	UDojoS6SenseMemoryComponent* MemoryOf(const ADojoS6Guard* Guard)
	{
		return Guard->GetController()->FindComponentByClass<UDojoS6SenseMemoryComponent>();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_NearClue_StopsTheBeat, "Dojo.S6.NearClue.StopsTheBeat", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Hears a noise near a walking guard and checks that it stops within half a second, long before it reaches its beat point. */
bool FDojo_S6_NearClue_StopsTheBeat::RunTest(const FString& Parameters)
{
	using namespace DojoS6NearClueTest;

	FDojoTestWorld TestWorld;
	if (!TestTrue(TEXT("The test world has an AI system"), FDojoS6TreeKit::EnableAI(TestWorld.GetWorld()))) return false;
	TStrongObjectPtr<UBehaviorTree> Tree(MakeClueTree(1500.f));
	ADojoS6Guard* Guard = StartGuard(TestWorld, Tree.Get());
	if (!TestNotNull(TEXT("The guard's controller has a memory"), MemoryOf(Guard))) return false;

	TestWorld.Tick(30);
	const double WalkingX = Guard->GetActorLocation().X;
	TestTrue(TEXT("With no clue the guard walks its beat"), WalkingX > 100.0);

	MemoryOf(Guard)->NoteNoise(FVector(200.f, 300.f, 0.f));
	TestWorld.Tick(30);
	const double StoppedX = Guard->GetActorLocation().X;
	TestTrue(TEXT("Within half a second of a near noise the guard has stopped short of its point"), StoppedX < WalkingX + 160.0);

	TestWorld.Tick(60);
	TestTrue(TEXT("While the clue is fresh the guard stands still"), FMath::IsNearlyEqual(Guard->GetActorLocation().X, StoppedX, 0.01));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_NearClue_StaleClueResumesTheBeat, "Dojo.S6.NearClue.StaleClueResumesTheBeat", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lets a near clue go stale and checks that the guard walks its beat again without waiting for anything else. */
bool FDojo_S6_NearClue_StaleClueResumesTheBeat::RunTest(const FString& Parameters)
{
	using namespace DojoS6NearClueTest;

	FDojoTestWorld TestWorld;
	if (!TestTrue(TEXT("The test world has an AI system"), FDojoS6TreeKit::EnableAI(TestWorld.GetWorld()))) return false;
	TStrongObjectPtr<UBehaviorTree> Tree(MakeClueTree(1500.f));
	ADojoS6Guard* Guard = StartGuard(TestWorld, Tree.Get());
	if (!TestNotNull(TEXT("The guard's controller has a memory"), MemoryOf(Guard))) return false;

	TestWorld.Tick(10);
	MemoryOf(Guard)->NoteNoise(FVector(-200.f, 0.f, 0.f));
	TestWorld.Tick(60);
	const double HeldX = Guard->GetActorLocation().X;

	TestWorld.Tick(270);
	TestTrue(TEXT("Five and a half seconds after the noise the clue is still fresh and the guard still stands"), FMath::IsNearlyEqual(Guard->GetActorLocation().X, HeldX, 0.01));

	TestWorld.Tick(90);
	TestTrue(TEXT("Once the clue is stale the guard walks its beat again"), Guard->GetActorLocation().X > HeldX + 50.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_NearClue_FarClueIsIgnored, "Dojo.S6.NearClue.FarClueIsIgnored", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Hears a noise beyond the limit, and a near one with a tighter limit, and checks that the guard keeps walking both times. */
bool FDojo_S6_NearClue_FarClueIsIgnored::RunTest(const FString& Parameters)
{
	using namespace DojoS6NearClueTest;

	FDojoTestWorld TestWorld;
	if (!TestTrue(TEXT("The test world has an AI system"), FDojoS6TreeKit::EnableAI(TestWorld.GetWorld()))) return false;
	TStrongObjectPtr<UBehaviorTree> WideTree(MakeClueTree(1500.f));
	ADojoS6Guard* Guard = StartGuard(TestWorld, WideTree.Get());
	if (!TestNotNull(TEXT("The guard's controller has a memory"), MemoryOf(Guard))) return false;

	TestWorld.Tick(10);
	MemoryOf(Guard)->NoteNoise(FVector(0.f, 4000.f, 0.f));
	const double HeardX = Guard->GetActorLocation().X;
	TestWorld.Tick(60);
	TestTrue(TEXT("A noise 4000 units away does not stop the beat"), Guard->GetActorLocation().X > HeardX + 250.0);

	TStrongObjectPtr<UBehaviorTree> TightTree(MakeClueTree(100.f));
	ADojoS6Guard* Careful = StartGuard(TestWorld, TightTree.Get());
	if (!TestNotNull(TEXT("The second guard's controller has a memory"), MemoryOf(Careful))) return false;

	TestWorld.Tick(10);
	MemoryOf(Careful)->NoteNoise(Careful->GetActorLocation() + FVector(0.f, 300.f, 0.f));
	const double CarefulX = Careful->GetActorLocation().X;
	TestWorld.Tick(60);
	TestTrue(TEXT("With MaxDistance 100, a noise 300 units away does not stop the beat"), Careful->GetActorLocation().X > CarefulX + 250.0);

	return true;
}

#endif
```

# Hints

- A decorator's condition is one const function that returns true or false; read the two keys from the tree component's blackboard and the pawn from its AI controller. A decorator whose condition is right can still fail these tests, so check when the tree asks for it.
- The tree evaluates a decorator when execution reaches its node. A guard that is busy walking further right in the tree never reaches it until the walk ends. Decorators have a setting for watching their condition while other branches run, with values for watching lower branches, their own branch, or both.
- `UBTDecorator_BlackboardBase` is a decorator base class that registers as an observer of one blackboard key and asks the tree to check the condition again whenever that key changes. Set its `BlackboardKey` to the clue flag and its abort mode in the constructor; on Windows, avoid parameter names that match members of the base classes.

# Rubric

- The condition holds only while `HasClue` is set and the clue lies within `MaxDistance` of the guard's pawn; without a pawn or a blackboard it is false.
- A fresh near clue interrupts the beat within half a second, and the branch under the decorator runs.
- When the clue goes stale, the decorator's own branch is interrupted and the beat resumes within half a second.
- A clue beyond `MaxDistance` changes nothing, and `MaxDistance` is a property a designer edits on the node.
- The decorator reads only blackboard keys and the pawn's location; it knows nothing about the memory, the service, or the tasks below it.

# Alternative

A decorator with only a condition is checked when the tree reaches its node, and the beat task runs for ten seconds before the tree comes back, so a guard built that way finishes its walk before it notices the noise. That is the failure this quest was built around. Setting `FlowAbortMode` to Lower Priority turns the decorator into an observer of its key: when the key changes and the condition becomes true, the tree aborts the branches to its right and runs this one. Self does the opposite, aborting its own branch when the condition turns false, which is what lets the Hold task end. Both gives the guard the behavior the spec asked for. The tree is now a State machine whose transitions are decorators, and the blackboard key is the event they observe, which is the Observer pattern built into the engine. The cost of observing is small: a callback when the key changes, never a check every frame.

# Parsons

```yaml
- id: near-clue-condition
  prompt: Put the body of CalculateRawConditionValue in order.
  lines:
    - "const UBlackboardComponent* Blackboard = OwnerComp.GetBlackboardComponent();"
    - "const AAIController* Controller = OwnerComp.GetAIOwner();"
    - "const APawn* Pawn = Controller != nullptr ? Controller->GetPawn() : nullptr;"
    - "if (Blackboard == nullptr || Pawn == nullptr || !Blackboard->GetValueAsBool(FDojoS6TreeKit::HasClueKey())) return false;"
    - "const FVector Clue = Blackboard->GetValueAsVector(FDojoS6TreeKit::ClueLocationKey());"
    - "return FVector::Dist(Pawn->GetActorLocation(), Clue) <= MaxDistance;"
  distractors:
    - line: "const FVector Clue = Controller->FindComponentByClass<UDojoS6SenseMemoryComponent>()->GetClueLocation();"
      mistake: The decorator would bypass the blackboard and depend on the memory component, so a guard without one would crash and the staleness rule would be skipped.
    - line: "Blackboard->SetValueAsBool(FDojoS6TreeKit::HasClueKey(), false);"
      mistake: A condition only reads; it is const and runs whenever the tree asks, so writing a key there changes the facts the other nodes decide on.
```
