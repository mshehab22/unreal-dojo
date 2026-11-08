---
id: p22-feedback-refactor
title: A turret and a trap that drifted apart
order: 5
kind: refactor
scaffold: stub
difficulty: 4
patterns: [facade]
skills: [facade, refactoring]
terms: [world-subsystem, subsystem-dependency]
prerequisites: [p22-checkpoint-desk, p22-hit-feedback]
xp: 110
estimatedMinutes: 25
concepts:
  - Two callers that each drive the same systems keep two copies of the same rules, and the copies drift
  - Routing both through the hit feedback facade leaves one copy, so a hit feels the same whoever lands it
  - A tuning change, such as the heavy threshold, happens once, on the facade
  - The turret's own job, counting shots, stays in the turret; only the feedback moves
  - After the refactor neither actor includes the sound desk, the spark pool, or the HUD ticker
---

# Brief

After the refactor, a turret's shot and a spike trap's spring of the same damage sound, spark, and show exactly alike, and moving the heavy threshold on the hit feedback facade changes both.

`ADojoP22Turret` and `ADojoP22SpikeTrap` were written before the hit feedback facade existed. Each looks up the sound desk, the spark pool, and the HUD ticker and drives them itself. The turret's copy of the rules happens to match the facade. The trap's copy was written later by someone else: it always plays the light hit cue, always throws 6 sparks, and never flashes, so a 50 damage spring feels like a scratch.

Refactor both actors:

- Each plays its feedback with one call on `UDojoP22HitFeedback`: `PlayHitFeedback` for a hit at the target or victim, `PlayMissFeedback` for the turret's miss.
- Neither includes or calls the sound desk, the spark pool, or the HUD ticker any more.
- Everything else stays: `FireAt`, `FireAndMiss`, and `Spring` keep their names and signatures, a shot or a spring is counted whether or not it hit anything, and the turret's hits look exactly as they do today.

Compiles against earlier quests: p22-hit-feedback (`Quests/p22-hit-feedback/DojoP22HitFeedback.h`, `Quests/p22-hit-feedback/DojoP22SoundDesk.h`, `Quests/p22-hit-feedback/DojoP22SparkPool.h`, `Quests/p22-hit-feedback/DojoP22HudTicker.h`).

Two of the four tests pass on the starter and must pass after; two do not. Read their messages.

## See it in the editor

Place a `DojoP22Turret`, a `DojoP22SpikeTrap`, and a Cube from the Basic shapes as the target; the turret and the trap have no mesh, so find them in the Outliner. With all three selected, right-click in the Level Blueprint graph and choose Create a Reference to Selected Actors. On Begin Play, call Fire At on the turret with the cube and a damage of 50, then Spring on the trap with the cube and 50. Get the Dojo P22 Hud Ticker subsystem and print Get Flash Count: 1 before the refactor, because the trap never flashes, and 2 after. Then, before the two calls, get the Dojo P22 Hit Feedback subsystem and Set Heavy Damage to 60: after the refactor neither hit flashes, and the count is 0.

# Files

## DojoP22Turret.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP22Turret.generated.h"

/** A training turret that shoots at a target and counts its shots. It plays how a shot looks and sounds itself. */
UCLASS()
class ADojoP22Turret : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP22Turret();

	/** A shot that hits Target for Damage: counts it and plays its feedback at the target. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	void FireAt(AActor* Target, float Damage);

	/** A shot that hits nothing, landing at Where: counts it and plays the miss feedback there. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	void FireAndMiss(FVector Where);

	/** Shots fired. */
	UFUNCTION(BlueprintPure, Category = "Turret")
	int32 GetShots() const;

private:
	/** Shots fired. */
	int32 Shots = 0;
};
```

## DojoP22Turret.cpp

```cpp
#include "DojoP22Turret.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/p22-hit-feedback/DojoP22HudTicker.h"
#include "Quests/p22-hit-feedback/DojoP22SoundDesk.h"
#include "Quests/p22-hit-feedback/DojoP22SparkPool.h"

ADojoP22Turret::ADojoP22Turret()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP22Turret::FireAt(AActor* Target, float Damage)
{
	++Shots;
	if (!IsValid(Target) || Damage <= 0.f) return;

	UWorld* World = GetWorld();
	UDojoP22SoundDesk* Sound = World->GetSubsystem<UDojoP22SoundDesk>();
	UDojoP22SparkPool* Sparks = World->GetSubsystem<UDojoP22SparkPool>();
	UDojoP22HudTicker* Hud = World->GetSubsystem<UDojoP22HudTicker>();
	if (!Sound || !Sparks || !Hud) return;

	const FVector Where = Target->GetActorLocation();
	const bool bHeavy = Damage >= 40.f;
	Sound->PlayCue(Sound->FindCue(bHeavy ? FName(TEXT("HeavyHit")) : FName(TEXT("Hit"))), Where);

	const int32 Ticket = Sparks->Reserve(FMath::Clamp(FMath::RoundToInt32(Damage / 5.f), 2, UDojoP22SparkPool::Capacity));
	if (Ticket != INDEX_NONE) Sparks->Fire(Ticket, Where, FVector::UpVector);

	Hud->PushLine(FString::Printf(TEXT("-%d"), FMath::RoundToInt32(Damage)));
	if (bHeavy) Hud->FlashEdge(FLinearColor::Red);
}

void ADojoP22Turret::FireAndMiss(FVector Where)
{
	++Shots;

	if (UDojoP22SoundDesk* Sound = GetWorld()->GetSubsystem<UDojoP22SoundDesk>())
	{
		Sound->PlayCue(Sound->FindCue(TEXT("Miss")), Where);
	}
}

int32 ADojoP22Turret::GetShots() const
{
	return Shots;
}
```

## DojoP22SpikeTrap.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP22SpikeTrap.generated.h"

/**
 * A floor trap that springs on whoever steps on it and counts how often it sprang.
 * It plays how a spring looks and sounds itself.
 */
UCLASS()
class ADojoP22SpikeTrap : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP22SpikeTrap();

	/** Springs on Victim for Damage: counts it and plays its feedback at the victim. */
	UFUNCTION(BlueprintCallable, Category = "Trap")
	void Spring(AActor* Victim, float Damage);

	/** Times the trap sprang. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	int32 GetSprings() const;

private:
	/** Times the trap sprang. */
	int32 Springs = 0;
};
```

## DojoP22SpikeTrap.cpp

```cpp
#include "DojoP22SpikeTrap.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/p22-hit-feedback/DojoP22HudTicker.h"
#include "Quests/p22-hit-feedback/DojoP22SoundDesk.h"
#include "Quests/p22-hit-feedback/DojoP22SparkPool.h"

ADojoP22SpikeTrap::ADojoP22SpikeTrap()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP22SpikeTrap::Spring(AActor* Victim, float Damage)
{
	++Springs;
	if (!IsValid(Victim) || Damage <= 0.f) return;

	UWorld* World = GetWorld();
	UDojoP22SoundDesk* Sound = World->GetSubsystem<UDojoP22SoundDesk>();
	UDojoP22SparkPool* Sparks = World->GetSubsystem<UDojoP22SparkPool>();
	UDojoP22HudTicker* Hud = World->GetSubsystem<UDojoP22HudTicker>();
	if (!Sound || !Sparks || !Hud) return;

	const FVector Where = Victim->GetActorLocation();
	Sound->PlayCue(Sound->FindCue(TEXT("Hit")), Where);

	const int32 Ticket = Sparks->Reserve(6);
	if (Ticket != INDEX_NONE) Sparks->Fire(Ticket, Where, FVector::UpVector);

	Hud->PushLine(FString::Printf(TEXT("-%d"), FMath::RoundToInt32(Damage)));
}

int32 ADojoP22SpikeTrap::GetSprings() const
{
	return Springs;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p22-feedback-refactor/DojoP22SpikeTrap.h"
#include "Quests/p22-feedback-refactor/DojoP22Turret.h"
#include "Quests/p22-hit-feedback/DojoP22HitFeedback.h"
#include "Quests/p22-hit-feedback/DojoP22HudTicker.h"
#include "Quests/p22-hit-feedback/DojoP22SoundDesk.h"
#include "Quests/p22-hit-feedback/DojoP22SparkPool.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoP22FeedbackRefactorTest
{
	/** The cue names played in the world, oldest first. */
	TArray<FName> CuesOf(UWorld* World)
	{
		TArray<FName> Cues;
		for (const FDojoP22PlayedCue& Played : World->GetSubsystem<UDojoP22SoundDesk>()->GetPlayed()) Cues.Add(Played.Cue);
		return Cues;
	}

	/** The spark counts of every burst in the world, oldest first. */
	TArray<int32> SparksOf(UWorld* World)
	{
		TArray<int32> Counts;
		for (const FDojoP22SparkBurst& Burst : World->GetSubsystem<UDojoP22SparkPool>()->GetBursts()) Counts.Add(Burst.Count);
		return Counts;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_FeedbackRefactor_TurretFeelsAsBefore, "Dojo.P22.FeedbackRefactor.TurretFeelsAsBefore", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A turret's 25 and 50 damage shots sound, spark, and show exactly as they always did, and are counted. */
bool FDojo_P22_FeedbackRefactor_TurretFeelsAsBefore::RunTest(const FString& Parameters)
{
	using namespace DojoP22FeedbackRefactorTest;

	FDojoTestWorld TestWorld;
	UWorld* World = TestWorld.GetWorld();
	ADojoP22Turret* Turret = TestWorld.SpawnActor<ADojoP22Turret>();
	ADojoTestActor* Target = World->SpawnActor<ADojoTestActor>(FVector(300.0, 0.0, 0.0), FRotator::ZeroRotator);
	if (!TestNotNull(TEXT("Turret spawned"), Turret) || !TestNotNull(TEXT("Target spawned"), Target)) return false;

	Turret->FireAt(Target, 25.f);
	Turret->FireAt(Target, 50.f);

	TestEqual(TEXT("Two shots counted"), Turret->GetShots(), 2);
	TestTrue(TEXT("A light hit, then a heavy hit"), CuesOf(World) == TArray<FName>({ TEXT("Hit"), TEXT("HeavyHit") }));
	TestTrue(TEXT("5 sparks, then 10"), SparksOf(World) == TArray<int32>({ 5, 10 }));
	TestTrue(TEXT("The ticker shows both"), World->GetSubsystem<UDojoP22HudTicker>()->GetLines() == TArray<FString>({ TEXT("-25"), TEXT("-50") }));
	TestEqual(TEXT("Only the heavy hit flashed"), World->GetSubsystem<UDojoP22HudTicker>()->GetFlashCount(), 1);
	const TArray<FDojoP22SparkBurst> Bursts = World->GetSubsystem<UDojoP22SparkPool>()->GetBursts();
	if (TestTrue(TEXT("The first shot threw a burst"), Bursts.Num() >= 1))
	{
		TestTrue(TEXT("The sparks flew at the target"), Bursts[0].Where.Equals(FVector(300.0, 0.0, 0.0), 0.01));
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_FeedbackRefactor_MissStaysQuiet, "Dojo.P22.FeedbackRefactor.MissStaysQuiet", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A turret's miss plays only the miss cue and still counts as a shot. */
bool FDojo_P22_FeedbackRefactor_MissStaysQuiet::RunTest(const FString& Parameters)
{
	using namespace DojoP22FeedbackRefactorTest;

	FDojoTestWorld TestWorld;
	UWorld* World = TestWorld.GetWorld();
	ADojoP22Turret* Turret = TestWorld.SpawnActor<ADojoP22Turret>();
	if (!TestNotNull(TEXT("Turret spawned"), Turret)) return false;

	Turret->FireAndMiss(FVector(0.0, 400.0, 0.0));

	TestEqual(TEXT("One shot counted"), Turret->GetShots(), 1);
	TestTrue(TEXT("Only the miss cue"), CuesOf(World) == TArray<FName>({ TEXT("Miss") }));
	TestEqual(TEXT("No sparks"), SparksOf(World).Num(), 0);
	TestEqual(TEXT("No line"), World->GetSubsystem<UDojoP22HudTicker>()->GetPushedCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_FeedbackRefactor_TrapFeelsLikeTheTurret, "Dojo.P22.FeedbackRefactor.TrapFeelsLikeTheTurret", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A spike trap's 50 and 10 damage springs sound, spark, and show exactly like a turret's shots of the same damage. */
bool FDojo_P22_FeedbackRefactor_TrapFeelsLikeTheTurret::RunTest(const FString& Parameters)
{
	using namespace DojoP22FeedbackRefactorTest;

	FDojoTestWorld TestWorld;
	UWorld* World = TestWorld.GetWorld();
	ADojoP22SpikeTrap* Trap = TestWorld.SpawnActor<ADojoP22SpikeTrap>();
	ADojoTestActor* Victim = World->SpawnActor<ADojoTestActor>(FVector(0.0, -200.0, 0.0), FRotator::ZeroRotator);
	if (!TestNotNull(TEXT("Trap spawned"), Trap) || !TestNotNull(TEXT("Victim spawned"), Victim)) return false;

	Trap->Spring(Victim, 50.f);
	Trap->Spring(Victim, 10.f);

	TestEqual(TEXT("Two springs counted"), Trap->GetSprings(), 2);
	TestTrue(TEXT("A heavy hit, then a light hit, as a turret's would be"), CuesOf(World) == TArray<FName>({ TEXT("HeavyHit"), TEXT("Hit") }));
	TestTrue(TEXT("10 sparks, then 2, as a turret's would be"), SparksOf(World) == TArray<int32>({ 10, 2 }));
	TestTrue(TEXT("The ticker shows both as a turret's would"), World->GetSubsystem<UDojoP22HudTicker>()->GetLines() == TArray<FString>({ TEXT("-50"), TEXT("-10") }));
	TestEqual(TEXT("The heavy spring flashed the edge"), World->GetSubsystem<UDojoP22HudTicker>()->GetFlashCount(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_FeedbackRefactor_OneSettingChangesBoth, "Dojo.P22.FeedbackRefactor.OneSettingChangesBoth", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moving the facade's heavy threshold to 20 changes how a turret's and a trap's 25 damage hits feel, with no change to either. */
bool FDojo_P22_FeedbackRefactor_OneSettingChangesBoth::RunTest(const FString& Parameters)
{
	using namespace DojoP22FeedbackRefactorTest;

	FDojoTestWorld TestWorld;
	UWorld* World = TestWorld.GetWorld();
	ADojoP22Turret* Turret = TestWorld.SpawnActor<ADojoP22Turret>();
	ADojoP22SpikeTrap* Trap = TestWorld.SpawnActor<ADojoP22SpikeTrap>();
	ADojoTestActor* Target = World->SpawnActor<ADojoTestActor>(FVector(300.0, 0.0, 0.0), FRotator::ZeroRotator);
	if (!TestNotNull(TEXT("Turret spawned"), Turret) || !TestNotNull(TEXT("Trap spawned"), Trap) || !TestNotNull(TEXT("Target spawned"), Target)) return false;

	World->GetSubsystem<UDojoP22HitFeedback>()->SetHeavyDamage(20.f);
	Turret->FireAt(Target, 25.f);
	Trap->Spring(Target, 25.f);

	TestTrue(TEXT("With the facade's threshold at 20, both 25 damage hits are heavy"), CuesOf(World) == TArray<FName>({ TEXT("HeavyHit"), TEXT("HeavyHit") }));
	TestEqual(TEXT("and both flashed the edge"), World->GetSubsystem<UDojoP22HudTicker>()->GetFlashCount(), 2);

	return true;
}

#endif
```

# Hints

- The two failing tests compare the trap with the turret, so look at where each of them gets its numbers today.
- Once the facade does the feedback, what is left in `FireAt` besides counting the shot?
- When the refactor is done, which `#include` lines should be gone from both .cpp files?

# Rubric

- The turret and the trap each play their feedback through UDojoP22HitFeedback, one call per shot, spring, or miss.
- Neither actor includes or calls the sound desk, the spark pool, or the HUD ticker.
- A trap's spring and a turret's shot of the same damage sound, spark, and show alike.
- Changing the facade's heavy threshold changes how both actors' hits feel, with no change to either actor.
- Shots and springs are still counted, hit or miss, and the turret's hits look exactly as before.
- The actors depend on the facade; the facade knows nothing about turrets or traps.

# Alternative

Leaving the turret alone and fixing only the trap's numbers would pass the tests today, and drift again the next time anyone tunes a hit. A shared base class for everything that deals damage, with the feedback in a protected helper, would also keep one copy of the rules, but it ties feedback to an inheritance tree that turrets, traps, swords, and falling rocks do not share; the facade works for any caller with a world. A `UBlueprintFunctionLibrary` with a static `PlayHitFeedback(WorldContextObject, ...)` would keep the call this short too, but it would have to find the three systems again on every hit and would have no natural place to keep a heavy threshold that can change while the game runs.

# Parsons

```yaml
- id: spring-through-facade
  prompt: Put the refactored Spring in order. It counts the spring before anything else.
  lines:
    - "void ADojoP22SpikeTrap::Spring(AActor* Victim, float Damage)"
    - "{"
    - "	++Springs;"
    - "	if (!IsValid(Victim)) return;"
    - "	if (UDojoP22HitFeedback* Feedback = GetWorld()->GetSubsystem<UDojoP22HitFeedback>())"
    - "	{"
    - "		Feedback->PlayHitFeedback(Victim->GetActorLocation(), Damage);"
    - "	}"
    - "}"
  distractors:
    - line: "		GetWorld()->GetSubsystem<UDojoP22SparkPool>()->Reserve(6);"
      mistake: That is the trap driving the spark pool again, and a reservation that is never fired or cancelled holds its sparks for good; after the refactor only the facade talks to the pool.
```
