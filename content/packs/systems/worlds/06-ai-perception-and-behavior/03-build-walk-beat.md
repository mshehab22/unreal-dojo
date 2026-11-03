---
id: s6-walk-beat
title: A Behavior Tree task that walks a beat
order: 3
kind: build
scaffold: faded
difficulty: 3
patterns: [state, component]
skills: [ai, movement, memory]
terms: [behavior-tree, bt-task-node, node-memory, ai-controller, blackboard, pawn]
prerequisites: [s6-sense-memory]
xp: 80
estimatedMinutes: 25
concepts:
  - A task that runs over many frames and ends itself when the guard arrives
  - Per-guard state in node memory, because one task object serves every guard
  - The guard's place on its beat belonging to the guard, not to the task
---

# Brief

When a guard with a beat of two points runs a tree whose only task is Walk Beat, it walks to the first point at its walking speed, then to the second, then back to the first, forever; and when two guards run the same tree, each walks its own beat.

The tree kit, the guard pawn, and the hold task are written for you; the later quests of this world include them from `Quests/s6-walk-beat/`.

How a Behavior Tree runs here: there is no Behavior Tree asset in a headless test, so `FDojoS6TreeKit` builds the tree in code, node by node, the same objects the Behavior Tree editor saves into an asset, with the guard's four blackboard keys. `FDojoS6TreeKit::Run` hands it to the guard's AI controller, which makes the blackboard and starts the tree. A finished tree starts again from the root, so a tree with one Walk Beat task walks the whole beat point by point.

Fill the gaps in `UDojoS6BTTask_WalkBeat`:

1. `ExecuteTask`: the guard and its next point are found for you. Store the point as this guard's destination in the node memory block, and report that the task is still running, so the tree keeps calling `TickTask` instead of moving on.
2. `TickTask`: when the destination is within one step or within `AcceptanceRadius`, put the guard exactly on it, move the guard on to its next beat point, and finish the task as a success. Otherwise take one step of `WalkSpeed` times the frame time straight toward it.
3. `InitializeMemory` and `CleanupMemory`: build and tear down this guard's `FDojoS6WalkBeatMemory` in its block. `GetInstanceMemorySize` already tells the tree how many bytes that is.

Dependency direction: the task points at the guard pawn through the AI controller and reads the guard's beat; the guard knows nothing about trees or tasks. The guard owns where it is on its beat, the task owns only the walk in progress.

This is the second piece of the Night Shift boss.

## See it in the editor

Make a Blackboard asset `BB_Guard` and a Behavior Tree asset `BT_Guard` that uses it. In `BT_Guard`, put a Sequence under the root and a Walk Beat task under the Sequence; Walk Beat appears in the task list because it is a `UBTTaskNode` class. Make a Blueprint class from `DojoS6Guard` called `BP_Guard`, place one in the level, give it two Beat points in Details, and in its Event Graph call Run Behavior Tree on Get AI Controller with `BT_Guard` on BeginPlay. Press Play: the guard glides to each point in turn. With the Behavior Tree editor open while playing, the Walk Beat node lights up while it runs, and finishes once per point.

# Files

## DojoS6TreeKit.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BehaviorTree.h"
#include "BehaviorTree/BTCompositeNode.h"

class APawn;
class UWorld;
class UBTComposite_Selector;
class UBTComposite_Sequence;

/** Builds a Behavior Tree in code, node by node, the way the Behavior Tree editor builds an asset; a headless test has no assets, so the tests and the boss use this, and its keys are the guard's blackboard. */
struct FDojoS6TreeKit
{
	/** The Object key holding the actor the guard follows. */
	static FName TargetActorKey();

	/** The Bool key that is true while the followed actor is in sight. */
	static FName TargetVisibleKey();

	/** The Vector key holding where the newest clue is. */
	static FName ClueLocationKey();

	/** The Bool key that is true while there is a fresh clue. */
	static FName HasClueKey();

	/** Gives a world an AI system (behavior tree manager and perception) if it has none; a world made with UWorld::CreateWorld as a game world starts without one. Returns whether the world has one now. */
	static bool EnableAI(UWorld* World);

	/** Makes an empty tree whose blackboard holds the four guard keys. */
	static UBehaviorTree* MakeTree();

	/** Makes a selector and sets it as the tree's root. */
	static UBTComposite_Selector* AddRootSelector(UBehaviorTree* Tree);

	/** Makes a sequence and sets it as the tree's root. */
	static UBTComposite_Sequence* AddRootSequence(UBehaviorTree* Tree);

	/** Adds a sequence as Parent's next child. */
	static UBTComposite_Sequence* AddSequence(UBTCompositeNode* Parent);

	/** Adds a task as Parent's next child. */
	template<typename TTask>
	static TTask* AddTask(UBTCompositeNode* Parent)
	{
		TTask* Task = NewObject<TTask>(Parent->GetTreeAsset());
		const int32 ChildIndex = Parent->Children.AddZeroed(1);
		Parent->Children[ChildIndex].ChildTask = Task;
		return Task;
	}

	/** Puts a decorator on Parent's newest child, the way a decorator sits on top of a node in the editor. */
	template<typename TDecorator>
	static TDecorator* AddDecorator(UBTCompositeNode* Parent)
	{
		TDecorator* Decorator = NewObject<TDecorator>(Parent->GetTreeAsset());
		Parent->Children.Last().Decorators.Add(Decorator);
		return Decorator;
	}

	/** Puts a service on a composite node; it runs while that node's branch is active. */
	template<typename TService>
	static TService* AddService(UBTCompositeNode* Node)
	{
		TService* Service = NewObject<TService>(Node->GetTreeAsset());
		Node->Services.Add(Service);
		return Service;
	}

	/** Starts Tree on the pawn's AI controller, which makes the blackboard first; false when the pawn has no AI controller. */
	static bool Run(APawn* Pawn, UBehaviorTree* Tree);
};
```

## DojoS6TreeKit.cpp

```cpp
#include "DojoS6TreeKit.h"

#include "AI/AISystemBase.h"
#include "AIController.h"
#include "BehaviorTree/BlackboardData.h"
#include "BehaviorTree/Blackboard/BlackboardKeyType_Bool.h"
#include "BehaviorTree/Blackboard/BlackboardKeyType_Object.h"
#include "BehaviorTree/Blackboard/BlackboardKeyType_Vector.h"
#include "BehaviorTree/Composites/BTComposite_Selector.h"
#include "BehaviorTree/Composites/BTComposite_Sequence.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "GameFramework/Pawn.h"

namespace DojoS6TreeKitLocal
{
	/** Adds one key of the given type to a blackboard. */
	void AddKey(UBlackboardData* Blackboard, FName Name, UBlackboardKeyType* KeyType)
	{
		FBlackboardEntry Entry;
		Entry.EntryName = Name;
		Entry.KeyType = KeyType;
		Blackboard->Keys.Add(Entry);
	}
}

/** The Object key holding the actor the guard follows. */
FName FDojoS6TreeKit::TargetActorKey()
{
	return TEXT("TargetActor");
}

/** The Bool key that is true while the followed actor is in sight. */
FName FDojoS6TreeKit::TargetVisibleKey()
{
	return TEXT("TargetVisible");
}

/** The Vector key holding where the newest clue is. */
FName FDojoS6TreeKit::ClueLocationKey()
{
	return TEXT("ClueLocation");
}

/** The Bool key that is true while there is a fresh clue. */
FName FDojoS6TreeKit::HasClueKey()
{
	return TEXT("HasClue");
}

/** Gives a world an AI system if it has none, and starts it the way a world starting play would. */
bool FDojoS6TreeKit::EnableAI(UWorld* World)
{
	if (World == nullptr)
	{
		return false;
	}

	if (World->GetAISystem() == nullptr)
	{
		UAISystemBase* AISystem = World->CreateAISystem();

		if (AISystem == nullptr)
		{
			return false;
		}

		AISystem->InitializeActorsForPlay(false);
		AISystem->StartPlay();
	}

	return true;
}

/** Makes an empty tree whose blackboard holds the four guard keys. */
UBehaviorTree* FDojoS6TreeKit::MakeTree()
{
	UBlackboardData* Blackboard = NewObject<UBlackboardData>();

	UBlackboardKeyType_Object* TargetType = NewObject<UBlackboardKeyType_Object>(Blackboard);
	TargetType->BaseClass = AActor::StaticClass();

	DojoS6TreeKitLocal::AddKey(Blackboard, TargetActorKey(), TargetType);
	DojoS6TreeKitLocal::AddKey(Blackboard, TargetVisibleKey(), NewObject<UBlackboardKeyType_Bool>(Blackboard));
	DojoS6TreeKitLocal::AddKey(Blackboard, ClueLocationKey(), NewObject<UBlackboardKeyType_Vector>(Blackboard));
	DojoS6TreeKitLocal::AddKey(Blackboard, HasClueKey(), NewObject<UBlackboardKeyType_Bool>(Blackboard));
	Blackboard->UpdateParentKeys();

	UBehaviorTree* Tree = NewObject<UBehaviorTree>();
	Tree->BlackboardAsset = Blackboard;
	return Tree;
}

/** Makes a selector and sets it as the tree's root. */
UBTComposite_Selector* FDojoS6TreeKit::AddRootSelector(UBehaviorTree* Tree)
{
	UBTComposite_Selector* Selector = NewObject<UBTComposite_Selector>(Tree);
	Selector->InitializeFromAsset(*Tree);
	Tree->RootNode = Selector;
	return Selector;
}

/** Makes a sequence and sets it as the tree's root. */
UBTComposite_Sequence* FDojoS6TreeKit::AddRootSequence(UBehaviorTree* Tree)
{
	UBTComposite_Sequence* Sequence = NewObject<UBTComposite_Sequence>(Tree);
	Sequence->InitializeFromAsset(*Tree);
	Tree->RootNode = Sequence;
	return Sequence;
}

/** Adds a sequence as Parent's next child. */
UBTComposite_Sequence* FDojoS6TreeKit::AddSequence(UBTCompositeNode* Parent)
{
	UBehaviorTree* Tree = Parent->GetTreeAsset();
	UBTComposite_Sequence* Sequence = NewObject<UBTComposite_Sequence>(Tree);
	Sequence->InitializeFromAsset(*Tree);

	const int32 ChildIndex = Parent->Children.AddZeroed(1);
	Parent->Children[ChildIndex].ChildComposite = Sequence;
	return Sequence;
}

/** Starts Tree on the pawn's AI controller, which makes the blackboard first. */
bool FDojoS6TreeKit::Run(APawn* Pawn, UBehaviorTree* Tree)
{
	AAIController* Controller = Pawn != nullptr ? Cast<AAIController>(Pawn->GetController()) : nullptr;

	if (Controller == nullptr || Tree == nullptr)
	{
		return false;
	}

	return Controller->RunBehaviorTree(Tree);
}
```

## DojoS6Guard.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DojoS6Guard.generated.h"

/** A guard's body: a pawn with a beat of points to walk in order and a walking speed; the pawn owns where it is on its beat, and an AI controller decides what it does. */
UCLASS()
class ADojoS6Guard : public APawn
{
	GENERATED_BODY()

public:
	/** Gives the guard a root and has an AI controller possess it as soon as it is placed or spawned. */
	ADojoS6Guard();

	/** The points of the beat, in world space, walked in order and then from the start again. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Guard")
	TArray<FVector> Beat;

	/** How fast the guard walks, in units per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Guard", meta = (ClampMin = "0"))
	float WalkSpeed = 300.f;

	/** Writes the next point of the beat into OutPoint; false when the beat is empty. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	bool GetNextPoint(FVector& OutPoint) const;

	/** Moves on to the point after the next one, going back to the first after the last. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	void AdvancePoint();

	/** Which point of the beat comes next, counted from 0. */
	UFUNCTION(BlueprintPure, Category = "Guard")
	int32 GetNextPointIndex() const;

private:
	int32 NextPointIndex = 0;
};
```

## DojoS6Guard.cpp

```cpp
#include "DojoS6Guard.h"

#include "AIController.h"
#include "Components/SceneComponent.h"

/** Gives the guard a root and has an AI controller possess it as soon as it is placed or spawned. */
ADojoS6Guard::ADojoS6Guard()
{
	PrimaryActorTick.bCanEverTick = false;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	AIControllerClass = AAIController::StaticClass();
	AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
}

/** Writes the next point of the beat into OutPoint; false when the beat is empty. */
bool ADojoS6Guard::GetNextPoint(FVector& OutPoint) const
{
	if (Beat.Num() == 0)
	{
		return false;
	}

	OutPoint = Beat[NextPointIndex % Beat.Num()];
	return true;
}

/** Moves on to the point after the next one, going back to the first after the last. */
void ADojoS6Guard::AdvancePoint()
{
	if (Beat.Num() == 0)
	{
		return;
	}

	NextPointIndex = (NextPointIndex + 1) % Beat.Num();
}

/** Which point of the beat comes next, counted from 0. */
int32 ADojoS6Guard::GetNextPointIndex() const
{
	return NextPointIndex;
}
```

## DojoS6BTTask_Hold.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTTaskNode.h"
#include "DojoS6BTTask_Hold.generated.h"

/** A task that stands still and never finishes on its own; the branch above it ends only when a decorator aborts it. */
UCLASS()
class UDojoS6BTTask_Hold : public UBTTaskNode
{
	GENERATED_BODY()

public:
	/** Names the node for the Behavior Tree editor. */
	UDojoS6BTTask_Hold();

	/** Starts holding and stays in progress. */
	virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;
};
```

## DojoS6BTTask_Hold.cpp

```cpp
#include "DojoS6BTTask_Hold.h"

/** Names the node for the Behavior Tree editor. */
UDojoS6BTTask_Hold::UDojoS6BTTask_Hold()
{
	NodeName = TEXT("Hold");
}

/** Starts holding and stays in progress. */
EBTNodeResult::Type UDojoS6BTTask_Hold::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
	return EBTNodeResult::InProgress;
}
```

## DojoS6BTTask_WalkBeat.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTTaskNode.h"
#include "DojoS6BTTask_WalkBeat.generated.h"

class ADojoS6Guard;

/** What one guard's run of the task needs to remember between frames; the tree keeps one of these per guard. */
struct FDojoS6WalkBeatMemory
{
	/** The beat point this run walks to. */
	FVector Destination = FVector::ZeroVector;
};

/** A Behavior Tree task that walks the guard to the next point of its beat over several frames and succeeds on arrival; one node object serves every guard that runs the tree. */
UCLASS()
class UDojoS6BTTask_WalkBeat : public UBTTaskNode
{
	GENERATED_BODY()

public:
	/** Names the node and asks for TickTask. */
	UDojoS6BTTask_WalkBeat();

	/** How close to a point counts as arriving. */
	UPROPERTY(EditAnywhere, Category = "Walk", meta = (ClampMin = "1"))
	float AcceptanceRadius = 10.f;

	/** Picks the guard's next beat point and starts walking; fails when there is no guard or no beat. */
	virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

	/** How many bytes of memory each guard's run of this task needs. */
	virtual uint16 GetInstanceMemorySize() const override;

	/** Builds the memory block when a guard starts the tree. */
	virtual void InitializeMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryInit::Type InitType) const override;

	/** Tears the memory block down when a guard's tree stops. */
	virtual void CleanupMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryClear::Type CleanupType) const override;

protected:
	/** Moves the guard one frame's walk closer and finishes the task on arrival. */
	virtual void TickTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds) override;

private:
	/** The guard pawn the tree is running for, or null. */
	static ADojoS6Guard* FindGuard(const UBehaviorTreeComponent& OwnerComp);
};
```

## DojoS6BTTask_WalkBeat.cpp

```cpp
#include "DojoS6BTTask_WalkBeat.h"

#include "AIController.h"
#include "BehaviorTree/BehaviorTreeComponent.h"
#include "DojoS6Guard.h"

/** Names the node and asks for TickTask. */
UDojoS6BTTask_WalkBeat::UDojoS6BTTask_WalkBeat()
{
	NodeName = TEXT("Walk Beat");
	INIT_TASK_NODE_NOTIFY_FLAGS(); // @explain: The macro sees that this class overrides TickTask and sets bNotifyTick, without which the tree would never call TickTask.
}

/** Picks the guard's next beat point and starts walking. */
EBTNodeResult::Type UDojoS6BTTask_WalkBeat::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
	const ADojoS6Guard* Guard = FindGuard(OwnerComp);
	FVector Point;

	if (Guard == nullptr || !Guard->GetNextPoint(Point))
	{
		return EBTNodeResult::Failed;
	}

	// Your code: store Point as this guard's destination in the node memory block.
	// Your code: report that the task keeps running, so the tree calls TickTask on the next frames.
	return EBTNodeResult::Failed;
}

/** How many bytes of memory each guard's run of this task needs. */
uint16 UDojoS6BTTask_WalkBeat::GetInstanceMemorySize() const
{
	return sizeof(FDojoS6WalkBeatMemory); // @explain: The tree reserves this many bytes for this node in each guard's own memory, which is how one shared task object can track a different walk per guard.
}

/** Builds the memory block when a guard starts the tree. */
void UDojoS6BTTask_WalkBeat::InitializeMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryInit::Type InitType) const
{
	// Your code: build this guard's FDojoS6WalkBeatMemory in the block, with the node base class's helper for that.
}

/** Tears the memory block down when a guard's tree stops. */
void UDojoS6BTTask_WalkBeat::CleanupMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryClear::Type CleanupType) const
{
	// Your code: tear this guard's FDojoS6WalkBeatMemory down, with the matching helper.
}

/** Moves the guard one frame's walk closer and finishes the task on arrival. */
void UDojoS6BTTask_WalkBeat::TickTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds)
{
	ADojoS6Guard* Guard = FindGuard(OwnerComp);

	if (Guard == nullptr)
	{
		FinishLatentTask(OwnerComp, EBTNodeResult::Failed); // @explain: A task that returned InProgress must end itself with FinishLatentTask; returning from TickTask does not end it.
		return;
	}

	const FDojoS6WalkBeatMemory* Memory = CastInstanceNodeMemory<FDojoS6WalkBeatMemory>(NodeMemory);
	const FVector Here = Guard->GetActorLocation();
	const FVector ToGo = Memory->Destination - Here;
	const float Step = Guard->WalkSpeed * DeltaSeconds;

	// Your code: when the destination is within one step or within AcceptanceRadius, stand the guard on it, move the guard on to its next beat point, finish the task as a success, and leave.
	// Your code: otherwise take one step of length Step straight toward the destination.
}

/** The guard pawn the tree is running for, or null. */
ADojoS6Guard* UDojoS6BTTask_WalkBeat::FindGuard(const UBehaviorTreeComponent& OwnerComp)
{
	const AAIController* Controller = OwnerComp.GetAIOwner(); // @explain: The tree component belongs to the AI controller, so the guard pawn is reached through the controller that possesses it.
	return Controller != nullptr ? Cast<ADojoS6Guard>(Controller->GetPawn()) : nullptr;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "BehaviorTree/Composites/BTComposite_Sequence.h"
#include "Quests/s6-walk-beat/DojoS6BTTask_WalkBeat.h"
#include "Quests/s6-walk-beat/DojoS6Guard.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS6WalkBeatTest
{
	/** A tree whose root sequence holds one Walk Beat task. */
	UBehaviorTree* MakeBeatTree()
	{
		UBehaviorTree* Tree = FDojoS6TreeKit::MakeTree();
		UBTComposite_Sequence* Root = FDojoS6TreeKit::AddRootSequence(Tree);
		FDojoS6TreeKit::AddTask<UDojoS6BTTask_WalkBeat>(Root);
		return Tree;
	}

	/** Spawns a guard at Start with the given beat and a speed of 300. */
	ADojoS6Guard* MakeGuard(FDojoTestWorld& TestWorld, const FVector& Start, const TArray<FVector>& Beat)
	{
		ADojoS6Guard* Guard = TestWorld.SpawnActor<ADojoS6Guard>();
		Guard->SetActorLocation(Start);
		Guard->Beat = Beat;
		Guard->WalkSpeed = 300.f;
		return Guard;
	}

	/** True when Value lies between Low and High. */
	bool Between(double Value, double Low, double High)
	{
		return Value >= Low && Value <= High;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_WalkBeat_WalksTheBeat, "Dojo.S6.WalkBeat.WalksTheBeat", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Runs one guard on a two point beat and checks where it is at half a second, one and a half, and two and a half. */
bool FDojo_S6_WalkBeat_WalksTheBeat::RunTest(const FString& Parameters)
{
	using namespace DojoS6WalkBeatTest;

	FDojoTestWorld TestWorld;
	if (!TestTrue(TEXT("The test world has an AI system"), FDojoS6TreeKit::EnableAI(TestWorld.GetWorld()))) return false;
	TStrongObjectPtr<UBehaviorTree> Tree(MakeBeatTree());
	ADojoS6Guard* Guard = MakeGuard(TestWorld, FVector::ZeroVector, { FVector(300.f, 0.f, 0.f), FVector(300.f, 300.f, 0.f) });
	if (!TestNotNull(TEXT("Guard spawned"), Guard)) return false;
	TestNotNull(TEXT("The guard has an AI controller as soon as it spawns"), Guard->GetController());
	if (!TestTrue(TEXT("The tree starts"), FDojoS6TreeKit::Run(Guard, Tree.Get()))) return false;

	TestWorld.Tick(30);
	FVector Where = Guard->GetActorLocation();
	TestTrue(TEXT("Half a second in, the guard is halfway to the first point"), Between(Where.X, 100.0, 200.0) && FMath::IsNearlyZero(Where.Y, 1.0));
	TestEqual(TEXT("The first point is still next"), Guard->GetNextPointIndex(), 0);

	TestWorld.Tick(60);
	Where = Guard->GetActorLocation();
	TestTrue(TEXT("After one and a half seconds it stood on the first point and walks to the second"), FMath::IsNearlyEqual(Where.X, 300.0, 1.0) && Between(Where.Y, 75.0, 225.0));
	TestEqual(TEXT("Arriving moved the guard on to the second point"), Guard->GetNextPointIndex(), 1);

	TestWorld.Tick(60);
	Where = Guard->GetActorLocation();
	TestTrue(TEXT("After two and a half seconds it walks back toward the first point"), FMath::IsNearlyEqual(Where.X, 300.0, 1.0) && Between(Where.Y, 75.0, 225.0));
	TestEqual(TEXT("The beat starts over after the last point"), Guard->GetNextPointIndex(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_WalkBeat_TwoGuardsOneTree, "Dojo.S6.WalkBeat.TwoGuardsOneTree", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Runs two guards on one tree with beats in different directions and checks that each walks its own. */
bool FDojo_S6_WalkBeat_TwoGuardsOneTree::RunTest(const FString& Parameters)
{
	using namespace DojoS6WalkBeatTest;

	FDojoTestWorld TestWorld;
	if (!TestTrue(TEXT("The test world has an AI system"), FDojoS6TreeKit::EnableAI(TestWorld.GetWorld()))) return false;
	TStrongObjectPtr<UBehaviorTree> Tree(MakeBeatTree());
	ADojoS6Guard* East = MakeGuard(TestWorld, FVector::ZeroVector, { FVector(600.f, 0.f, 0.f) });
	ADojoS6Guard* South = MakeGuard(TestWorld, FVector(0.f, 1000.f, 0.f), { FVector(0.f, 400.f, 0.f) });
	if (!TestNotNull(TEXT("Both guards spawned"), South)) return false;
	TestTrue(TEXT("The first guard runs the tree"), FDojoS6TreeKit::Run(East, Tree.Get()));
	TestTrue(TEXT("The second guard runs the same tree"), FDojoS6TreeKit::Run(South, Tree.Get()));

	TestWorld.Tick(60);
	const FVector EastWhere = East->GetActorLocation();
	const FVector SouthWhere = South->GetActorLocation();
	TestTrue(TEXT("The first guard walks east only"), Between(EastWhere.X, 230.0, 330.0) && FMath::IsNearlyZero(EastWhere.Y, 1.0));
	TestTrue(TEXT("The second guard walks toward its own point only"), Between(SouthWhere.Y, 670.0, 770.0) && FMath::IsNearlyZero(SouthWhere.X, 1.0));

	TestWorld.Tick(90);
	TestTrue(TEXT("The first guard reached its point"), East->GetActorLocation().Equals(FVector(600.f, 0.f, 0.f), 1.f));
	TestTrue(TEXT("The second guard reached its point"), South->GetActorLocation().Equals(FVector(0.f, 400.f, 0.f), 1.f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_WalkBeat_EmptyBeatStandsStill, "Dojo.S6.WalkBeat.EmptyBeatStandsStill", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Runs a guard with no beat and checks that the task fails and the guard does not move. */
bool FDojo_S6_WalkBeat_EmptyBeatStandsStill::RunTest(const FString& Parameters)
{
	using namespace DojoS6WalkBeatTest;

	FDojoTestWorld TestWorld;
	if (!TestTrue(TEXT("The test world has an AI system"), FDojoS6TreeKit::EnableAI(TestWorld.GetWorld()))) return false;
	TStrongObjectPtr<UBehaviorTree> Tree(MakeBeatTree());
	ADojoS6Guard* Guard = MakeGuard(TestWorld, FVector(50.f, 50.f, 0.f), {});
	if (!TestNotNull(TEXT("Guard spawned"), Guard)) return false;
	FDojoS6TreeKit::Run(Guard, Tree.Get());

	TestWorld.Tick(30);
	TestTrue(TEXT("A guard with no beat stands where it was"), Guard->GetActorLocation().Equals(FVector(50.f, 50.f, 0.f), 0.01f));
	TestEqual(TEXT("Its next point index never moves"), Guard->GetNextPointIndex(), 0);

	return true;
}

#endif
```

# Hints

- In `ExecuteTask`, the memory block for this guard arrives as the raw `NodeMemory` pointer; one call on the node base class turns it into your struct, and two more build and tear the struct down in place. The three results a task can return are Succeeded, Failed, and InProgress, and only one of them makes the tree come back next frame.
- In `TickTask`, compare the distance still to go with the larger of the step and the acceptance radius. Arriving is three things in a fixed order: stand on the point, tell the guard to move on, finish. Leave the function right after, so the walking line below does not run on the same frame.
- If one guard works and two guards drift toward each other's points, the destination is being kept somewhere both guards share. Each guard's tree has its own memory block; the task object itself is shared by both trees.

# Rubric

- `ExecuteTask` stores the destination in node memory and returns InProgress; it fails without a guard or a beat.
- `TickTask` moves the guard at its walking speed and, on arrival, stands it on the point, advances the beat, and ends the task with `FinishLatentTask` as a success.
- Two guards running one tree each walk their own beat, because nothing about a walk in progress is stored in the shared task object.
- The guard owns its beat and its place on it; the task reads them and never stores them.
- The task reaches the pawn through the AI controller and holds no pointer to it between frames.

# Alternative

Setting `bCreateNodeInstance = true` in the constructor makes the tree create one task object per guard, and then a member variable for the destination would be safe. It is simpler to write and slower to run: each guard pays for a whole UObject per instanced node, and the engine's own tasks avoid it for that reason. Node memory is the shared-object design the engine expects, at the cost of a struct and a cast. A real game would also walk with `MoveToLocation` on the AI controller, which follows the nav mesh around walls; the test world has no nav mesh, so this task moves the pawn itself. Seen from the guard, the tree is choosing one behavior to run at a time, which is the State pattern from Pack 2's "State" world: each task is a state's update, and finishing hands control back to the tree.

# Parsons

```yaml
- id: walk-beat-arrive
  prompt: Put the arrival check from TickTask in order.
  lines:
    - "if (ToGo.Size() <= FMath::Max(Step, AcceptanceRadius))"
    - "{"
    - "	Guard->SetActorLocation(Memory->Destination);"
    - "	Guard->AdvancePoint();"
    - "	FinishLatentTask(OwnerComp, EBTNodeResult::Succeeded);"
    - "	return;"
    - "}"
  distractors:
    - line: "	return EBTNodeResult::Succeeded;"
      mistake: TickTask returns nothing; a latent task ends only through FinishLatentTask, which tells the tree to move on.
    - line: "	Destination = Memory->Destination;"
      mistake: A member variable on the task is shared by every guard that runs the tree, so another guard's walk would overwrite it.
```
