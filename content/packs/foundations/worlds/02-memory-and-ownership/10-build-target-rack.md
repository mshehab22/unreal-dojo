---
id: f2-target-rack
title: A rack that lends targets instead of spawning them
order: 10
kind: build
scaffold: blank
difficulty: 3
patterns: [object-pool]
skills: [memory, spawning]
terms: [tsubclassof, spawnactor, tobjectptr, destroy, endplay, isvalid]
prerequisites: [f2-spotter, f2-smart-pointers, f1-boss-training-yard, f1-popup-target]
xp: 120
estimatedMinutes: 30
concepts:
  - Spawning once and reusing actors instead of spawning and destroying them
  - The owner of a set of actors is responsible for destroying them
---

# Brief

When you press Play, the rack quietly makes 3 hidden pop-up targets; each `ke * Deploy` shows one more of them, raised and reading Up, and a fourth Deploy shows nothing because the rack never makes more than it owns.

Write `ADojoF2TargetRack` from nothing. It reuses your pop-up target from World 1, in the version your training yard boss extended: it needs `ResetForRound`. At the start of play it spawns `PoolSize` targets of `TargetClass` once, each in its own slot, hidden and with collision off. `Deploy` lends out one resting target: show it, turn its collision on, raise it, and return it. `Recall` takes back a target the rack lent out: hide it, turn collision off, call `ResetForRound` on it so no hits, misses, or raised state carry into its next use, and make it available again; any actor the rack did not lend out is refused. When the rack leaves play, it destroys the targets it owns.

The tests use this public interface, so keep these names:

- `UPROPERTY(EditAnywhere) TSubclassOf<ADojoF1PopupTarget> TargetClass;` defaulting to the C++ pop-up target class.
- `UPROPERTY(EditAnywhere) int32 PoolSize = 3;` clamped at 1 or more.
- `UPROPERTY(EditAnywhere) FVector SlotSpacing = FVector(0.f, 150.f, 0.f);` the gap between the rack and each slot.
- `UFUNCTION(BlueprintCallable) ADojoF1PopupTarget* Deploy();` returning nullptr when every target is out.
- `UFUNCTION(BlueprintCallable) bool Recall(ADojoF1PopupTarget* Target);`
- `UFUNCTION(BlueprintPure) int32 GetAvailableCount() const;` and `int32 GetDeployedCount() const;`

Dependency direction: the rack owns and refers to its targets; the targets know nothing about the rack.

Compiles against earlier quests: f1-popup-target as extended by f1-boss-training-yard (`Quests/f1-popup-target/DojoF1PopupTarget.h`, with `ResetForRound`).

## See it in the editor

Place a `DojoF2TargetRack` and press Play. Nothing shows. Run `ke * Deploy` three times: three targets appear in a row, each reading Up. A fourth Deploy changes nothing. Eject with F8 and look at the Outliner while you deploy: the number of pop-up targets in the level stays at 3 the whole time. Stop play: the rack's EndPlay removes them.

# Files

## DojoF2TargetRack.h

```cpp
// Declare ADojoF2TargetRack here.
```

## DojoF2TargetRack.cpp

```cpp
// Define ADojoF2TargetRack here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "EngineUtils.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f2-target-rack/DojoF2TargetRack.h"
#include "Support/DojoTestWorld.h"

namespace DojoF2TargetRackTest
{
	/** Counts the pop-up targets in play in the world, whoever made them. */
	int32 CountTargets(UWorld* World)
	{
		int32 Count = 0;
		for (TActorIterator<ADojoF1PopupTarget> It(World); It; ++It)
		{
			if (IsValid(*It)) Count++;
		}
		return Count;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_TargetRack_LendsAFixedSet, "Dojo.F2.TargetRack.LendsAFixedSet", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Deploys every target, tries one more, and checks the rack never makes more targets than it owns. */
bool FDojo_F2_TargetRack_LendsAFixedSet::RunTest(const FString& Parameters)
{
	using namespace DojoF2TargetRackTest;

	FDojoTestWorld TestWorld;

	ADojoF2TargetRack* Rack = TestWorld.SpawnActor<ADojoF2TargetRack>();
	if (!TestNotNull(TEXT("Rack spawned"), Rack)) return false;

	TestEqual(TEXT("Pool size defaults to 3"), Rack->PoolSize, 3);
	TestEqual(TEXT("Three targets exist after BeginPlay"), CountTargets(TestWorld.GetWorld()), 3);
	TestEqual(TEXT("All three are available"), Rack->GetAvailableCount(), 3);

	TArray<ADojoF1PopupTarget*> Lent;
	for (int32 Index = 0; Index < 3; ++Index)
	{
		ADojoF1PopupTarget* Target = Rack->Deploy();
		if (!TestNotNull(TEXT("Deploy returns a target while any are resting"), Target)) return false;

		TestFalse(TEXT("A deployed target is visible"), Target->IsHidden());
		TestEqual(TEXT("A deployed target is raised"), Target->GetState(), EDojoF1TargetState::ETS_Raised);
		Lent.Add(Target);
	}

	TestNull(TEXT("A fourth Deploy finds nothing"), Rack->Deploy());
	TestEqual(TEXT("Still exactly three targets in the world"), CountTargets(TestWorld.GetWorld()), 3);
	TestEqual(TEXT("All three are deployed"), Rack->GetDeployedCount(), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_TargetRack_RecallsAndReuses, "Dojo.F2.TargetRack.RecallsAndReuses", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lends out every target, breaks one, recalls it, and checks the same target comes back reset; refuses a stranger. */
bool FDojo_F2_TargetRack_RecallsAndReuses::RunTest(const FString& Parameters)
{
	using namespace DojoF2TargetRackTest;

	FDojoTestWorld TestWorld;

	ADojoF2TargetRack* Rack = TestWorld.SpawnActor<ADojoF2TargetRack>();
	ADojoF1PopupTarget* Stranger = TestWorld.SpawnActor<ADojoF1PopupTarget>();
	if (!TestNotNull(TEXT("Rack spawned"), Rack) || !TestNotNull(TEXT("Stranger spawned"), Stranger)) return false;

	TestFalse(TEXT("The rack refuses a target it never lent out"), Rack->Recall(Stranger));

	ADojoF1PopupTarget* Target = Rack->Deploy();
	Rack->Deploy();
	Rack->Deploy();
	if (!TestNotNull(TEXT("Deployed one"), Target)) return false;

	for (int32 Hit = 0; Hit < Target->HitsToBreak; ++Hit)
	{
		Target->Raise();
		Target->Hit();
	}
	TestEqual(TEXT("Broken before the recall"), Target->GetState(), EDojoF1TargetState::ETS_Broken);

	TestTrue(TEXT("The rack takes back its own target"), Rack->Recall(Target));
	TestTrue(TEXT("A recalled target is hidden"), Target->IsHidden());
	TestEqual(TEXT("A recalled broken target is lowered again"), Target->GetState(), EDojoF1TargetState::ETS_Lowered);
	TestEqual(TEXT("One target resting after the recall"), Rack->GetAvailableCount(), 1);
	TestFalse(TEXT("A target cannot be recalled twice"), Rack->Recall(Target));

	TestTrue(TEXT("The only resting target, the recalled one, is lent out again"), Rack->Deploy() == Target);
	TestEqual(TEXT("It comes back raised"), Target->GetState(), EDojoF1TargetState::ETS_Raised);
	TestEqual(TEXT("Still three rack targets plus the stranger"), CountTargets(TestWorld.GetWorld()), 4);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_TargetRack_RecallForgetsLastUse, "Dojo.F2.TargetRack.RecallForgetsLastUse", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Hits a lent target once, recalls it, lends it again, and checks it needs two fresh hits to break. */
bool FDojo_F2_TargetRack_RecallForgetsLastUse::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF2TargetRack* Rack = TestWorld.SpawnActor<ADojoF2TargetRack>();
	if (!TestNotNull(TEXT("Rack spawned"), Rack)) return false;

	ADojoF1PopupTarget* Target = nullptr;
	for (int32 Index = 0; Index < 3; ++Index) Target = Rack->Deploy();
	if (!TestNotNull(TEXT("Deployed the last one"), Target)) return false;

	TestTrue(TEXT("The first hit counts"), Target->Hit());
	Target->Raise();
	TestTrue(TEXT("The raised target is recalled"), Rack->Recall(Target));
	TestEqual(TEXT("A recalled target rests lowered, not raised"), Target->GetState(), EDojoF1TargetState::ETS_Lowered);

	TestTrue(TEXT("It is the one lent out again"), Rack->Deploy() == Target);
	TestTrue(TEXT("The first hit of its new use counts"), Target->Hit());
	TestEqual(TEXT("One hit no longer breaks it; the old hit was forgotten"), Target->GetState(), EDojoF1TargetState::ETS_Lowered);

	Target->Raise();
	Target->Hit();
	TestEqual(TEXT("The second hit of its new use breaks it"), Target->GetState(), EDojoF1TargetState::ETS_Broken);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_TargetRack_CleansUpOnEndPlay, "Dojo.F2.TargetRack.CleansUpOnEndPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys the rack and checks that the targets it owned leave play with it. */
bool FDojo_F2_TargetRack_CleansUpOnEndPlay::RunTest(const FString& Parameters)
{
	using namespace DojoF2TargetRackTest;

	FDojoTestWorld TestWorld;

	ADojoF2TargetRack* Rack = TestWorld.SpawnActor<ADojoF2TargetRack>();
	if (!TestNotNull(TEXT("Rack spawned"), Rack)) return false;

	Rack->Deploy();
	TestEqual(TEXT("Three targets while the rack is in play"), CountTargets(TestWorld.GetWorld()), 3);

	Rack->Destroy();
	TestEqual(TEXT("No targets left after the rack is destroyed"), CountTargets(TestWorld.GetWorld()), 0);

	return true;
}

#endif
```

# Hints

- Draw two boxes, resting and lent out, and decide what moves a target from one to the other; Deploy, Recall, and the two counts all read from those boxes.
- Spawn the targets in BeginPlay, not the constructor; hiding an actor in game and turning off its collision are two separate actor calls, and EndPlay is where an owner destroys what it made.
- `SetActorHiddenInGame` and `SetActorEnableCollision` are on `AActor` in `GameFramework/Actor.h`; `TArray` has `Pop`, `Contains`, and `Remove`.

# Rubric

- Targets are spawned once in BeginPlay from TargetClass, never in Deploy.
- Deploy and Recall move targets between resting and lent-out sets, and Recall refuses anything the rack did not lend out.
- A resting target is hidden with collision off; a lent target is visible, collidable, and raised; a recalled target is reset with ResetForRound, so nothing from its last use carries over.
- The arrays holding the targets are UPROPERTYs, so the garbage collector sees the rack's references.
- EndPlay destroys every target the rack owns, and calls Super::EndPlay last.
- The rack refers to its targets; the pop-up target is reused as the training yard boss extended it, with no further changes.

# Alternative

You just built an object pool: a fixed set of objects made once, lent out, and taken back instead of being created and destroyed. That is the Object Pool pattern, and Pack 2 gives it a full world. The tradeoff is ownership: the rack must reset every field a used target could have changed, and a field it forgets leaks from one use into the next. When spawning is cheap and rare, as with a handful of targets in a level, plain SpawnActor and Destroy are simpler and safer; the pool pays off when many short-lived actors appear every second, such as projectiles or impact effects.
