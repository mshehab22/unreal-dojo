---
id: m4-fuse
title: A bomb with a fuse you can light, read, and pinch out
order: 5
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [time]
terms: [timer-manager, timer-handle, endplay, destroy]
prerequisites: [m4-holding-timers]
xp: 70
estimatedMinutes: 20
concepts:
  - One timer for the fuse and one for the countdown label, each with its own handle
  - A lit bomb can be made to blow sooner, never later
---

# Brief

When you place a bomb and light it with 3 seconds, its label counts down 3.0, 2.9, 2.8 and it blows (leaves play) when the count runs out; lighting it again with a shorter fuse makes it blow sooner, lighting it again with a longer one changes nothing, and defusing it stops the count and shows SAFE until it is lit again.

Most of the bomb is written for you, including its two timer handles, the label, `Blow`, and a `BeginPlay` that lights the bomb when `StartFuse` is set. Write the bodies of `Light` and `Defuse` in `ADojoM4Bomb`:

1. `Light` with no time left at all, zero or less, blows the bomb at once.
2. Otherwise `Light` starts the fuse with that many seconds, or, on a lit bomb, makes it blow sooner when that is sooner; a lit bomb never waits longer than it already would. While lit, the label counts down every 0.1 seconds.
3. `Defuse` stops the fuse and the countdown and shows SAFE.

Dependency direction: the bomb holds no pointer to anything; whoever wants it to blow calls `Light`.

This bomb is the second piece of the Fuse Yard boss.

## See it in the editor

Place a `DojoM4Bomb` and, in the level Blueprint, on the 1 key call Light with 3, on the 2 key Light with 1, on the 3 key Light with 10, and on the 4 key Defuse. Press Play and try orders: 1 then 2 blows it soon after, 1 then 3 changes nothing, 1 then 4 shows SAFE. Type `slomo 0.25` in the console and press 1 to watch the count run four times slower: timers run in game time. Then set Start Fuse to 2 in Details on a second bomb and press Play.

# Files

## DojoM4Bomb.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM4Bomb.generated.h"

class USphereComponent;
class UTextRenderComponent;

/** A bomb that blows, leaving play, when its fuse runs out; its label counts the fuse down while it is lit. */
UCLASS()
class ADojoM4Bomb : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid body as the root and the label above it. */
	ADojoM4Bomb();

	/** The solid shape. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Bomb")
	TObjectPtr<USphereComponent> Body;

	/** Floating text: the seconds left while lit, or SAFE. */
	UPROPERTY(VisibleAnywhere, Category = "Bomb")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds of fuse the bomb is lit with when it begins play; 0 starts it unlit. Set it before the bomb begins play. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bomb", meta = (ClampMin = "0"))
	float StartFuse = 0.f;

	/** Lights the fuse with Seconds; a lit bomb only ever blows sooner, and zero or less blows it at once. */
	UFUNCTION(BlueprintCallable, Category = "Bomb")
	void Light(float Seconds);

	/** Stops the fuse and the countdown. */
	UFUNCTION(BlueprintCallable, Category = "Bomb")
	void Defuse();

	/** True while the fuse is burning. */
	UFUNCTION(BlueprintPure, Category = "Bomb")
	bool IsLit() const;

	/** Seconds until the bomb blows, or 0 while it is unlit. */
	UFUNCTION(BlueprintPure, Category = "Bomb")
	float GetFuseRemaining() const;

	/** True when the bomb was already lit as it began play. */
	UFUNCTION(BlueprintPure, Category = "Bomb")
	bool WasLitAtStart() const;

protected:
	/** Lights the bomb with StartFuse when it is set, and writes the first label. */
	virtual void BeginPlay() override;

	/** Stops both timers. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** The fuse ran out: the bomb leaves play. */
	void Blow();

	/** Writes the seconds left, or SAFE. */
	void RefreshLabel();

	FTimerHandle FuseTimer;

	FTimerHandle LabelTimer;

	bool bLitAtStart = false;
};
```

## DojoM4Bomb.cpp

```cpp
#include "DojoM4Bomb.h"

#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM4Bomb::ADojoM4Bomb()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<USphereComponent>(TEXT("Body"));
	Body->SetSphereRadius(30.f);
	Body->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Body;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Body);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 80.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM4Bomb::BeginPlay()
{
	Super::BeginPlay();

	if (StartFuse > 0.f)
	{
		bLitAtStart = true;
		Light(StartFuse);
	}

	RefreshLabel();
}

void ADojoM4Bomb::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(FuseTimer);
	GetWorldTimerManager().ClearTimer(LabelTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoM4Bomb::Light(float Seconds)
{
	// Your code: with zero seconds or less, blow at once.
	// Your code: on a lit bomb, keep the fuse as it is unless Seconds is sooner than what is left.
	// Your code: start or shorten the fuse on FuseTimer, keep the label counting down every 0.1 seconds on LabelTimer, and refresh the label now.
}

void ADojoM4Bomb::Defuse()
{
	// Your code: stop both timers and refresh the label.
}

bool ADojoM4Bomb::IsLit() const
{
	return GetWorldTimerManager().IsTimerActive(FuseTimer);
}

float ADojoM4Bomb::GetFuseRemaining() const
{
	return IsLit() ? GetWorldTimerManager().GetTimerRemaining(FuseTimer) : 0.f;
}

bool ADojoM4Bomb::WasLitAtStart() const
{
	return bLitAtStart;
}

void ADojoM4Bomb::Blow()
{
	Destroy();
}

void ADojoM4Bomb::RefreshLabel()
{
	const FString Text = IsLit() ? FString::Printf(TEXT("%.1f"), GetFuseRemaining()) : FString(TEXT("SAFE"));
	Label->SetText(FText::FromString(Text));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"
#include "Support/DojoTestWorld.h"

namespace DojoM4BombTest
{
	/** Spawns a bomb at a spot, with the start fuse a designer would give it in Details. */
	ADojoM4Bomb* PlaceBomb(FDojoTestWorld& TestWorld, const FVector& Where, float StartFuse)
	{
		const FTransform Spot(Where);
		ADojoM4Bomb* Bomb = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM4Bomb>(ADojoM4Bomb::StaticClass(), Spot);
		Bomb->StartFuse = StartFuse;
		Bomb->FinishSpawning(Spot);
		return Bomb;
	}

	/** The bomb's label text. */
	FString LabelOf(const ADojoM4Bomb* Bomb)
	{
		return Bomb->Label->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Fuse_BurnsDownAndBlows, "Dojo.M4.Fuse.BurnsDownAndBlows", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lights a bomb with 2 seconds and checks the countdown halfway and that the bomb leaves play when the fuse runs out. */
bool FDojo_M4_Fuse_BurnsDownAndBlows::RunTest(const FString& Parameters)
{
	using namespace DojoM4BombTest;

	FDojoTestWorld TestWorld;

	ADojoM4Bomb* Bomb = PlaceBomb(TestWorld, FVector::ZeroVector, 0.f);
	if (!TestNotNull(TEXT("Bomb spawned"), Bomb)) return false;
	const TWeakObjectPtr<ADojoM4Bomb> Watched(Bomb);

	TestFalse(TEXT("A new bomb is not lit"), Bomb->IsLit());
	TestEqual(TEXT("and reads SAFE"), LabelOf(Bomb), FString(TEXT("SAFE")));
	TestEqual(TEXT("and has no fuse left"), Bomb->GetFuseRemaining(), 0.f);

	Bomb->Light(2.f);
	TestTrue(TEXT("Light lights it"), Bomb->IsLit());
	TestEqual(TEXT("with the whole fuse left"), Bomb->GetFuseRemaining(), 2.f, 0.01f);
	TestEqual(TEXT("and the label shows it at once"), LabelOf(Bomb), FString(TEXT("2.0")));

	TestWorld.Tick(63);
	TestEqual(TEXT("A little over a second later, a little under a second is left"), Bomb->GetFuseRemaining(), 0.95f, 0.02f);
	TestEqual(TEXT("and the countdown label reads 1.0"), LabelOf(Bomb), FString(TEXT("1.0")));

	TestWorld.Tick(60);
	TestFalse(TEXT("When the fuse runs out, the bomb leaves play"), Watched.IsValid());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Fuse_LightingAgainNeverDelays, "Dojo.M4.Fuse.LightingAgainNeverDelays", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lights a burning bomb again with a longer and then a shorter fuse, and checks only the shorter one changes when it blows. */
bool FDojo_M4_Fuse_LightingAgainNeverDelays::RunTest(const FString& Parameters)
{
	using namespace DojoM4BombTest;

	FDojoTestWorld TestWorld;

	ADojoM4Bomb* Bomb = PlaceBomb(TestWorld, FVector::ZeroVector, 0.f);
	if (!TestNotNull(TEXT("Bomb spawned"), Bomb)) return false;
	const TWeakObjectPtr<ADojoM4Bomb> Watched(Bomb);

	Bomb->Light(3.f);
	TestWorld.Tick(60);
	TestEqual(TEXT("After a second, 2 seconds are left"), Bomb->GetFuseRemaining(), 2.f, 0.02f);

	Bomb->Light(5.f);
	TestEqual(TEXT("Lighting a burning bomb with a longer fuse never makes it wait longer: 2 seconds are still left"), Bomb->GetFuseRemaining(), 2.f, 0.02f);

	Bomb->Light(0.5f);
	TestEqual(TEXT("Lighting it with a shorter fuse makes it blow sooner"), Bomb->GetFuseRemaining(), 0.5f, 0.02f);
	TestEqual(TEXT("and the label shows the new count"), LabelOf(Bomb), FString(TEXT("0.5")));

	TestWorld.Tick(33);
	TestFalse(TEXT("It blew half a second later"), Watched.IsValid());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Fuse_DefuseAndRelight, "Dojo.M4.Fuse.DefuseAndRelight", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Defuses a burning bomb, checks it stays, lights it again, and blows a second bomb at once with a fuse of zero. */
bool FDojo_M4_Fuse_DefuseAndRelight::RunTest(const FString& Parameters)
{
	using namespace DojoM4BombTest;

	FDojoTestWorld TestWorld;

	ADojoM4Bomb* Bomb = PlaceBomb(TestWorld, FVector::ZeroVector, 0.f);
	if (!TestNotNull(TEXT("Bomb spawned"), Bomb)) return false;
	const TWeakObjectPtr<ADojoM4Bomb> Watched(Bomb);

	Bomb->Light(1.f);
	TestWorld.Tick(30);
	Bomb->Defuse();
	TestFalse(TEXT("Defuse puts the fuse out"), Bomb->IsLit());
	TestEqual(TEXT("the label reads SAFE"), LabelOf(Bomb), FString(TEXT("SAFE")));
	TestEqual(TEXT("and no fuse is left"), Bomb->GetFuseRemaining(), 0.f);

	TestWorld.Tick(90);
	TestTrue(TEXT("A defused bomb stays in play"), Watched.IsValid());
	TestEqual(TEXT("and its label stays SAFE"), LabelOf(Bomb), FString(TEXT("SAFE")));

	Bomb->Light(4.f);
	TestEqual(TEXT("A defused bomb lights again with the whole new fuse"), Bomb->GetFuseRemaining(), 4.f, 0.02f);

	ADojoM4Bomb* Other = PlaceBomb(TestWorld, FVector(500.0, 0.0, 0.0), 0.f);
	if (!TestNotNull(TEXT("Second bomb spawned"), Other)) return false;
	const TWeakObjectPtr<ADojoM4Bomb> WatchedOther(Other);

	Other->Light(0.f);
	TestFalse(TEXT("A fuse of zero blows the bomb at once"), WatchedOther.IsValid());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Fuse_StartFuseLightsAtBeginPlay, "Dojo.M4.Fuse.StartFuseLightsAtBeginPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spawns a bomb with a start fuse set before it begins play and checks it is lit from its first moment. */
bool FDojo_M4_Fuse_StartFuseLightsAtBeginPlay::RunTest(const FString& Parameters)
{
	using namespace DojoM4BombTest;

	FDojoTestWorld TestWorld;

	ADojoM4Bomb* Lit = PlaceBomb(TestWorld, FVector::ZeroVector, 1.5f);
	ADojoM4Bomb* Unlit = PlaceBomb(TestWorld, FVector(500.0, 0.0, 0.0), 0.f);
	if (!TestNotNull(TEXT("Bombs spawned"), Unlit) || !Lit) return false;

	TestTrue(TEXT("A start fuse lights the bomb as it begins play"), Lit->IsLit());
	TestTrue(TEXT("and it says so"), Lit->WasLitAtStart());
	TestEqual(TEXT("with the whole start fuse left"), Lit->GetFuseRemaining(), 1.5f, 0.01f);
	TestFalse(TEXT("Without one, a bomb starts unlit"), Unlit->IsLit() || Unlit->WasLitAtStart());

	return true;
}

#endif
```

# Hints

- `Light` has three cases: nothing left, a bomb that is not burning yet, and a bomb that is already burning. Only the last one needs to look at the fuse it already has before touching it.
- A handle that already holds a running timer is replaced by the next `SetTimer` on it, from zero. Ask the timer manager how long the burning fuse has left, and only set the new one when it is shorter.
- `GetTimerRemaining`, `IsTimerActive`, `SetTimer`, and `ClearTimer` are on `FTimerManager` in `TimerManager.h`, reached with `GetWorldTimerManager()`; the label timer loops, the fuse timer does not.

# Rubric

- The fuse and the label each have their own timer and handle; the fuse fires once and the label loops every 0.1 seconds.
- A lit bomb blows sooner when lit with less time than it has left, and never later.
- Zero or less blows the bomb at once.
- `Defuse` clears both timers, so the bomb stays in play and its label reads SAFE until it is lit again.
- The bomb holds no pointer to anyone; it clears its own timers in `EndPlay`.

# Alternative

The label could be updated in `Tick` from `GetFuseRemaining` instead of by a second timer: one fewer handle, and the label is exact every frame. The cost is a tick on every bomb in the yard even while it sits unlit, unless the bomb turns its tick on and off with the fuse, which is the same bookkeeping as the second handle. A timer at 0.1 seconds redraws ten times a second, which is all a counter shown to one decimal needs. A material that glows faster as the fuse runs down would be a better feel than text, driven by the same remaining time.
