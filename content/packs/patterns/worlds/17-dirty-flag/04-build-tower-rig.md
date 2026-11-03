---
id: p17-tower-rig
title: A tower of joints that answers where each one is
order: 4
kind: build
scaffold: stub
difficulty: 4
patterns: [dirty-flag]
skills: [dirty-flag, data-structures]
terms: [tarray, ustruct, uproperty, mutable-member]
prerequisites: [p17-dirty-flag-card]
xp: 130
estimatedMinutes: 40
concepts:
  - A joint's position is its parent's position plus its own offset, and a root's position is its offset
  - Positions are kept and worked out again only after something has moved
  - The counters say how many times each joint's position has really been worked out
  - Moving a joint, or setting it to where it already is, does no work until a position is read
---

# Brief

When you press Play with the setup below, a tower of joints answers where each joint is, reading an untouched tower works every joint out exactly once, and a tower whose joints have been moved always answers with their current places.

`ADojoP17TowerRig` describes a tower as `Nodes`, joints stored parents before children. Each joint has a parent index (lower than its own, or `INDEX_NONE` for a root) and a local offset from its parent. A joint's position in the rig is its parent's position plus its own offset, and a root's position is just its offset. The tower is read much more often than it moves: a camera, a light, and a sound all follow the lantern every frame. So positions are kept, and a position is worked out again only when it has to be.

The declarations, the constructor, the three caches, `EnsureCaches`, `GetLocalOffset`, and the counters are given. Yours are:

- `GetPosition(Index)`: the joint's position in the rig, from the kept position when it can be trusted and by working it out when it cannot. Each time a joint's position is worked out, its counter goes up by one. A missing joint, or a parent index that is not lower than the joint's own, gives zero for the parent part.
- `SetLocalOffset(Index, NewOffset)`: moves a joint. It returns false for a joint that does not exist, and true otherwise. Setting the offset a joint already has changes nothing at all.

The rig depends only on its own joints.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP17TowerRig`. In Details, add three Nodes: Base (Parent Index -1, Local Offset 0, 0, 0), Platform (Parent Index 0, Local Offset 0, 0, 300), and Lantern (Parent Index 1, Local Offset 0, 0, 100). In the Level Blueprint, on Begin Play, print Get Position for index 2 three times: X=0.000 Y=0.000 Z=400.000 each time. Then print Get Recompute Count for indices 0, 1, and 2: 1 each. Call Set Local Offset with index 2 and (0, 0, 150), print Get Position for index 2 (X=0.000 Y=0.000 Z=450.000) and the three counters again: 1, 1, and 2.

# Files

## DojoP17RigNode.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP17RigNode.generated.h"

/** One joint of a tower rig: where it sits relative to its parent joint. */
USTRUCT(BlueprintType)
struct FDojoP17RigNode
{
	GENERATED_BODY()

	/** The joint's name, for the designer. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rig")
	FName NodeName = NAME_None;

	/** Index of the parent joint, which must be lower than this joint's own index; INDEX_NONE for a root. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rig")
	int32 ParentIndex = INDEX_NONE;

	/** Where this joint sits relative to its parent, or relative to the rig for a root. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rig")
	FVector LocalOffset = FVector::ZeroVector;
};
```

## DojoP17TowerRig.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP17RigNode.h"
#include "GameFramework/Actor.h"
#include "DojoP17TowerRig.generated.h"

/** A tower described as joints in a tree: each joint's position is its parent's position plus its own offset, kept ready for the many readers and worked out again only when a joint has moved. Dirty Flag pattern. */
UCLASS()
class ADojoP17TowerRig : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP17TowerRig();

	/** The joints, parents before children. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rig")
	TArray<FDojoP17RigNode> Nodes;

	/** Moves joint Index to NewOffset; returns false when there is no such joint. Setting the offset it already has changes nothing. */
	UFUNCTION(BlueprintCallable, Category = "Rig")
	bool SetLocalOffset(int32 Index, FVector NewOffset);

	/** The offset joint Index was given, or zero when there is no such joint. */
	UFUNCTION(BlueprintPure, Category = "Rig")
	FVector GetLocalOffset(int32 Index) const;

	/** Where joint Index is in the rig: its parent's position plus its own offset, or just its offset for a root; zero when there is no such joint. */
	UFUNCTION(BlueprintPure, Category = "Rig")
	FVector GetPosition(int32 Index) const;

	/** How many times joint Index's position has been worked out. */
	UFUNCTION(BlueprintPure, Category = "Rig")
	int32 GetRecomputeCount(int32 Index) const;

	/** How many times any joint's position has been worked out. */
	UFUNCTION(BlueprintPure, Category = "Rig")
	int32 GetTotalRecomputeCount() const;

private:
	/** Sizes the three caches to the joint list; every joint starts without a trusted position. */
	void EnsureCaches() const;

	/** The position last worked out for each joint. */
	mutable TArray<FVector> CachedPositions;

	/** Whether each joint's cached position can be trusted. */
	mutable TArray<bool> CacheValid;

	/** Times each joint's position has been worked out. */
	mutable TArray<int32> RecomputeCounts;
};
```

## DojoP17TowerRig.cpp

```cpp
#include "DojoP17TowerRig.h"

#include "Components/SceneComponent.h"

ADojoP17TowerRig::ADojoP17TowerRig()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

bool ADojoP17TowerRig::SetLocalOffset(int32 Index, FVector NewOffset)
{
	return false;
}

FVector ADojoP17TowerRig::GetLocalOffset(int32 Index) const
{
	return Nodes.IsValidIndex(Index) ? Nodes[Index].LocalOffset : FVector::ZeroVector;
}

FVector ADojoP17TowerRig::GetPosition(int32 Index) const
{
	return FVector::ZeroVector;
}

int32 ADojoP17TowerRig::GetRecomputeCount(int32 Index) const
{
	EnsureCaches();
	return RecomputeCounts.IsValidIndex(Index) ? RecomputeCounts[Index] : 0;
}

int32 ADojoP17TowerRig::GetTotalRecomputeCount() const
{
	EnsureCaches();

	int32 Total = 0;
	for (const int32 Count : RecomputeCounts) Total += Count;
	return Total;
}

void ADojoP17TowerRig::EnsureCaches() const
{
	const int32 Count = Nodes.Num();
	if (CacheValid.Num() == Count) return;

	CachedPositions.Init(FVector::ZeroVector, Count);
	CacheValid.Init(false, Count);
	RecomputeCounts.Init(0, Count);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p17-tower-rig/DojoP17RigNode.h"
#include "Quests/p17-tower-rig/DojoP17TowerRig.h"
#include "Support/DojoTestWorld.h"

namespace DojoP17RigTest
{
	/** A joint with a name, a parent index, and an offset. */
	FDojoP17RigNode MakeNode(const TCHAR* NodeName, int32 ParentIndex, const FVector& LocalOffset)
	{
		FDojoP17RigNode Result;
		Result.NodeName = NodeName;
		Result.ParentIndex = ParentIndex;
		Result.LocalOffset = LocalOffset;
		return Result;
	}

	/** Spawns a rig of seven joints: Base (0), Platform (1) and Lantern (2) in a chain, a second root, Flag (3), with a Pennant (4) on it, a Stray (5) whose parent index is not lower than its own, and a root, Late (6), that Stray names. */
	ADojoP17TowerRig* SpawnRig(FDojoTestWorld& TestWorld)
	{
		ADojoP17TowerRig* Rig = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP17TowerRig>(ADojoP17TowerRig::StaticClass(), FTransform::Identity);
		if (Rig)
		{
			Rig->Nodes = {
				MakeNode(TEXT("Base"), INDEX_NONE, FVector(0.f, 0.f, 0.f)),
				MakeNode(TEXT("Platform"), 0, FVector(0.f, 0.f, 300.f)),
				MakeNode(TEXT("Lantern"), 1, FVector(0.f, 0.f, 100.f)),
				MakeNode(TEXT("Flag"), INDEX_NONE, FVector(500.f, 0.f, 0.f)),
				MakeNode(TEXT("Pennant"), 3, FVector(0.f, 0.f, 50.f)),
				MakeNode(TEXT("Stray"), 6, FVector(7.f, 0.f, 0.f)),
				MakeNode(TEXT("Late"), INDEX_NONE, FVector(100.f, 0.f, 0.f)),
			};
			Rig->FinishSpawning(FTransform::Identity);
		}
		return Rig;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_TowerRig_PositionsAddUp, "Dojo.P17.TowerRig.PositionsAddUp", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A joint's position is its parent's plus its own offset, a root's is its offset, and a missing joint is refused. */
bool FDojo_P17_TowerRig_PositionsAddUp::RunTest(const FString& Parameters)
{
	using namespace DojoP17RigTest;

	FDojoTestWorld TestWorld;

	ADojoP17TowerRig* Rig = SpawnRig(TestWorld);
	if (!TestNotNull(TEXT("Rig spawned"), Rig)) return false;

	TestEqual(TEXT("The base is at its offset"), Rig->GetPosition(0), FVector(0.f, 0.f, 0.f));
	TestEqual(TEXT("The platform is 300 above the base"), Rig->GetPosition(1), FVector(0.f, 0.f, 300.f));
	TestEqual(TEXT("The lantern is 100 above the platform"), Rig->GetPosition(2), FVector(0.f, 0.f, 400.f));
	TestEqual(TEXT("The flag is a second root"), Rig->GetPosition(3), FVector(500.f, 0.f, 0.f));
	TestEqual(TEXT("The pennant is 50 above the flag"), Rig->GetPosition(4), FVector(500.f, 0.f, 50.f));
	TestEqual(TEXT("A parent index that is not lower than the joint's own means no parent, even when that joint exists"), Rig->GetPosition(5), FVector(7.f, 0.f, 0.f));

	TestEqual(TEXT("A joint that does not exist is at zero"), Rig->GetPosition(9), FVector::ZeroVector);
	TestFalse(TEXT("A joint that does not exist cannot be moved"), Rig->SetLocalOffset(9, FVector(1.f, 1.f, 1.f)));
	TestFalse(TEXT("Neither can a negative index"), Rig->SetLocalOffset(-1, FVector(1.f, 1.f, 1.f)));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_TowerRig_UntouchedRigWorksEachJointOnce, "Dojo.P17.TowerRig.UntouchedRigWorksEachJointOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Reading an untouched rig again and again works each joint out once and no more; setting a joint to where it already is changes nothing. */
bool FDojo_P17_TowerRig_UntouchedRigWorksEachJointOnce::RunTest(const FString& Parameters)
{
	using namespace DojoP17RigTest;

	FDojoTestWorld TestWorld;

	ADojoP17TowerRig* Rig = SpawnRig(TestWorld);
	if (!TestNotNull(TEXT("Rig spawned"), Rig)) return false;

	TestEqual(TEXT("Nothing has been worked out before the first read"), Rig->GetTotalRecomputeCount(), 0);

	for (int32 Pass = 0; Pass < 4; Pass++)
	{
		for (int32 Index = 0; Index < 5; Index++) Rig->GetPosition(Index);
	}

	for (int32 Index = 0; Index < 5; Index++) TestEqual(TEXT("Each joint was worked out exactly once"), Rig->GetRecomputeCount(Index), 1);
	TestEqual(TEXT("Five in all"), Rig->GetTotalRecomputeCount(), 5);

	TestTrue(TEXT("Setting a joint to where it already is succeeds"), Rig->SetLocalOffset(2, FVector(0.f, 0.f, 100.f)));
	Rig->GetPosition(2);
	TestEqual(TEXT("And works nothing out"), Rig->GetTotalRecomputeCount(), 5);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_TowerRig_MovingTheLanternWorksOnlyTheLanternOut, "Dojo.P17.TowerRig.MovingTheLanternWorksOnlyTheLanternOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moving the lantern, which nothing hangs from, works out only the lantern the next time it is read. */
bool FDojo_P17_TowerRig_MovingTheLanternWorksOnlyTheLanternOut::RunTest(const FString& Parameters)
{
	using namespace DojoP17RigTest;

	FDojoTestWorld TestWorld;

	ADojoP17TowerRig* Rig = SpawnRig(TestWorld);
	if (!TestNotNull(TEXT("Rig spawned"), Rig)) return false;

	for (int32 Index = 0; Index < 5; Index++) Rig->GetPosition(Index);

	TestTrue(TEXT("The lantern moves"), Rig->SetLocalOffset(2, FVector(0.f, 0.f, 150.f)));
	TestEqual(TEXT("Its offset is the new one"), Rig->GetLocalOffset(2), FVector(0.f, 0.f, 150.f));
	for (int32 Index = 0; Index < 5; Index++) Rig->GetPosition(Index);

	TestEqual(TEXT("The lantern is 150 above the platform now"), Rig->GetPosition(2), FVector(0.f, 0.f, 450.f));
	TestEqual(TEXT("The lantern was worked out again"), Rig->GetRecomputeCount(2), 2);
	TestEqual(TEXT("The base was not"), Rig->GetRecomputeCount(0), 1);
	TestEqual(TEXT("The platform was not"), Rig->GetRecomputeCount(1), 1);
	TestEqual(TEXT("The flag was not"), Rig->GetRecomputeCount(3), 1);
	TestEqual(TEXT("The pennant was not"), Rig->GetRecomputeCount(4), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_TowerRig_ChildrenFollowTheirParent, "Dojo.P17.TowerRig.ChildrenFollowTheirParent", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moving the base moves everything that hangs from it and nothing else, and each moved joint is worked out once however many moved before the read. */
bool FDojo_P17_TowerRig_ChildrenFollowTheirParent::RunTest(const FString& Parameters)
{
	using namespace DojoP17RigTest;

	FDojoTestWorld TestWorld;

	ADojoP17TowerRig* Rig = SpawnRig(TestWorld);
	if (!TestNotNull(TEXT("Rig spawned"), Rig)) return false;

	for (int32 Index = 0; Index < 5; Index++) Rig->GetPosition(Index);

	Rig->SetLocalOffset(0, FVector(100.f, 0.f, 0.f));
	TestEqual(TEXT("The lantern follows the base"), Rig->GetPosition(2), FVector(100.f, 0.f, 400.f));
	TestEqual(TEXT("The platform follows the base"), Rig->GetPosition(1), FVector(100.f, 0.f, 300.f));
	TestEqual(TEXT("The flag, on its own root, does not"), Rig->GetPosition(3), FVector(500.f, 0.f, 0.f));
	TestEqual(TEXT("Neither does the pennant"), Rig->GetPosition(4), FVector(500.f, 0.f, 50.f));

	TestEqual(TEXT("The base was worked out again"), Rig->GetRecomputeCount(0), 2);
	TestEqual(TEXT("The platform was worked out again"), Rig->GetRecomputeCount(1), 2);
	TestEqual(TEXT("The lantern was worked out again"), Rig->GetRecomputeCount(2), 2);
	TestEqual(TEXT("The flag was not"), Rig->GetRecomputeCount(3), 1);
	TestEqual(TEXT("The pennant was not"), Rig->GetRecomputeCount(4), 1);

	Rig->SetLocalOffset(3, FVector(600.f, 0.f, 0.f));
	Rig->SetLocalOffset(0, FVector(200.f, 0.f, 0.f));
	Rig->SetLocalOffset(1, FVector(0.f, 0.f, 350.f));
	TestEqual(TEXT("After three moves the lantern is at the sum of its chain"), Rig->GetPosition(2), FVector(200.f, 0.f, 450.f));
	TestEqual(TEXT("The pennant follows its moved flag"), Rig->GetPosition(4), FVector(600.f, 0.f, 50.f));
	TestEqual(TEXT("The base was worked out once more, not once for each move"), Rig->GetRecomputeCount(0), 3);
	TestEqual(TEXT("The platform likewise"), Rig->GetRecomputeCount(1), 3);
	TestEqual(TEXT("And the lantern"), Rig->GetRecomputeCount(2), 3);
	TestEqual(TEXT("The flag once more"), Rig->GetRecomputeCount(3), 2);

	return true;
}

#endif
```

# Hints

- The failing test reads a joint after its parent has moved. After your `SetLocalOffset`, which joints are marked as old, and which should be?
- A joint's position is built from its parent's. If the parent's position has changed, what is true of the position kept for the child, and for the child's own children?
- Parents come before children in the list, so one pass forward from the moved joint can mark every joint that hangs from it. Or compare against the parent when a joint is read. Either way, reading the lantern after moving the base and the platform must work each of the three out once.

# Rubric

- A joint's position is its parent's position plus its own offset, and a root's is its offset, however the tower has been moved.
- Positions are kept, and a position is worked out again only when it has to be: reading an untouched tower works each joint out exactly once.
- After any number of moves, every position that is read is the sum of its chain, and no joint is worked out more than once for the moves made since it was last read.
- Setting the offset a joint already has changes nothing and works nothing out.
- A missing joint reads as zero and cannot be moved, and a parent index that is not lower than the joint's own is treated as no parent.
- Every counter goes up by one each time its joint's position is worked out, and by nothing else.

# Alternative

The tower could keep no positions at all and add up the chain on every read. That is the simplest version and costs a short walk of three or four steps per read, which for this tower is nothing. It stops being free when the chain is deep or there are thousands of towers. Another route is to let a read compare a joint's stamp with its parent's, so no move has to walk forward at all; it moves the work from moves to reads.

# Parsons

```yaml
- id: recompute-count
  prompt: Put GetRecomputeCount in order.
  lines:
    - "int32 ADojoP17TowerRig::GetRecomputeCount(int32 Index) const"
    - "{"
    - "	EnsureCaches();"
    - "	return RecomputeCounts.IsValidIndex(Index) ? RecomputeCounts[Index] : 0;"
    - "}"
  distractors:
    - line: "	RecomputeCounts[Index] = 0;"
      mistake: Reading a counter must not reset it; the counter is the record of the work done, and it would also index past the end for a joint that does not exist.
```
