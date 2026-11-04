---
id: p22-hit-feedback
title: One call for how a hit feels
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [facade]
skills: [facade, subsystems]
terms: [world-subsystem, subsystem-dependency, gameplay-statics, niagara-function-library]
prerequisites: [p22-every-system-every-hit]
xp: 60
estimatedMinutes: 20
concepts:
  - One world subsystem with a few task-named calls drives the sound desk, the spark pool, and the HUD ticker for every hit
  - The front asks for the three systems as dependencies when the world starts and keeps them
  - Every rule about how a hit sounds, sparks, and shows lives in PlayHitFeedback, once
  - The order rules of each system, such as reserving sparks before firing them, are the front's to keep
  - Callers depend on the front; the desk, the pool, and the ticker know nothing about it
---

# Brief

When you press Play with the setup below, one call to `PlayHitFeedback` makes a hit sound, spark, and show on the HUD, and a 50 damage hit flashes the screen's edge red while a 20 damage hit does not.

Three systems are written for you, each a `UWorldSubsystem` standing in for a real one, recording what it did so tests can check it:

- `UDojoP22SoundDesk` plays named cues on one effects bus. `FindCue` turns a name into an id, `PlayCue` plays an id at a spot at the bus volume, and the bus starts at 0, which is silent.
- `UDojoP22SparkPool` owns 32 sparks. `Reserve` holds some and gives a ticket (or `INDEX_NONE` when there are not enough free), `Fire` throws the held sparks and frees them, and `Cancel` frees them unthrown.
- `UDojoP22HudTicker` shows short lines and flashes the screen's edge.

`UDojoP22HitFeedback` is the front: a world subsystem that keeps the three and offers `PlayHitFeedback`, `PlayMissFeedback`, and the heavy threshold. Callers depend on it; the three systems know nothing about it.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap, `PlayHitFeedback(Where, Damage)`:

- Damage of 0 or less does nothing at all.
- A hit is heavy when `Damage` is at least the heavy threshold (40 unless it was set).
- Play the `HeavyHit` cue for a heavy hit and the `Hit` cue otherwise, at `Where`.
- Throw one spark for every 5 damage, rounded, but never fewer than 2 or more than the pool owns, at `Where`, pointing up; nothing may stay reserved afterwards.
- Push the damage as a line such as `-25`, rounded to a whole number.
- Flash the edge red for a heavy hit only.

## See it in the editor

In the Level Blueprint, on Begin Play, get the Dojo P22 Hit Feedback subsystem and call Play Hit Feedback at (0, 0, 100) with a damage of 50, then with 20. Then get the Dojo P22 Hud Ticker subsystem, print each entry of Get Lines with a For Each Loop, and print Get Flash Count: `-50`, `-20`, and 1. Print the length of Get Bursts on the Dojo P22 Spark Pool subsystem: 2. Change the second hit to 0 and play again: one line and one burst.

# Files

## DojoP22SoundDesk.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22SoundDesk.generated.h"

/** One cue the desk played: which, where, and how loud. */
USTRUCT(BlueprintType)
struct FDojoP22PlayedCue
{
	GENERATED_BODY()

	/** The cue's name. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sound")
	FName Cue;

	/** Where it played. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sound")
	FVector Where = FVector::ZeroVector;

	/** The bus volume it played at, 0 to 1. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sound")
	float Volume = 0.f;
};

/**
 * Stands in for the game's audio: named cues played on one effects bus.
 * A real desk would call UGameplayStatics::PlaySoundAtLocation; this one records what it played, so tests can hear it.
 */
UCLASS()
class UDojoP22SoundDesk : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** The id of the cue called Cue, or INDEX_NONE for a name the desk does not know. */
	UFUNCTION(BlueprintPure, Category = "Sound")
	int32 FindCue(FName Cue) const;

	/** Sets the effects bus volume, clamped to 0 to 1; every cue plays at it. The bus starts at 0, which is silent. */
	UFUNCTION(BlueprintCallable, Category = "Sound")
	void SetBusVolume(float Volume);

	/** The effects bus volume. */
	UFUNCTION(BlueprintPure, Category = "Sound")
	float GetBusVolume() const;

	/** Plays the cue with id CueId at Where, at the bus volume; false for an id FindCue never gave. */
	UFUNCTION(BlueprintCallable, Category = "Sound")
	bool PlayCue(int32 CueId, FVector Where);

	/** Every cue played in this world, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Sound")
	TArray<FDojoP22PlayedCue> GetPlayed() const;

private:
	/** The cues the desk knows, by id. */
	static const TArray<FName>& KnownCues();

	/** Every cue played, oldest first. */
	UPROPERTY()
	TArray<FDojoP22PlayedCue> Played;

	/** The effects bus volume. */
	float BusVolume = 0.f;
};
```

## DojoP22SoundDesk.cpp

```cpp
#include "DojoP22SoundDesk.h"

const TArray<FName>& UDojoP22SoundDesk::KnownCues()
{
	static const TArray<FName> Cues = { TEXT("Hit"), TEXT("HeavyHit"), TEXT("Miss"), TEXT("Gate"), TEXT("Fall") };
	return Cues;
}

int32 UDojoP22SoundDesk::FindCue(FName Cue) const
{
	return KnownCues().IndexOfByKey(Cue);
}

void UDojoP22SoundDesk::SetBusVolume(float Volume)
{
	BusVolume = FMath::Clamp(Volume, 0.f, 1.f);
}

float UDojoP22SoundDesk::GetBusVolume() const
{
	return BusVolume;
}

bool UDojoP22SoundDesk::PlayCue(int32 CueId, FVector Where)
{
	if (!KnownCues().IsValidIndex(CueId)) return false; // @explain: FindCue answers INDEX_NONE for a name the desk does not know, so a misspelled cue name plays nothing and says so with false; every caller would have to remember that, which is one more rule the front keeps for them.

	FDojoP22PlayedCue Entry;
	Entry.Cue = KnownCues()[CueId];
	Entry.Where = Where;
	Entry.Volume = BusVolume;
	Played.Add(Entry);
	return true;
}

TArray<FDojoP22PlayedCue> UDojoP22SoundDesk::GetPlayed() const
{
	return Played;
}
```

## DojoP22SparkPool.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22SparkPool.generated.h"

/** One burst of sparks the pool fired. */
USTRUCT(BlueprintType)
struct FDojoP22SparkBurst
{
	GENERATED_BODY()

	/** How many sparks flew. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sparks")
	int32 Count = 0;

	/** Where they flew from. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sparks")
	FVector Where = FVector::ZeroVector;

	/** Which way they flew. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sparks")
	FVector Normal = FVector::UpVector;
};

/**
 * Stands in for the game's visual effects: a fixed pool of sparks that are reserved, then fired or cancelled.
 * A real pool would spawn a Niagara system with UNiagaraFunctionLibrary::SpawnSystemAtLocation; this one records its bursts, so tests can see them.
 */
UCLASS()
class UDojoP22SparkPool : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** How many sparks the pool owns. */
	static constexpr int32 Capacity = 32;

	/** Holds Count sparks and returns a ticket for them, or INDEX_NONE when Count is below 1 or more than the free sparks. */
	UFUNCTION(BlueprintCallable, Category = "Sparks")
	int32 Reserve(int32 Count);

	/** Fires the sparks held by Ticket at Where along Normal and frees them; false for a ticket that is not held. */
	UFUNCTION(BlueprintCallable, Category = "Sparks")
	bool Fire(int32 Ticket, FVector Where, FVector Normal);

	/** Frees the sparks held by Ticket without firing them. */
	UFUNCTION(BlueprintCallable, Category = "Sparks")
	void Cancel(int32 Ticket);

	/** Sparks not held by any ticket. */
	UFUNCTION(BlueprintPure, Category = "Sparks")
	int32 GetFree() const;

	/** Every burst fired in this world, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Sparks")
	TArray<FDojoP22SparkBurst> GetBursts() const;

private:
	/** How many sparks each held ticket holds. */
	TMap<int32, int32> Held;

	/** The next ticket to hand out. */
	int32 NextTicket = 0;

	/** Sparks not held by any ticket. */
	int32 Free = Capacity;

	/** Every burst fired, oldest first. */
	UPROPERTY()
	TArray<FDojoP22SparkBurst> Bursts;
};
```

## DojoP22SparkPool.cpp

```cpp
#include "DojoP22SparkPool.h"

int32 UDojoP22SparkPool::Reserve(int32 Count)
{
	if (Count < 1 || Count > Free) return INDEX_NONE;

	const int32 Ticket = NextTicket++;
	Held.Add(Ticket, Count);
	Free -= Count;
	return Ticket;
}

bool UDojoP22SparkPool::Fire(int32 Ticket, FVector Where, FVector Normal)
{
	int32 Count = 0;
	if (!Held.RemoveAndCopyValue(Ticket, Count)) return false; // @explain: Only a held ticket fires, and firing frees its sparks; a ticket that is reserved and then forgotten holds its sparks for good, so the pool runs dry.

	FDojoP22SparkBurst Burst;
	Burst.Count = Count;
	Burst.Where = Where;
	Burst.Normal = Normal;
	Bursts.Add(Burst);
	Free += Count;
	return true;
}

void UDojoP22SparkPool::Cancel(int32 Ticket)
{
	int32 Count = 0;
	if (Held.RemoveAndCopyValue(Ticket, Count)) Free += Count;
}

int32 UDojoP22SparkPool::GetFree() const
{
	return Free;
}

TArray<FDojoP22SparkBurst> UDojoP22SparkPool::GetBursts() const
{
	return Bursts;
}
```

## DojoP22HudTicker.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22HudTicker.generated.h"

/**
 * Stands in for the game's HUD: a ticker of short lines and a colored flash around the screen's edge.
 * A real ticker would update a UUserWidget; this one records what it showed, so tests can read it.
 */
UCLASS()
class UDojoP22HudTicker : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** How many lines the ticker shows at once; older lines scroll away. */
	static constexpr int32 MaxLines = 5;

	/** Adds Line at the bottom of the ticker. */
	UFUNCTION(BlueprintCallable, Category = "HUD")
	void PushLine(const FString& Line);

	/** Flashes the screen's edge in Color. */
	UFUNCTION(BlueprintCallable, Category = "HUD")
	void FlashEdge(FLinearColor Color);

	/** The lines on the ticker now, oldest first. */
	UFUNCTION(BlueprintPure, Category = "HUD")
	TArray<FString> GetLines() const;

	/** How many lines were ever pushed in this world. */
	UFUNCTION(BlueprintPure, Category = "HUD")
	int32 GetPushedCount() const;

	/** How many times the edge flashed in this world. */
	UFUNCTION(BlueprintPure, Category = "HUD")
	int32 GetFlashCount() const;

	/** The color of the last flash, or transparent before the first. */
	UFUNCTION(BlueprintPure, Category = "HUD")
	FLinearColor GetLastFlash() const;

private:
	/** The lines on the ticker now, oldest first. */
	TArray<FString> Lines;

	/** Lines ever pushed. */
	int32 PushedCount = 0;

	/** Flashes so far. */
	int32 FlashCount = 0;

	/** The last flash's color. */
	FLinearColor LastFlash = FLinearColor::Transparent;
};
```

## DojoP22HudTicker.cpp

```cpp
#include "DojoP22HudTicker.h"

void UDojoP22HudTicker::PushLine(const FString& Line)
{
	Lines.Add(Line);
	if (Lines.Num() > MaxLines) Lines.RemoveAt(0);
	++PushedCount;
}

void UDojoP22HudTicker::FlashEdge(FLinearColor Color)
{
	LastFlash = Color;
	++FlashCount;
}

TArray<FString> UDojoP22HudTicker::GetLines() const
{
	return Lines;
}

int32 UDojoP22HudTicker::GetPushedCount() const
{
	return PushedCount;
}

int32 UDojoP22HudTicker::GetFlashCount() const
{
	return FlashCount;
}

FLinearColor UDojoP22HudTicker::GetLastFlash() const
{
	return LastFlash;
}
```

## DojoP22HitFeedback.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22HitFeedback.generated.h"

class UDojoP22HudTicker;
class UDojoP22SoundDesk;
class UDojoP22SparkPool;

/**
 * One front for everything a hit or a miss should look and sound like: the sound desk, the spark pool, and the HUD ticker behind a few calls.
 * Callers depend on this front; the desk, the pool, and the ticker know nothing about it.
 */
UCLASS()
class UDojoP22HitFeedback : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Makes sure the desk, the pool, and the ticker exist first, keeps them, and opens the effects bus. */
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	/** A hit of Damage at Where: its cue, its sparks, its HUD line, and a red flash for a heavy hit. Nothing for Damage of 0 or less. */
	UFUNCTION(BlueprintCallable, Category = "Feedback")
	void PlayHitFeedback(FVector Where, float Damage);

	/** A miss at Where: the miss cue, and nothing else. */
	UFUNCTION(BlueprintCallable, Category = "Feedback")
	void PlayMissFeedback(FVector Where);

	/** A hit of at least this much damage is heavy. */
	UFUNCTION(BlueprintCallable, Category = "Feedback")
	void SetHeavyDamage(float Damage);

	/** A hit of at least this much damage is heavy. */
	UFUNCTION(BlueprintPure, Category = "Feedback")
	float GetHeavyDamage() const;

	/** The effects bus volume every cue plays at. */
	static constexpr float EffectsVolume = 0.8f;

	/** One spark flies for every this many points of damage. */
	static constexpr float DamagePerSpark = 5.f;

private:
	/** The audio side. */
	UPROPERTY()
	TObjectPtr<UDojoP22SoundDesk> Sound;

	/** The visual effects side. */
	UPROPERTY()
	TObjectPtr<UDojoP22SparkPool> Sparks;

	/** The HUD side. */
	UPROPERTY()
	TObjectPtr<UDojoP22HudTicker> Hud;

	/** A hit of at least this much damage is heavy. */
	float HeavyDamage = 40.f;
};
```

## DojoP22HitFeedback.cpp

```cpp
#include "DojoP22HitFeedback.h"

#include "DojoP22HudTicker.h"
#include "DojoP22SoundDesk.h"
#include "DojoP22SparkPool.h"
#include "Subsystems/SubsystemCollection.h"

void UDojoP22HitFeedback::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	Sound = Collection.InitializeDependency<UDojoP22SoundDesk>(); // @explain: World subsystems start in no promised order; asking for the desk as a dependency makes sure it exists and is initialized before the front keeps it.
	Sparks = Collection.InitializeDependency<UDojoP22SparkPool>();
	Hud = Collection.InitializeDependency<UDojoP22HudTicker>();

	if (Sound) Sound->SetBusVolume(EffectsVolume); // @explain: The bus starts silent, so the front opens it once when the world starts; no caller ever has to know the bus exists.
}

void UDojoP22HitFeedback::PlayHitFeedback(FVector Where, float Damage)
{
}

void UDojoP22HitFeedback::PlayMissFeedback(FVector Where)
{
	if (!Sound) return;

	Sound->PlayCue(Sound->FindCue(TEXT("Miss")), Where);
}

void UDojoP22HitFeedback::SetHeavyDamage(float Damage)
{
	HeavyDamage = FMath::Max(Damage, 0.f);
}

float UDojoP22HitFeedback::GetHeavyDamage() const
{
	return HeavyDamage;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p22-hit-feedback/DojoP22HitFeedback.h"
#include "Quests/p22-hit-feedback/DojoP22HudTicker.h"
#include "Quests/p22-hit-feedback/DojoP22SoundDesk.h"
#include "Quests/p22-hit-feedback/DojoP22SparkPool.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_HitFeedback_HitPlaysAllThree, "Dojo.P22.HitFeedback.HitPlaysAllThree", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** One call for a 25 damage hit plays its cue on the open bus, throws its sparks, and puts its line on the ticker, with nothing left reserved. */
bool FDojo_P22_HitFeedback_HitPlaysAllThree::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	UWorld* World = TestWorld.GetWorld();
	UDojoP22HitFeedback* Feedback = World->GetSubsystem<UDojoP22HitFeedback>();
	if (!TestNotNull(TEXT("The world has the hit feedback subsystem"), Feedback)) return false;

	Feedback->PlayHitFeedback(FVector(100.0, 0.0, 0.0), 25.f);

	const TArray<FDojoP22PlayedCue> Played = World->GetSubsystem<UDojoP22SoundDesk>()->GetPlayed();
	if (!TestEqual(TEXT("One cue played"), Played.Num(), 1)) return false;
	TestTrue(TEXT("It is the hit cue"), Played[0].Cue == FName(TEXT("Hit")));
	TestTrue(TEXT("at the hit"), Played[0].Where.Equals(FVector(100.0, 0.0, 0.0), 0.01));
	TestEqual(TEXT("on the effects bus at 0.8"), Played[0].Volume, 0.8f);

	const TArray<FDojoP22SparkBurst> Bursts = World->GetSubsystem<UDojoP22SparkPool>()->GetBursts();
	if (!TestEqual(TEXT("One burst of sparks"), Bursts.Num(), 1)) return false;
	TestEqual(TEXT("of 5 sparks, one per 5 damage"), Bursts[0].Count, 5);
	TestTrue(TEXT("at the hit"), Bursts[0].Where.Equals(FVector(100.0, 0.0, 0.0), 0.01));
	TestEqual(TEXT("and every spark is back in the pool"), World->GetSubsystem<UDojoP22SparkPool>()->GetFree(), UDojoP22SparkPool::Capacity);

	UDojoP22HudTicker* Hud = World->GetSubsystem<UDojoP22HudTicker>();
	TestTrue(TEXT("The ticker shows -25"), Hud->GetLines() == TArray<FString>({ TEXT("-25") }));
	TestEqual(TEXT("and a light hit does not flash the edge"), Hud->GetFlashCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_HitFeedback_HeavyAndLightHits, "Dojo.P22.HitFeedback.HeavyAndLightHits", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A hit of 40 or more is heavy and flashes red; sparks never drop below 2 or pass the pool's 32; and the threshold can move. */
bool FDojo_P22_HitFeedback_HeavyAndLightHits::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	UWorld* World = TestWorld.GetWorld();
	UDojoP22HitFeedback* Feedback = World->GetSubsystem<UDojoP22HitFeedback>();
	if (!TestNotNull(TEXT("The world has the hit feedback subsystem"), Feedback)) return false;

	Feedback->PlayHitFeedback(FVector::ZeroVector, 40.f);
	Feedback->PlayHitFeedback(FVector::ZeroVector, 3.f);
	Feedback->PlayHitFeedback(FVector::ZeroVector, 500.f);

	const TArray<FDojoP22PlayedCue> Played = World->GetSubsystem<UDojoP22SoundDesk>()->GetPlayed();
	if (!TestEqual(TEXT("Three cues played"), Played.Num(), 3)) return false;
	TestTrue(TEXT("40 damage is heavy"), Played[0].Cue == FName(TEXT("HeavyHit")));
	TestTrue(TEXT("3 damage is light"), Played[1].Cue == FName(TEXT("Hit")));
	TestTrue(TEXT("500 damage is heavy"), Played[2].Cue == FName(TEXT("HeavyHit")));

	const TArray<FDojoP22SparkBurst> Bursts = World->GetSubsystem<UDojoP22SparkPool>()->GetBursts();
	if (!TestEqual(TEXT("Three bursts"), Bursts.Num(), 3)) return false;
	TestEqual(TEXT("40 damage throws 8 sparks"), Bursts[0].Count, 8);
	TestEqual(TEXT("3 damage still throws 2"), Bursts[1].Count, 2);
	TestEqual(TEXT("500 damage throws the whole pool of 32 and no more"), Bursts[2].Count, 32);

	UDojoP22HudTicker* Hud = World->GetSubsystem<UDojoP22HudTicker>();
	TestTrue(TEXT("The ticker shows each hit"), Hud->GetLines() == TArray<FString>({ TEXT("-40"), TEXT("-3"), TEXT("-500") }));
	TestEqual(TEXT("The two heavy hits flashed the edge"), Hud->GetFlashCount(), 2);
	TestTrue(TEXT("in red"), Hud->GetLastFlash().Equals(FLinearColor::Red));

	Feedback->SetHeavyDamage(20.f);
	Feedback->PlayHitFeedback(FVector::ZeroVector, 25.f);
	TestTrue(TEXT("With the threshold at 20, 25 damage is heavy"), World->GetSubsystem<UDojoP22SoundDesk>()->GetPlayed().Last().Cue == FName(TEXT("HeavyHit")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_HitFeedback_NoDamageNoFeedback, "Dojo.P22.HitFeedback.NoDamageNoFeedback", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A hit of 0 or less plays, throws, and shows nothing. */
bool FDojo_P22_HitFeedback_NoDamageNoFeedback::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	UWorld* World = TestWorld.GetWorld();
	UDojoP22HitFeedback* Feedback = World->GetSubsystem<UDojoP22HitFeedback>();
	if (!TestNotNull(TEXT("The world has the hit feedback subsystem"), Feedback)) return false;

	Feedback->PlayHitFeedback(FVector::ZeroVector, 0.f);
	Feedback->PlayHitFeedback(FVector::ZeroVector, -5.f);

	TestEqual(TEXT("No cue played"), World->GetSubsystem<UDojoP22SoundDesk>()->GetPlayed().Num(), 0);
	TestEqual(TEXT("No sparks flew"), World->GetSubsystem<UDojoP22SparkPool>()->GetBursts().Num(), 0);
	TestEqual(TEXT("No line was pushed"), World->GetSubsystem<UDojoP22HudTicker>()->GetPushedCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_HitFeedback_MissIsOnlyACue, "Dojo.P22.HitFeedback.MissIsOnlyACue", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A miss plays the miss cue on the open bus, and the front opened the bus before anyone asked. */
bool FDojo_P22_HitFeedback_MissIsOnlyACue::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	UWorld* World = TestWorld.GetWorld();
	UDojoP22HitFeedback* Feedback = World->GetSubsystem<UDojoP22HitFeedback>();
	if (!TestNotNull(TEXT("The world has the hit feedback subsystem"), Feedback)) return false;

	TestEqual(TEXT("The hit feedback subsystem opened the effects bus to 0.8 when the world started"), World->GetSubsystem<UDojoP22SoundDesk>()->GetBusVolume(), 0.8f);

	Feedback->PlayMissFeedback(FVector(0.0, 50.0, 0.0));
	const TArray<FDojoP22PlayedCue> Played = World->GetSubsystem<UDojoP22SoundDesk>()->GetPlayed();
	if (!TestEqual(TEXT("One cue played"), Played.Num(), 1)) return false;
	TestTrue(TEXT("the miss cue"), Played[0].Cue == FName(TEXT("Miss")));
	TestEqual(TEXT("No sparks flew"), World->GetSubsystem<UDojoP22SparkPool>()->GetBursts().Num(), 0);
	TestEqual(TEXT("No line was pushed"), World->GetSubsystem<UDojoP22HudTicker>()->GetPushedCount(), 0);

	return true;
}

#endif
```

# Hints

- Every number in the hit depends on whether it is heavy. What do you decide first, before you touch any of the three systems?
- The sound desk wants an id, not a name, and the spark pool wants a ticket before it will fire. Which call gives each of those, and what should happen when the pool says no?
- A line on the ticker is text. How does a damage of 24.6 become the text `-25`?

# Rubric

- PlayHitFeedback plays the HeavyHit cue for a hit of at least the heavy threshold and the Hit cue otherwise, at the hit.
- It throws one spark per 5 damage, rounded, between 2 and the pool's capacity, at the hit, and leaves nothing reserved.
- It pushes the rounded damage as a line such as -25, and flashes the edge red for a heavy hit only.
- A hit of 0 or less plays, throws, and shows nothing.
- Every rule about how a hit feels is in the front, and callers need nothing but PlayHitFeedback and PlayMissFeedback.
- Callers depend on the front; the sound desk, the spark pool, and the HUD ticker know nothing about it.

# Alternative

A `UGameInstanceSubsystem` would keep the facade, and anything it remembers, alive across level loads; that suits a front over the session's own systems, such as saving or the music mixer. Feedback belongs to the level being played, and the stand-in systems are world subsystems, so the facade is one too. A lighter alternative is a `UBlueprintFunctionLibrary` with a static `PlayHitFeedback(WorldContextObject, Where, Damage)`: no object to create, but nowhere to keep the three systems or a threshold a designer can change, so every call looks them all up again. A component on every weapon would put the rules back into every actor that has one.

# Parsons

```yaml
- id: play-hit-feedback
  prompt: Put PlayHitFeedback in order. It returns at once for a hit of no damage, decides whether the hit is heavy, then plays the sound, then the sparks, then the HUD line, and last the flash.
  lines:
    - "void UDojoP22HitFeedback::PlayHitFeedback(FVector Where, float Damage)"
    - "{"
    - "	if (Damage <= 0.f || !Sound || !Sparks || !Hud) return;"
    - "	const bool bHeavy = Damage >= HeavyDamage;"
    - "	Sound->PlayCue(Sound->FindCue(bHeavy ? FName(TEXT(\"HeavyHit\")) : FName(TEXT(\"Hit\"))), Where);"
    - "	const int32 Count = FMath::Clamp(FMath::RoundToInt32(Damage / DamagePerSpark), 2, UDojoP22SparkPool::Capacity);"
    - "	const int32 Ticket = Sparks->Reserve(Count);"
    - "	if (Ticket != INDEX_NONE) Sparks->Fire(Ticket, Where, FVector::UpVector);"
    - "	Hud->PushLine(FString::Printf(TEXT(\"-%d\"), FMath::RoundToInt32(Damage)));"
    - "	if (bHeavy) Hud->FlashEdge(FLinearColor::Red);"
    - "}"
  distractors:
    - line: "	UGameplayStatics::PlaySoundAtLocation(this, nullptr, Where, FRotator::ZeroRotator);"
      mistake: The front's job is to drive the game's own sound desk, which knows the bus and the cue names; calling the engine directly here, with no sound asset, skips the desk and plays nothing.
```
