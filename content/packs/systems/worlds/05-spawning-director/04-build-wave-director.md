---
id: s5-wave-director
title: A director that paces waves with a live limit and rests
order: 4
kind: build
scaffold: stub
difficulty: 4
patterns: [state, observer]
skills: [timers, delegates, state]
terms: [uenum, timer-manager, timer-handle, dynamic-multicast-delegate, adddynamic, broadcast]
prerequisites: [s5-pool, s5-wave-plan]
xp: 100
estimatedMinutes: 35
concepts:
  - One current state decides what a timer, a swat, and a start request do
  - A live limit and a count still to come, both kept from events
  - Every announcement goes out after the director holds its new state
---

# Brief

When a night of two waves of 3 beetles starts, beetles come out one per second from hatches the viewer is not facing, never more than the live limit at once; when a wave is cleared the director rests for 2 seconds and then starts the next; after the last wave it is done; and a listener hears `start`, `clear`, and `rest` in that order, each after the director already holds its new state.

Compiles against earlier quests: s5-pool (`Quests/s5-pool/DojoS5Beetle.h`, `Quests/s5-pool/DojoS5PoolComponent.h`) and s5-wave-plan (`Quests/s5-wave-plan/DojoS5Hatch.h`, `Quests/s5-wave-plan/DojoS5WavePlan.h`).

The class declaration is given, and so is a ready-made listener, `UDojoS5DirectorSpy`, that writes down each announcement with the state the director was in when it arrived. Every function body in `DojoS5WaveDirector.cpp` is yours:

- `Setup` keeps the plan, the pool, the viewer, and the hatches (skipping null ones), in the order given.
- `StartNight` starts wave 1 and returns true, but only when the director is idle or done and has a plan and a pool; otherwise it returns false and changes nothing.
- `StartWave` sets the wave number, the state, and how many beetles are still to come (from the plan), broadcasts `OnWaveStarted`, starts a looping spawn timer at the plan's interval, and makes the first spawn attempt at once.
- `TrySpawn` sends one beetle if any are still to come and fewer than the plan's `MaxAlive` are loose: it takes the next hatch from `PickHatch`, wakes a beetle from the pool at that hatch, and listens to the beetle's `OnDefeated`. When no hatch is hidden or the pool has nothing, it waits for the next attempt. When the last beetle of the wave has come out, the spawn timer stops.
- `PickHatch` tries the hatches in turn, starting after the one used last, and returns the first that `IsOutOfSight` for the viewer, or null.
- `HandleBeetleDefeated` gives the beetle back to the pool and counts it. A wave is cleared when its last beetle is swatted: after the final wave the director is done; after any other it rests for the plan's `RestSeconds`, then `EndRest` starts the next wave.
- `StopNight` stops both timers, puts every beetle back to sleep, and returns to idle at wave 0. `EndPlay` stops the timers.

`OnWaveCleared` comes before `OnRestStarted`, and the final wave sends no rest. Dependency direction: the director points at the plan, the pool, the hatches, and the viewer; none of them points back, and the director knows nothing about who listens.

Write it the obvious way first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

This is the third piece of the Beetle Pit boss.

## See it in the editor

Place a `DojoS5WaveDirector`, a `BP_Burrow` with a pool, and four `DojoS5Hatch` actors 8 meters from the Player Start. In the level Blueprint, on BeginPlay call Setup with `DA_Night`, the pool, the player pawn, and the four hatches, bind custom events to On Wave Started, On Wave Cleared, and On Rest Started that print their values, and call Start Night. On the 1 key, get the pool's Get Awake Beetles and call Defeat on the first one. Press Play and watch beetles appear behind you. Swat one the moment it appears, before the next has come out, and look at what is printed.

# Files

## DojoS5WaveDirector.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS5WaveDirector.generated.h"

class ADojoS5Beetle;
class ADojoS5Hatch;
class UDojoS5PoolComponent;
class UDojoS5WavePlan;

/** What the director is doing right now; exactly one at a time. */
UENUM(BlueprintType)
enum class EDojoS5DirectorState : uint8
{
	EDS_Idle UMETA(DisplayName = "Idle"),
	EDS_Wave UMETA(DisplayName = "Wave"),
	EDS_Rest UMETA(DisplayName = "Rest"),
	EDS_Done UMETA(DisplayName = "Done")
};

/** Broadcast when a wave begins, with its number and how many beetles it will send. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS5OnWaveStarted, int32, Wave, int32, BeetleCount);

/** Broadcast when the last beetle of a wave has been swatted. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS5OnWaveCleared, int32, Wave);

/** Broadcast when a rest begins, with the wave that follows it and how long it lasts. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS5OnRestStarted, int32, NextWave, float, Seconds);

/** Paces a night in the pit: sends each wave's beetles out of hatches nobody watches, keeps a live limit, rests between waves, and announces every change; it knows nothing about who listens. */
UCLASS()
class ADojoS5WaveDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the director runs on timers. */
	ADojoS5WaveDirector();

	/** Fires after a wave has begun, before its first beetle comes out. */
	UPROPERTY(BlueprintAssignable, Category = "Director")
	FDojoS5OnWaveStarted OnWaveStarted;

	/** Fires after a wave is cleared, once the director has moved on to its rest or to the end of the night. */
	UPROPERTY(BlueprintAssignable, Category = "Director")
	FDojoS5OnWaveCleared OnWaveCleared;

	/** Fires after a rest has begun. */
	UPROPERTY(BlueprintAssignable, Category = "Director")
	FDojoS5OnRestStarted OnRestStarted;

	/** Chooses the plan, the pool beetles come from, the viewer to hide spawns from, and the hatches, in the order they are tried. */
	UFUNCTION(BlueprintCallable, Category = "Director")
	void Setup(UDojoS5WavePlan* NewPlan, UDojoS5PoolComponent* NewPool, AActor* NewViewer, const TArray<ADojoS5Hatch*>& NewHatches);

	/** Starts wave 1 when the director is idle or done and has a plan and a pool; returns whether it started. */
	UFUNCTION(BlueprintCallable, Category = "Director")
	bool StartNight();

	/** Stops everything, puts every beetle back to sleep, and goes back to idle. */
	UFUNCTION(BlueprintCallable, Category = "Director")
	void StopNight();

	/** What the director is doing right now. */
	UFUNCTION(BlueprintPure, Category = "Director")
	EDojoS5DirectorState GetState() const;

	/** The wave running or just finished; 0 before the first. */
	UFUNCTION(BlueprintPure, Category = "Director")
	int32 GetWave() const;

	/** How many beetles of this wave are loose right now. */
	UFUNCTION(BlueprintPure, Category = "Director")
	int32 GetAlive() const;

	/** How many beetles of this wave have not come out yet. */
	UFUNCTION(BlueprintPure, Category = "Director")
	int32 GetLeftToSpawn() const;

protected:
	/** Stops the timers when the director leaves play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Begins a wave: sets its numbers, announces it, starts the spawn timer, and sends the first beetle at once. */
	void StartWave(int32 NewWave);

	/** One spawn attempt: sends a beetle out of a hidden hatch if any are left and the live limit allows. */
	void TrySpawn();

	/** The rest is over, so the next wave begins. */
	void EndRest();

	/** A beetle of this wave was swatted: it goes back to the pool, and the wave may be cleared. */
	UFUNCTION()
	void HandleBeetleDefeated(ADojoS5Beetle* Beetle);

	/** The next hatch, in turn after the last one used, that is out of the viewer's sight; null when every hatch is watched. */
	ADojoS5Hatch* PickHatch();

	UPROPERTY()
	TObjectPtr<UDojoS5WavePlan> Plan;

	UPROPERTY()
	TObjectPtr<UDojoS5PoolComponent> Pool;

	UPROPERTY()
	TObjectPtr<AActor> Viewer;

	UPROPERTY()
	TArray<TObjectPtr<ADojoS5Hatch>> Hatches;

	EDojoS5DirectorState State = EDojoS5DirectorState::EDS_Idle;
	int32 Wave = 0;
	int32 Alive = 0;
	int32 LeftToSpawn = 0;
	int32 NextHatch = 0;
	FTimerHandle SpawnTimer;
	FTimerHandle RestTimer;
};
```

## DojoS5WaveDirector.cpp

```cpp
#include "DojoS5WaveDirector.h"

#include "Engine/World.h"
#include "Quests/s5-pool/DojoS5Beetle.h"
#include "Quests/s5-pool/DojoS5PoolComponent.h"
#include "Quests/s5-wave-plan/DojoS5Hatch.h"
#include "Quests/s5-wave-plan/DojoS5WavePlan.h"
#include "TimerManager.h"

/** Turns ticking off; the director runs on timers. */
ADojoS5WaveDirector::ADojoS5WaveDirector()
{
}

/** Chooses the plan, the pool, the viewer, and the hatches. */
void ADojoS5WaveDirector::Setup(UDojoS5WavePlan* NewPlan, UDojoS5PoolComponent* NewPool, AActor* NewViewer, const TArray<ADojoS5Hatch*>& NewHatches)
{
}

/** Starts wave 1 when the director is idle or done and has a plan and a pool. */
bool ADojoS5WaveDirector::StartNight()
{
	return false;
}

/** Stops everything, puts every beetle back to sleep, and goes back to idle. */
void ADojoS5WaveDirector::StopNight()
{
}

/** What the director is doing right now. */
EDojoS5DirectorState ADojoS5WaveDirector::GetState() const
{
	return EDojoS5DirectorState::EDS_Idle;
}

/** The wave running or just finished. */
int32 ADojoS5WaveDirector::GetWave() const
{
	return 0;
}

/** How many beetles of this wave are loose right now. */
int32 ADojoS5WaveDirector::GetAlive() const
{
	return 0;
}

/** How many beetles of this wave have not come out yet. */
int32 ADojoS5WaveDirector::GetLeftToSpawn() const
{
	return 0;
}

/** Stops the timers when the director leaves play. */
void ADojoS5WaveDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);
}

/** Begins a wave: sets its numbers, announces it, starts the spawn timer, and sends the first beetle at once. */
void ADojoS5WaveDirector::StartWave(int32 NewWave)
{
}

/** One spawn attempt: sends a beetle out of a hidden hatch if any are left and the live limit allows. */
void ADojoS5WaveDirector::TrySpawn()
{
}

/** The rest is over, so the next wave begins. */
void ADojoS5WaveDirector::EndRest()
{
}

/** A beetle of this wave was swatted: it goes back to the pool, and the wave may be cleared. */
void ADojoS5WaveDirector::HandleBeetleDefeated(ADojoS5Beetle* Beetle)
{
}

/** The next hatch, in turn after the last one used, that is out of the viewer's sight. */
ADojoS5Hatch* ADojoS5WaveDirector::PickHatch()
{
	return nullptr;
}
```

## DojoS5DirectorSpy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS5WaveDirector.h"
#include "DojoS5DirectorSpy.generated.h"

/** A listener that writes down every announcement a director makes, with the state the director was in when it arrived; it only subscribes. */
UCLASS()
class UDojoS5DirectorSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the director's three events, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Director Spy")
	void Watch(ADojoS5WaveDirector* Director);

	/** Every announcement so far, oldest first, such as "start 1 3 Wave", "clear 1 Rest", or "rest 2 3.0 Rest". */
	UPROPERTY(BlueprintReadOnly, Category = "Director Spy")
	TArray<FString> Heard;

private:
	/** Writes down a wave start. */
	UFUNCTION()
	void HandleWaveStarted(int32 Wave, int32 BeetleCount);

	/** Writes down a cleared wave. */
	UFUNCTION()
	void HandleWaveCleared(int32 Wave);

	/** Writes down a rest. */
	UFUNCTION()
	void HandleRestStarted(int32 NextWave, float Seconds);

	/** The watched director's state as a word. */
	FString StateWord() const;

	UPROPERTY()
	TObjectPtr<ADojoS5WaveDirector> Watched;
};
```

## DojoS5DirectorSpy.cpp

```cpp
#include "DojoS5DirectorSpy.h"

void UDojoS5DirectorSpy::Watch(ADojoS5WaveDirector* Director)
{
	Watched = Director;

	if (Director == nullptr)
	{
		return;
	}

	Director->OnWaveStarted.AddUniqueDynamic(this, &UDojoS5DirectorSpy::HandleWaveStarted);
	Director->OnWaveCleared.AddUniqueDynamic(this, &UDojoS5DirectorSpy::HandleWaveCleared);
	Director->OnRestStarted.AddUniqueDynamic(this, &UDojoS5DirectorSpy::HandleRestStarted);
}

void UDojoS5DirectorSpy::HandleWaveStarted(int32 Wave, int32 BeetleCount)
{
	Heard.Add(FString::Printf(TEXT("start %d %d %s"), Wave, BeetleCount, *StateWord()));
}

void UDojoS5DirectorSpy::HandleWaveCleared(int32 Wave)
{
	Heard.Add(FString::Printf(TEXT("clear %d %s"), Wave, *StateWord()));
}

void UDojoS5DirectorSpy::HandleRestStarted(int32 NextWave, float Seconds)
{
	Heard.Add(FString::Printf(TEXT("rest %d %.1f %s"), NextWave, Seconds, *StateWord()));
}

FString UDojoS5DirectorSpy::StateWord() const
{
	if (Watched == nullptr)
	{
		return TEXT("?");
	}

	switch (Watched->GetState())
	{
	case EDojoS5DirectorState::EDS_Idle:
		return TEXT("Idle");
	case EDojoS5DirectorState::EDS_Wave:
		return TEXT("Wave");
	case EDojoS5DirectorState::EDS_Rest:
		return TEXT("Rest");
	case EDojoS5DirectorState::EDS_Done:
		return TEXT("Done");
	default:
		return TEXT("?");
	}
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s5-pool/DojoS5Beetle.h"
#include "Quests/s5-pool/DojoS5PoolComponent.h"
#include "Quests/s5-wave-director/DojoS5DirectorSpy.h"
#include "Quests/s5-wave-director/DojoS5WaveDirector.h"
#include "Quests/s5-wave-plan/DojoS5Hatch.h"
#include "Quests/s5-wave-plan/DojoS5WavePlan.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS5DirectorTest
{
	/** Everything one night needs: a viewer at the origin facing along X, a pool, hatches, a plan, a director, and a spy on it. */
	struct FPit
	{
		ADojoTestActor* Viewer = nullptr;
		UDojoS5PoolComponent* Pool = nullptr;
		UDojoS5WavePlan* Plan = nullptr;
		ADojoS5WaveDirector* Director = nullptr;
		UDojoS5DirectorSpy* Spy = nullptr;
		TArray<ADojoS5Hatch*> Hatches;
	};

	/** Builds a pit with hatches at the given spots, a flat plan of BaseCount beetles per wave, one spawn a second, and 2 seconds of rest. */
	FPit MakePit(FDojoTestWorld& TestWorld, const TArray<FVector>& HatchSpots, int32 BaseCount, int32 MaxAlive, int32 FinalWave)
	{
		FPit Pit;
		Pit.Viewer = TestWorld.SpawnActor<ADojoTestActor>();

		ADojoTestActor* Burrow = TestWorld.SpawnActor<ADojoTestActor>();
		Pit.Pool = TestWorld.AddComponent<UDojoS5PoolComponent>(Burrow);
		if (Pit.Pool != nullptr)
		{
			Pit.Pool->MaxSize = 4;
		}

		for (const FVector& Spot : HatchSpots)
		{
			ADojoS5Hatch* Hatch = TestWorld.SpawnActor<ADojoS5Hatch>();
			if (Hatch != nullptr)
			{
				Hatch->SetActorLocation(Spot);
				Pit.Hatches.Add(Hatch);
			}
		}

		Pit.Plan = NewObject<UDojoS5WavePlan>();
		Pit.Plan->BaseCount = BaseCount;
		Pit.Plan->MaxAlive = MaxAlive;
		Pit.Plan->FinalWave = FinalWave;
		Pit.Plan->SpawnInterval = 1.f;
		Pit.Plan->RestSeconds = 2.f;

		Pit.Director = TestWorld.SpawnActor<ADojoS5WaveDirector>();
		Pit.Spy = NewObject<UDojoS5DirectorSpy>();
		if (Pit.Director != nullptr)
		{
			Pit.Director->Setup(Pit.Plan, Pit.Pool, Pit.Viewer, Pit.Hatches);
			Pit.Spy->Watch(Pit.Director);
		}

		return Pit;
	}

	/** Lets this many seconds of game time pass at 60 frames a second. */
	void Wait(FDojoTestWorld& TestWorld, float Seconds)
	{
		TestWorld.Tick(FMath::CeilToInt(Seconds * 60.f));
	}

	/** Swats every beetle that is loose right now. */
	void SwatAll(UDojoS5PoolComponent* Pool)
	{
		for (ADojoS5Beetle* Beetle : Pool->GetAwakeBeetles())
		{
			Beetle->Defeat();
		}
	}

	/** The pool's awake beetle at a spot, or null. */
	ADojoS5Beetle* BeetleAt(UDojoS5PoolComponent* Pool, const FVector& Spot)
	{
		for (ADojoS5Beetle* Beetle : Pool->GetAwakeBeetles())
		{
			if (Beetle->GetActorLocation().Equals(Spot, 1.f))
			{
				return Beetle;
			}
		}
		return nullptr;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_WaveDirector_FirstWave, "Dojo.S5.WaveDirector.FirstWave", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Starts a night and checks the first spawns: hidden hatches in turn, one per second, a live limit of 2, and a swatted beetle reused. */
bool FDojo_S5_WaveDirector_FirstWave::RunTest(const FString& Parameters)
{
	using namespace DojoS5DirectorTest;

	FDojoTestWorld TestWorld;
	const FVector Ahead(800.f, 0.f, 0.f);
	const FVector Left(0.f, 800.f, 0.f);
	const FVector Behind(-800.f, 0.f, 0.f);
	const FVector Right(0.f, -800.f, 0.f);
	FPit Pit = MakePit(TestWorld, { Ahead, Left, Behind, Right }, 3, 2, 2);
	if (!TestNotNull(TEXT("Director spawned"), Pit.Director) || !TestNotNull(TEXT("Pool added"), Pit.Pool)) return false;

	TestTrue(TEXT("An idle director with a plan and a pool starts"), Pit.Director->StartNight());
	TestTrue(TEXT("It is running a wave"), Pit.Director->GetState() == EDojoS5DirectorState::EDS_Wave);
	TestEqual(TEXT("Wave 1"), Pit.Director->GetWave(), 1);
	TestEqual(TEXT("One announcement"), Pit.Spy->Heard.Num(), 1);
	TestEqual(TEXT("Wave 1 of 3 beetles was announced while the wave ran"), Pit.Spy->Heard.Num() > 0 ? Pit.Spy->Heard[0] : FString(), FString(TEXT("start 1 3 Wave")));

	TestEqual(TEXT("The first beetle came out at once"), Pit.Director->GetAlive(), 1);
	TestEqual(TEXT("Two still to come"), Pit.Director->GetLeftToSpawn(), 2);
	TestNotNull(TEXT("It skipped the hatch ahead and used the next one"), BeetleAt(Pit.Pool, Left));
	ADojoS5Beetle* First = BeetleAt(Pit.Pool, Left);

	Wait(TestWorld, 1.1f);
	TestEqual(TEXT("A second beetle after one second"), Pit.Director->GetAlive(), 2);
	TestEqual(TEXT("One still to come"), Pit.Director->GetLeftToSpawn(), 1);
	TestNotNull(TEXT("From the next hidden hatch in turn"), BeetleAt(Pit.Pool, Behind));

	Wait(TestWorld, 1.f);
	TestEqual(TEXT("The live limit of 2 holds the third beetle back"), Pit.Director->GetAlive(), 2);
	TestEqual(TEXT("It is still to come"), Pit.Director->GetLeftToSpawn(), 1);

	TestFalse(TEXT("A running night cannot start again"), Pit.Director->StartNight());
	TestEqual(TEXT("A refused start announces nothing"), Pit.Spy->Heard.Num(), 1);

	if (!TestNotNull(TEXT("The first beetle is loose"), First)) return false;
	First->Defeat();
	TestFalse(TEXT("A swatted beetle goes back to the pool"), First->IsAwake());
	TestEqual(TEXT("One loose after the swat"), Pit.Director->GetAlive(), 1);
	TestTrue(TEXT("The wave goes on"), Pit.Director->GetState() == EDojoS5DirectorState::EDS_Wave);

	Wait(TestWorld, 1.f);
	TestEqual(TEXT("The third beetle came out once there was room"), Pit.Director->GetAlive(), 2);
	TestEqual(TEXT("None still to come"), Pit.Director->GetLeftToSpawn(), 0);
	TestTrue(TEXT("From the next hidden hatch, the swatted beetle woken again"), BeetleAt(Pit.Pool, Right) == First);
	TestEqual(TEXT("Three beetles came out of only two actors"), Pit.Pool->GetCreatedCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_WaveDirector_Pacing, "Dojo.S5.WaveDirector.Pacing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a whole night of two waves with a quick player, then starts another. */
bool FDojo_S5_WaveDirector_Pacing::RunTest(const FString& Parameters)
{
	using namespace DojoS5DirectorTest;

	FDojoTestWorld TestWorld;
	FPit Pit = MakePit(TestWorld, { FVector(0.f, 800.f, 0.f), FVector(-800.f, 0.f, 0.f) }, 3, 3, 2);
	if (!TestNotNull(TEXT("Director spawned"), Pit.Director) || !TestNotNull(TEXT("Pool added"), Pit.Pool)) return false;

	Pit.Director->StartNight();
	TestEqual(TEXT("The first beetle came out"), Pit.Director->GetAlive(), 1);

	SwatAll(Pit.Pool);
	TestEqual(TEXT("Nothing is loose after a quick swat"), Pit.Director->GetAlive(), 0);
	TestEqual(TEXT("Two beetles of wave 1 are still to come"), Pit.Director->GetLeftToSpawn(), 2);
	TestTrue(TEXT("Wave 1 is still running"), Pit.Director->GetState() == EDojoS5DirectorState::EDS_Wave);
	TestEqual(TEXT("Only the start was announced"), Pit.Spy->Heard.Num(), 1);

	Wait(TestWorld, 1.1f);
	Wait(TestWorld, 1.f);
	TestEqual(TEXT("The other two came out"), Pit.Director->GetAlive(), 2);
	TestEqual(TEXT("None still to come"), Pit.Director->GetLeftToSpawn(), 0);

	SwatAll(Pit.Pool);
	TestEqual(TEXT("Nothing loose"), Pit.Director->GetAlive(), 0);
	TestTrue(TEXT("The director rests"), Pit.Director->GetState() == EDojoS5DirectorState::EDS_Rest);
	TestEqual(TEXT("Start, clear, and rest were announced"), Pit.Spy->Heard.Num(), 3);
	if (Pit.Spy->Heard.Num() >= 3)
	{
		TestEqual(TEXT("The clear came while resting"), Pit.Spy->Heard[1], FString(TEXT("clear 1 Rest")));
		TestEqual(TEXT("The rest names wave 2 and 2 seconds"), Pit.Spy->Heard[2], FString(TEXT("rest 2 2.0 Rest")));
	}

	Wait(TestWorld, 1.f);
	TestTrue(TEXT("Still resting after one second"), Pit.Director->GetState() == EDojoS5DirectorState::EDS_Rest);
	TestEqual(TEXT("Nothing comes out during the rest"), Pit.Pool->GetAwakeCount(), 0);

	Wait(TestWorld, 1.2f);
	TestEqual(TEXT("Wave 2 began after the rest"), Pit.Director->GetWave(), 2);
	TestEqual(TEXT("Its start was announced"), Pit.Spy->Heard.Num() > 3 ? Pit.Spy->Heard[3] : FString(), FString(TEXT("start 2 3 Wave")));
	TestEqual(TEXT("Its first beetle came out at once"), Pit.Director->GetAlive(), 1);

	SwatAll(Pit.Pool);
	TestEqual(TEXT("A woken beetle is counted once when swatted again"), Pit.Director->GetAlive(), 0);
	TestTrue(TEXT("Wave 2 is still running"), Pit.Director->GetState() == EDojoS5DirectorState::EDS_Wave);

	Wait(TestWorld, 1.1f);
	Wait(TestWorld, 1.f);
	TestEqual(TEXT("The rest of wave 2 came out"), Pit.Director->GetAlive(), 2);

	SwatAll(Pit.Pool);
	TestTrue(TEXT("After the final wave the director is done"), Pit.Director->GetState() == EDojoS5DirectorState::EDS_Done);
	TestEqual(TEXT("The final wave sends no rest"), Pit.Spy->Heard.Num(), 5);
	TestEqual(TEXT("Its clear came once the night was over"), Pit.Spy->Heard.Num() > 4 ? Pit.Spy->Heard[4] : FString(), FString(TEXT("clear 2 Done")));

	Wait(TestWorld, 3.f);
	TestEqual(TEXT("Nothing more happens after the night"), Pit.Spy->Heard.Num(), 5);
	TestEqual(TEXT("No beetle comes out after the night"), Pit.Pool->GetAwakeCount(), 0);
	TestEqual(TEXT("Six beetles came out of only two actors"), Pit.Pool->GetCreatedCount(), 2);

	TestTrue(TEXT("A finished night can start again"), Pit.Director->StartNight());
	TestEqual(TEXT("From wave 1"), Pit.Spy->Heard.Num() > 5 ? Pit.Spy->Heard[5] : FString(), FString(TEXT("start 1 3 Wave")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_WaveDirector_SightlinesAndStop, "Dojo.S5.WaveDirector.SightlinesAndStop", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Holds spawns while every hatch is watched, releases them when the viewer turns, then stops the night and starts it again. */
bool FDojo_S5_WaveDirector_SightlinesAndStop::RunTest(const FString& Parameters)
{
	using namespace DojoS5DirectorTest;

	FDojoTestWorld TestWorld;

	ADojoS5WaveDirector* Unready = TestWorld.SpawnActor<ADojoS5WaveDirector>();
	if (!TestNotNull(TEXT("Second director spawned"), Unready)) return false;
	TestFalse(TEXT("A director without a plan and a pool does not start"), Unready->StartNight());
	TestTrue(TEXT("It stays idle"), Unready->GetState() == EDojoS5DirectorState::EDS_Idle);

	const FVector Ahead(800.f, 0.f, 0.f);
	FPit Pit = MakePit(TestWorld, { Ahead, FVector(-300.f, 0.f, 0.f) }, 2, 3, 2);
	if (!TestNotNull(TEXT("Director spawned"), Pit.Director) || !TestNotNull(TEXT("Pool added"), Pit.Pool)) return false;

	TestTrue(TEXT("The night starts"), Pit.Director->StartNight());
	TestEqual(TEXT("A watched hatch and a close hatch send nothing"), Pit.Director->GetAlive(), 0);
	TestEqual(TEXT("Both beetles are still to come"), Pit.Director->GetLeftToSpawn(), 2);

	Wait(TestWorld, 1.1f);
	TestEqual(TEXT("Still nothing while the viewer watches"), Pit.Director->GetAlive(), 0);

	Pit.Viewer->SetActorRotation(FRotator(0.f, 180.f, 0.f));
	Wait(TestWorld, 1.f);
	TestEqual(TEXT("Once the viewer turns away, a beetle comes out"), Pit.Director->GetAlive(), 1);
	TestNotNull(TEXT("Out of the hatch behind the viewer now"), BeetleAt(Pit.Pool, Ahead));

	Pit.Director->StopNight();
	TestTrue(TEXT("Stopping goes back to idle"), Pit.Director->GetState() == EDojoS5DirectorState::EDS_Idle);
	TestEqual(TEXT("At wave 0"), Pit.Director->GetWave(), 0);
	TestEqual(TEXT("With nothing loose"), Pit.Director->GetAlive(), 0);
	TestEqual(TEXT("And nothing still to come"), Pit.Director->GetLeftToSpawn(), 0);
	TestEqual(TEXT("Every beetle went back to sleep"), Pit.Pool->GetAwakeCount(), 0);

	Wait(TestWorld, 3.f);
	TestEqual(TEXT("A stopped night sends nothing"), Pit.Pool->GetAwakeCount(), 0);
	TestEqual(TEXT("And announces nothing"), Pit.Spy->Heard.Num(), 1);

	TestTrue(TEXT("A stopped night starts again"), Pit.Director->StartNight());
	TestEqual(TEXT("From wave 1"), Pit.Director->GetWave(), 1);
	TestEqual(TEXT("With a beetle out at once"), Pit.Director->GetAlive(), 1);
	TestEqual(TEXT("Woken from the pool, not spawned"), Pit.Pool->GetCreatedCount(), 1);

	Pit.Director->Destroy();
	Wait(TestWorld, 2.f);
	TestEqual(TEXT("A removed director sends nothing more"), Pit.Pool->GetAwakeCount(), 1);

	return true;
}

#endif
```

# Hints

- Run the first failing test and read its message: it names a moment when the director moved on while the wave was not really over.
- A swat can leave nothing loose in two different situations: every beetle of the wave has been swatted, or the player is simply faster than the spawn timer. Ask which of your two counts tells those apart.
- Bind with `AddUniqueDynamic`, because a pooled beetle comes back wave after wave and an identical second binding would make one swat count twice. `SetTimer` with looping on drives the spawns, a second handle drives the rest, and `ClearTimer` stops each one.

# Rubric

- The director has one current state, and a start request, a spawn attempt, a swat, and the end of a rest each do only what that state allows.
- Spawns come out one per interval, only from hatches out of the viewer's sight, tried in turn, and never past the live limit.
- Beetles are woken from the pool and given back to it, so a night creates no more actors than the most that were ever loose at once.
- Each wave announces its start, its clearing, and its rest, in that order and once each, after the director holds its new state, and the final wave ends the night without a rest.
- Stopping clears both timers and puts every beetle to sleep, and the director starts again from wave 1.
- The director points at the plan, the pool, the hatches, and the viewer, and nothing it points at points back.

# Alternative

A wave ends when its last beetle is swatted, and that needs two numbers: the beetles loose and the beetles still to come. The live count alone reaches zero whenever the player swats faster than the spawn timer sends, which is exactly the player the game should reward, so a director that checks only the live count hands a fast player a free rest in the middle of a wave. Keeping both counts in the director and moving to Rest only when both are zero is the fix.

The state here is an enum with a check at the top of each function, the first shape from Pack 2's "One mode at a time" world. It suits four small states. When the rest gains its own behavior, such as opening doors and dropping supplies, each state becomes an object with its own enter, exit, and timer handling, the second shape from that world. The announcements are Observer from "The lens, then the first payoff": the director never learns that a banner or a gate exists.

# Parsons

```yaml
- id: director-pick-hatch
  prompt: Put PickHatch in order.
  lines:
    - "ADojoS5Hatch* ADojoS5WaveDirector::PickHatch()"
    - "{"
    - "	const int32 Count = Hatches.Num();"
    - "	for (int32 Step = 0; Step < Count; ++Step)"
    - "	{"
    - "		const int32 Index = (NextHatch + Step) % Count;"
    - "		ADojoS5Hatch* Hatch = Hatches[Index];"
    - "		if (IsValid(Hatch) && Hatch->IsOutOfSight(Viewer))"
    - "		{"
    - "			NextHatch = (Index + 1) % Count;"
    - "			return Hatch;"
    - "		}"
    - "	}"
    - "	return nullptr;"
    - "}"
  distractors:
    - line: "		ADojoS5Hatch* Hatch = Hatches[NextHatch + Step];"
      mistake: Without the remainder the index runs past the end of the array once the turn wraps around, and TArray's bounds check stops the game.
    - line: "		if (Hatch->IsHidden())"
      mistake: AActor::IsHidden only says whether the hatch itself is drawn; it knows nothing about whether the viewer is facing it.
```
