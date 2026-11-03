---
id: s6-memory-service
title: A service that copies memory into the blackboard
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [observer, component]
skills: [ai, components]
terms: [bt-service, blackboard, behavior-tree, ai-controller, findcomponentbyclass]
prerequisites: [s6-walk-beat, s6-sense-memory]
xp: 80
estimatedMinutes: 25
concepts:
  - A service that keeps blackboard keys current while its branch runs
  - Reading a component once per interval instead of every frame
  - A clue that counts only while it is fresh
---

# Brief

When a guard's tree has the Read Memory service on its root, the blackboard holds what the guard's sense memory knows from the first frame the tree runs, follows every change within a quarter of a second, and drops a clue once it is more than six seconds old.

Compiles against earlier quests: s6-sense-memory (`Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h`) and s6-walk-beat (`Quests/s6-walk-beat/DojoS6TreeKit.h`, `Quests/s6-walk-beat/DojoS6BTTask_WalkBeat.h`, `Quests/s6-walk-beat/DojoS6Guard.h`).

The header is written; every function body in the `.cpp` is yours:

1. The constructor names the node `Read Memory`, sets `Interval` to 0.25 seconds with no random deviation, and asks the tree for the activation and tick calls.
2. `OnBecomeRelevant` and `TickNode` each call their parent version first, then copy the memory.
3. `CopyMemory` finds the `UDojoS6SenseMemoryComponent` on the tree's AI controller and writes the four keys named by `FDojoS6TreeKit`: `TargetActor` (the followed actor), `TargetVisible`, `ClueLocation`, and `HasClue`, which is true only while the memory has a clue no older than `ClueSeconds`. Without a memory component or a blackboard it does nothing.

Dependency direction: the service reads the memory component and writes the blackboard; the memory knows nothing about trees, and decorators and tasks read only keys, never the component.

This is the third piece of the Night Shift boss.

## See it in the editor

Open `BT_Guard` from the walk beat quest and add the four keys to `BB_Guard`: `TargetActor` (Object, base class Actor), `TargetVisible` (Bool), `ClueLocation` (Vector), `HasClue` (Bool). Right-click the root's Sequence, choose Add Service, and pick Read Memory. Give the guard's AI controller a `DojoS6SenseMemoryComponent`, as in the memory quest. Press Play, select the guard, and open the Gameplay Debugger with the apostrophe key: the blackboard section lists the four keys. Call Note Noise on the memory from the level Blueprint on a key press and watch `HasClue` turn true within a quarter of a second, then false six seconds later.

# Files

## DojoS6BTService_ReadMemory.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTService.h"
#include "DojoS6BTService_ReadMemory.generated.h"

/** A Behavior Tree service that copies the guard's sense memory into the blackboard as soon as its branch starts and then on a fixed interval, so decorators and tasks read keys instead of components. */
UCLASS()
class UDojoS6BTService_ReadMemory : public UBTService
{
	GENERATED_BODY()

public:
	/** Names the node, sets the interval, and asks for the activation and tick calls. */
	UDojoS6BTService_ReadMemory();

	/** How old a clue may be, in seconds, and still count as fresh. */
	UPROPERTY(EditAnywhere, Category = "Memory", meta = (ClampMin = "0"))
	float ClueSeconds = 6.f;

protected:
	/** Copies the memory the moment the branch starts, so the first decision already sees it. */
	virtual void OnBecomeRelevant(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

	/** Copies the memory again on every interval. */
	virtual void TickNode(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds) override;

private:
	/** Writes the four guard keys from the memory component on the AI controller; does nothing when either is missing. */
	void CopyMemory(UBehaviorTreeComponent& OwnerComp) const;
};
```

## DojoS6BTService_ReadMemory.cpp

```cpp
#include "DojoS6BTService_ReadMemory.h"

#include "AIController.h"
#include "BehaviorTree/BehaviorTreeComponent.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"

/** Names the node, sets the interval, and asks for the activation and tick calls. */
UDojoS6BTService_ReadMemory::UDojoS6BTService_ReadMemory()
{
}

/** Copies the memory the moment the branch starts. */
void UDojoS6BTService_ReadMemory::OnBecomeRelevant(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
}

/** Copies the memory again on every interval. */
void UDojoS6BTService_ReadMemory::TickNode(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds)
{
}

/** Writes the four guard keys from the memory component on the AI controller. */
void UDojoS6BTService_ReadMemory::CopyMemory(UBehaviorTreeComponent& OwnerComp) const
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "AIController.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "BehaviorTree/Composites/BTComposite_Selector.h"
#include "Quests/s6-memory-service/DojoS6BTService_ReadMemory.h"
#include "Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h"
#include "Quests/s6-walk-beat/DojoS6BTTask_WalkBeat.h"
#include "Quests/s6-walk-beat/DojoS6Guard.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS6ReadMemoryTest
{
	/** A tree whose root selector carries Read Memory over one long Walk Beat. */
	UBehaviorTree* MakeServiceTree()
	{
		UBehaviorTree* Tree = FDojoS6TreeKit::MakeTree();
		UBTComposite_Selector* Root = FDojoS6TreeKit::AddRootSelector(Tree);
		FDojoS6TreeKit::AddService<UDojoS6BTService_ReadMemory>(Root);
		FDojoS6TreeKit::AddTask<UDojoS6BTTask_WalkBeat>(Root);
		return Tree;
	}

	/** Spawns a guard with a long beat and, when asked, puts a sense memory on its AI controller. */
	ADojoS6Guard* MakeGuard(FDojoTestWorld& TestWorld, bool bWithMemory)
	{
		ADojoS6Guard* Guard = TestWorld.SpawnActor<ADojoS6Guard>();
		Guard->Beat = { FVector(3000.f, 0.f, 0.f) };

		if (bWithMemory)
		{
			TestWorld.AddComponent<UDojoS6SenseMemoryComponent>(Guard->GetController());
		}

		return Guard;
	}

	/** The sense memory on the guard's AI controller. */
	UDojoS6SenseMemoryComponent* MemoryOf(const ADojoS6Guard* Guard)
	{
		return Guard->GetController()->FindComponentByClass<UDojoS6SenseMemoryComponent>();
	}

	/** The blackboard of the guard's AI controller. */
	UBlackboardComponent* BlackboardOf(const ADojoS6Guard* Guard)
	{
		return Cast<AAIController>(Guard->GetController())->GetBlackboardComponent();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_ReadMemory_FirstFrameSeesTheMemory, "Dojo.S6.ReadMemory.FirstFrameSeesTheMemory", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fills the memory before the tree starts and checks that the keys hold it after two frames. */
bool FDojo_S6_ReadMemory_FirstFrameSeesTheMemory::RunTest(const FString& Parameters)
{
	using namespace DojoS6ReadMemoryTest;

	FDojoTestWorld TestWorld;
	TStrongObjectPtr<UBehaviorTree> Tree(MakeServiceTree());
	ADojoS6Guard* Guard = MakeGuard(TestWorld, true);
	ADojoTestActor* Intruder = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("The guard's controller has a memory"), MemoryOf(Guard))) return false;

	MemoryOf(Guard)->NoteSight(Intruder, true, FVector(500.f, 0.f, 0.f));
	if (!TestTrue(TEXT("The tree starts"), FDojoS6TreeKit::Run(Guard, Tree.Get()))) return false;
	TestWorld.Tick(2);

	UBlackboardComponent* Blackboard = BlackboardOf(Guard);
	if (!TestNotNull(TEXT("The controller made a blackboard"), Blackboard)) return false;
	TestTrue(TEXT("TargetActor holds the intruder"), Blackboard->GetValueAsObject(FDojoS6TreeKit::TargetActorKey()) == Intruder);
	TestTrue(TEXT("TargetVisible is set"), Blackboard->GetValueAsBool(FDojoS6TreeKit::TargetVisibleKey()));
	TestEqual(TEXT("ClueLocation holds where the intruder was seen"), Blackboard->GetValueAsVector(FDojoS6TreeKit::ClueLocationKey()), FVector(500.f, 0.f, 0.f));
	TestTrue(TEXT("A fresh clue sets HasClue"), Blackboard->GetValueAsBool(FDojoS6TreeKit::HasClueKey()));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_ReadMemory_FollowsChanges, "Dojo.S6.ReadMemory.FollowsChanges", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Changes the memory while the tree runs and checks that each change reaches the keys within a third of a second. */
bool FDojo_S6_ReadMemory_FollowsChanges::RunTest(const FString& Parameters)
{
	using namespace DojoS6ReadMemoryTest;

	FDojoTestWorld TestWorld;
	TStrongObjectPtr<UBehaviorTree> Tree(MakeServiceTree());
	ADojoS6Guard* Guard = MakeGuard(TestWorld, true);
	ADojoTestActor* Intruder = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestTrue(TEXT("The tree starts"), FDojoS6TreeKit::Run(Guard, Tree.Get()))) return false;
	UDojoS6SenseMemoryComponent* Memory = MemoryOf(Guard);
	UBlackboardComponent* Blackboard = BlackboardOf(Guard);
	if (!TestNotNull(TEXT("Memory and blackboard exist"), Blackboard)) return false;

	TestWorld.Tick(2);
	TestFalse(TEXT("An empty memory means no clue"), Blackboard->GetValueAsBool(FDojoS6TreeKit::HasClueKey()));
	TestFalse(TEXT("An empty memory means nobody in sight"), Blackboard->GetValueAsBool(FDojoS6TreeKit::TargetVisibleKey()));

	Memory->NoteNoise(FVector(200.f, 0.f, 0.f));
	TestWorld.Tick(20);
	TestTrue(TEXT("A noise reaches HasClue"), Blackboard->GetValueAsBool(FDojoS6TreeKit::HasClueKey()));
	TestEqual(TEXT("A noise reaches ClueLocation"), Blackboard->GetValueAsVector(FDojoS6TreeKit::ClueLocationKey()), FVector(200.f, 0.f, 0.f));

	Memory->NoteSight(Intruder, true, FVector(400.f, 0.f, 0.f));
	TestWorld.Tick(20);
	TestTrue(TEXT("A sighting reaches TargetVisible"), Blackboard->GetValueAsBool(FDojoS6TreeKit::TargetVisibleKey()));
	TestTrue(TEXT("A sighting reaches TargetActor"), Blackboard->GetValueAsObject(FDojoS6TreeKit::TargetActorKey()) == Intruder);

	Memory->NoteSight(Intruder, false, FVector(450.f, 0.f, 0.f));
	TestWorld.Tick(20);
	TestFalse(TEXT("Losing sight reaches TargetVisible"), Blackboard->GetValueAsBool(FDojoS6TreeKit::TargetVisibleKey()));
	TestTrue(TEXT("The lost intruder is still the target"), Blackboard->GetValueAsObject(FDojoS6TreeKit::TargetActorKey()) == Intruder);
	TestEqual(TEXT("The place it was lost reaches ClueLocation"), Blackboard->GetValueAsVector(FDojoS6TreeKit::ClueLocationKey()), FVector(450.f, 0.f, 0.f));

	Memory->Forget();
	TestWorld.Tick(20);
	TestTrue(TEXT("Forgetting clears TargetActor"), Blackboard->GetValueAsObject(FDojoS6TreeKit::TargetActorKey()) == nullptr);
	TestFalse(TEXT("Forgetting clears HasClue"), Blackboard->GetValueAsBool(FDojoS6TreeKit::HasClueKey()));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_ReadMemory_ClueGoesStale, "Dojo.S6.ReadMemory.ClueGoesStale", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Hears one noise and checks that HasClue stays set for six seconds and clears after that, while the memory still holds the clue. */
bool FDojo_S6_ReadMemory_ClueGoesStale::RunTest(const FString& Parameters)
{
	using namespace DojoS6ReadMemoryTest;

	FDojoTestWorld TestWorld;
	TStrongObjectPtr<UBehaviorTree> Tree(MakeServiceTree());
	ADojoS6Guard* Guard = MakeGuard(TestWorld, true);
	if (!TestTrue(TEXT("The tree starts"), FDojoS6TreeKit::Run(Guard, Tree.Get()))) return false;
	UDojoS6SenseMemoryComponent* Memory = MemoryOf(Guard);
	UBlackboardComponent* Blackboard = BlackboardOf(Guard);
	if (!TestNotNull(TEXT("Memory and blackboard exist"), Blackboard)) return false;

	Memory->NoteNoise(FVector(-300.f, 0.f, 0.f));
	TestWorld.Tick(330);
	TestTrue(TEXT("A clue five and a half seconds old still counts"), Blackboard->GetValueAsBool(FDojoS6TreeKit::HasClueKey()));

	TestWorld.Tick(60);
	TestFalse(TEXT("A clue six and a half seconds old no longer counts"), Blackboard->GetValueAsBool(FDojoS6TreeKit::HasClueKey()));
	TestTrue(TEXT("The memory itself still holds the clue; only the key says it is stale"), Memory->HasClue());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_ReadMemory_NoMemoryChangesNothing, "Dojo.S6.ReadMemory.NoMemoryChangesNothing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Runs the tree on a controller with no sense memory and checks that the keys stay empty and the guard still walks. */
bool FDojo_S6_ReadMemory_NoMemoryChangesNothing::RunTest(const FString& Parameters)
{
	using namespace DojoS6ReadMemoryTest;

	FDojoTestWorld TestWorld;
	TStrongObjectPtr<UBehaviorTree> Tree(MakeServiceTree());
	ADojoS6Guard* Guard = MakeGuard(TestWorld, false);
	if (!TestTrue(TEXT("The tree starts"), FDojoS6TreeKit::Run(Guard, Tree.Get()))) return false;

	TestWorld.Tick(30);
	UBlackboardComponent* Blackboard = BlackboardOf(Guard);
	if (!TestNotNull(TEXT("The controller made a blackboard"), Blackboard)) return false;
	TestFalse(TEXT("No memory, no clue"), Blackboard->GetValueAsBool(FDojoS6TreeKit::HasClueKey()));
	TestTrue(TEXT("No memory, no target"), Blackboard->GetValueAsObject(FDojoS6TreeKit::TargetActorKey()) == nullptr);
	TestTrue(TEXT("The beat goes on"), Guard->GetActorLocation().X > 100.f);

	return true;
}

#endif
```

# Hints

- A service only ticks if the tree is told it wants to, the same way the walk task asked for `TickTask`; the service base class has its own macro for that, and `Interval` and `RandomDeviation` are fields you set in the constructor.
- The parent `TickNode` schedules the next tick, so skipping it stops the service after its first copy. Both overrides do the same work, which is why that work lives in one private function.
- `GetAIOwner` on the tree component gives the AI controller and `GetBlackboardComponent` gives the blackboard; `FindComponentByClass` finds the memory on the controller. A clue is fresh when the memory has one and its age is at most `ClueSeconds`; `SetValueAsObject`, `SetValueAsBool`, and `SetValueAsVector` take the key names from the kit.

# Rubric

- The service copies the memory when its branch becomes relevant and then every quarter of a second while the branch runs, and the parent versions keep its timer going.
- The four keys always match the memory: the followed actor, whether it is in sight, where the newest clue is, and whether that clue is no older than `ClueSeconds`.
- A missing memory component or blackboard leaves the keys untouched and breaks nothing.
- The memory knows nothing about the tree; the service is the only node that reads the component.
- Nothing reads the memory every frame.

# Alternative

The memory could write the blackboard itself, in the same place it broadcasts `OnMemoryChanged`. Keys would then change the instant the news arrives, with no quarter-second delay. The cost is that the memory would have to know about blackboards and key names, so it could no longer serve a guard without a tree, such as the state machine plan from the breakdown, and the staleness rule would need a timer of its own. The service keeps the memory a plain component and puts the translation into tree terms in one node a designer can see. Its interval is a dial between how fresh the keys are and how much work each guard does per second. The memory announces; the service is a periodic reader; the decorator in the next quest is the tree's own Observer, reacting the moment a key changes.

# Parsons

```yaml
- id: read-memory-fresh-clue
  prompt: Put the lines that write the clue keys in order.
  lines:
    - "const bool bFreshClue = Memory->HasClue() && Memory->GetClueAge() <= ClueSeconds;"
    - "Blackboard->SetValueAsVector(FDojoS6TreeKit::ClueLocationKey(), Memory->GetClueLocation());"
    - "Blackboard->SetValueAsBool(FDojoS6TreeKit::HasClueKey(), bFreshClue);"
  distractors:
    - line: "Blackboard->SetValueAsBool(FDojoS6TreeKit::HasClueKey(), Memory->HasClue());"
      mistake: The memory keeps a clue forever until it is forgotten; without the age check a noise from a minute ago would still send the guard searching.
    - line: "Blackboard->SetValue<UBlackboardKeyType_Bool>(TEXT(\"Has Clue\"), bFreshClue);"
      mistake: Key names must match the blackboard exactly; a misspelled name writes nothing and gives no error.
```
