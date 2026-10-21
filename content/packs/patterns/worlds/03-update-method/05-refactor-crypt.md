---
id: p3-crypt-refactor
title: Hand the crypt's behavior back to its things
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [update-method]
skills: [update-method, refactoring]
terms: [tick, deltatime, primary-actor-tick, tarray]
prerequisites: [p3-spark-swarm]
xp: 90
estimatedMinutes: 20
concepts:
  - A director that runs everyone's per-frame behavior must know every kind of thing and keep their state in step
  - Moving each behavior and its state into the thing itself lets the engine's walk do the dispatch
  - A thing that updates itself keeps working when placed without the director
---

# Brief

When you press Play, the braziers' flames still waver and the sweepers still turn exactly as before, but each one now does it from its own Tick, and a brazier dropped into a level with no director wavers too.

The starter works. Read the director first. Its Tick runs every brazier's waver and every sweeper's turn, and it keeps their state for them in two lists of its own (`BrazierPhases`, `SweeperAngles`) that must line up index for index with the designer's lists. A designer who adds a brazier while the game runs breaks that line-up. A new kind of thing (a swinging chandelier) means another list, another loop, and another include in the director. A brazier placed without a director never moves at all.

Refactor it so each thing owns its behavior:

- The brazier ticks itself: it keeps its own waver phase, advances it by `WaverSpeed` times `DeltaSeconds`, and sets its flame height from it, exactly as the director did.
- The sweeper ticks itself: it advances its own angle by `DegreesPerSecond` times `DeltaSeconds`, wrapping at 360.
- The director keeps its two roster lists (a later scoreboard reads them), but no longer ticks and holds no per-thing state. Its source file stops including the brazier and sweeper headers.
- Public names and defaults stay the same, so the tuned look does not change.

## See it in the editor

Place two `DojoP3CryptBrazier` actors, two `DojoP3CryptSweeper` actors, and one `DojoP3CryptDirector` with all four in its lists. Press Play: the brazier labels count up and down around 50, the sweeper labels turn. After the refactor, delete the director and play again: everything still moves. Place a third brazier and set its Waver Speed to 10: it flickers faster, and nobody else had to change.

# Files

## DojoP3CryptDirector.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3CryptDirector.generated.h"

class ADojoP3CryptBrazier;
class ADojoP3CryptSweeper;

/** Runs the crypt: every frame it wavers each brazier's flame and turns each sweeper. */
UCLASS()
class ADojoP3CryptDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking on. */
	ADojoP3CryptDirector();

	/** The crypt's braziers, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Crypt")
	TArray<TObjectPtr<ADojoP3CryptBrazier>> Braziers;

	/** The crypt's sweepers, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Crypt")
	TArray<TObjectPtr<ADojoP3CryptSweeper>> Sweepers;

	/** Advances every brazier's waver and every sweeper's turn by one frame. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Sizes the per-brazier and per-sweeper state to match the lists. */
	virtual void BeginPlay() override;

private:
	/** Each brazier's waver phase, by index into Braziers. */
	TArray<float> BrazierPhases;

	/** Each sweeper's angle, by index into Sweepers. */
	TArray<float> SweeperAngles;
};
```

## DojoP3CryptDirector.cpp

```cpp
#include "DojoP3CryptDirector.h"

#include "DojoP3CryptBrazier.h"
#include "DojoP3CryptSweeper.h"

ADojoP3CryptDirector::ADojoP3CryptDirector()
{
	PrimaryActorTick.bCanEverTick = true;
}

void ADojoP3CryptDirector::BeginPlay()
{
	Super::BeginPlay();

	BrazierPhases.Init(0.f, Braziers.Num());
	SweeperAngles.Init(0.f, Sweepers.Num());
}

void ADojoP3CryptDirector::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	for (int32 Index = 0; Index < Braziers.Num(); ++Index)
	{
		ADojoP3CryptBrazier* Brazier = Braziers[Index];
		if (!IsValid(Brazier)) continue;

		BrazierPhases[Index] += Brazier->WaverSpeed * DeltaSeconds;
		Brazier->SetFlameHeight(Brazier->BaseHeight + Brazier->Waver * FMath::Sin(BrazierPhases[Index]));
	}

	for (int32 Index = 0; Index < Sweepers.Num(); ++Index)
	{
		ADojoP3CryptSweeper* Sweeper = Sweepers[Index];
		if (!IsValid(Sweeper)) continue;

		SweeperAngles[Index] = FMath::Fmod(SweeperAngles[Index] + Sweeper->DegreesPerSecond * DeltaSeconds, 360.f);
		Sweeper->SetAngle(SweeperAngles[Index]);
	}
}
```

## DojoP3CryptBrazier.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3CryptBrazier.generated.h"

class UTextRenderComponent;

/** A brazier whose flame wavers up and down around a base height. */
UCLASS()
class ADojoP3CryptBrazier : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP3CryptBrazier();

	/** Floating text that shows the flame height. */
	UPROPERTY(VisibleAnywhere, Category = "Brazier")
	TObjectPtr<UTextRenderComponent> Label;

	/** Flame height the waver centers on, in centimeters. */
	UPROPERTY(EditAnywhere, Category = "Brazier")
	float BaseHeight = 50.f;

	/** How far above and below the base the flame reaches, in centimeters. */
	UPROPERTY(EditAnywhere, Category = "Brazier", meta = (ClampMin = "0"))
	float Waver = 10.f;

	/** How fast the flame wavers, in radians per second. */
	UPROPERTY(EditAnywhere, Category = "Brazier", meta = (ClampMin = "0"))
	float WaverSpeed = 3.f;

	/** Sets the flame height and shows it. */
	void SetFlameHeight(float NewHeight);

	/** The current flame height, in centimeters. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	float GetFlameHeight() const;

private:
	float FlameHeight = 0.f;
};
```

## DojoP3CryptBrazier.cpp

```cpp
#include "DojoP3CryptBrazier.h"

#include "Components/TextRenderComponent.h"

ADojoP3CryptBrazier::ADojoP3CryptBrazier()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP3CryptBrazier::SetFlameHeight(float NewHeight)
{
	FlameHeight = NewHeight;
	Label->SetText(FText::AsNumber(FMath::RoundToInt(FlameHeight)));
}

float ADojoP3CryptBrazier::GetFlameHeight() const
{
	return FlameHeight;
}
```

## DojoP3CryptSweeper.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3CryptSweeper.generated.h"

class UTextRenderComponent;

/** A sweeping blade that turns steadily around its post. */
UCLASS()
class ADojoP3CryptSweeper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP3CryptSweeper();

	/** Floating text that is turned with the blade. */
	UPROPERTY(VisibleAnywhere, Category = "Sweeper")
	TObjectPtr<UTextRenderComponent> Label;

	/** Turn rate, in degrees per second. */
	UPROPERTY(EditAnywhere, Category = "Sweeper")
	float DegreesPerSecond = 90.f;

	/** Sets the blade's angle and turns the actor to it. */
	void SetAngle(float NewAngle);

	/** The blade's angle, from 0 up to 360 degrees. */
	UFUNCTION(BlueprintPure, Category = "Sweeper")
	float GetAngle() const;

private:
	float Angle = 0.f;
};
```

## DojoP3CryptSweeper.cpp

```cpp
#include "DojoP3CryptSweeper.h"

#include "Components/TextRenderComponent.h"

ADojoP3CryptSweeper::ADojoP3CryptSweeper()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("--|--")));
}

void ADojoP3CryptSweeper::SetAngle(float NewAngle)
{
	Angle = NewAngle;
	SetActorRotation(FRotator(0.f, Angle, 0.f));
}

float ADojoP3CryptSweeper::GetAngle() const
{
	return Angle;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p3-crypt-refactor/DojoP3CryptBrazier.h"
#include "Quests/p3-crypt-refactor/DojoP3CryptDirector.h"
#include "Quests/p3-crypt-refactor/DojoP3CryptSweeper.h"
#include "Support/DojoTestWorld.h"

namespace DojoP3CryptRefactorTest
{
	/** Spawns a director the way a level does: its lists are filled before BeginPlay runs. */
	ADojoP3CryptDirector* SpawnDirector(FDojoTestWorld& TestWorld, ADojoP3CryptBrazier* Brazier, ADojoP3CryptSweeper* Sweeper)
	{
		ADojoP3CryptDirector* Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP3CryptDirector>(ADojoP3CryptDirector::StaticClass(), FTransform::Identity);
		if (!Director) return nullptr;

		Director->Braziers.Add(Brazier);
		Director->Sweepers.Add(Sweeper);
		Director->FinishSpawning(FTransform::Identity);
		return Director;
	}

	/** Checks a brazier and a sweeper after about one second of 60 frames: the tuned look, allowing one frame of difference in when ticking began. */
	void CheckOneSecond(FAutomationTestBase& Test, const ADojoP3CryptBrazier* Brazier, const ADojoP3CryptSweeper* Sweeper)
	{
		const float ExpectedHeight = Brazier->BaseHeight + Brazier->Waver * FMath::Sin(Brazier->WaverSpeed * 1.f);
		Test.TestEqual(TEXT("The flame wavered to the tuned height for one second"), Brazier->GetFlameHeight(), ExpectedHeight, 1.f);
		Test.TestEqual(TEXT("The sweeper turned a quarter turn in one second"), Sweeper->GetAngle(), Sweeper->DegreesPerSecond * 1.f, 2.f);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P3_CryptRefactor_LookUnchanged, "Dojo.P3.CryptRefactor.LookUnchanged", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With a director listing them, one second of frames gives the tuned flame height and sweep, as the starter does. */
bool FDojo_P3_CryptRefactor_LookUnchanged::RunTest(const FString& Parameters)
{
	using namespace DojoP3CryptRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP3CryptBrazier* Brazier = TestWorld.SpawnActor<ADojoP3CryptBrazier>();
	ADojoP3CryptSweeper* Sweeper = TestWorld.SpawnActor<ADojoP3CryptSweeper>();
	if (!TestNotNull(TEXT("Brazier spawned"), Brazier) || !TestNotNull(TEXT("Sweeper spawned"), Sweeper)) return false;

	ADojoP3CryptDirector* Director = SpawnDirector(TestWorld, Brazier, Sweeper);
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	TestWorld.Tick(60);

	CheckOneSecond(*this, Brazier, Sweeper);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P3_CryptRefactor_EachThingUpdatesItself, "Dojo.P3.CryptRefactor.EachThingUpdatesItself", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With no director in the level, a brazier and a sweeper still move, because each ticks itself. */
bool FDojo_P3_CryptRefactor_EachThingUpdatesItself::RunTest(const FString& Parameters)
{
	using namespace DojoP3CryptRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP3CryptBrazier* Brazier = TestWorld.SpawnActor<ADojoP3CryptBrazier>();
	ADojoP3CryptSweeper* Sweeper = TestWorld.SpawnActor<ADojoP3CryptSweeper>();
	if (!TestNotNull(TEXT("Brazier spawned"), Brazier) || !TestNotNull(TEXT("Sweeper spawned"), Sweeper)) return false;

	TestTrue(TEXT("The brazier ticks"), Brazier->PrimaryActorTick.bCanEverTick);
	TestTrue(TEXT("The sweeper ticks"), Sweeper->PrimaryActorTick.bCanEverTick);

	TestWorld.Tick(60);

	CheckOneSecond(*this, Brazier, Sweeper);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P3_CryptRefactor_DirectorRunsNobody, "Dojo.P3.CryptRefactor.DirectorRunsNobody", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The director no longer ticks, and a director plus self-ticking things does not run anything twice. */
bool FDojo_P3_CryptRefactor_DirectorRunsNobody::RunTest(const FString& Parameters)
{
	using namespace DojoP3CryptRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP3CryptBrazier* Brazier = TestWorld.SpawnActor<ADojoP3CryptBrazier>();
	ADojoP3CryptSweeper* Sweeper = TestWorld.SpawnActor<ADojoP3CryptSweeper>();
	ADojoP3CryptDirector* Director = SpawnDirector(TestWorld, Brazier, Sweeper);
	if (!TestNotNull(TEXT("Actors spawned"), Brazier) || !TestNotNull(TEXT("Actors spawned"), Sweeper) || !TestNotNull(TEXT("Director spawned"), Director)) return false;

	TestFalse(TEXT("The director has no per-frame work"), Director->PrimaryActorTick.bCanEverTick);
	TestTrue(TEXT("The director still lists its brazier"), Director->Braziers.Contains(Brazier));

	TestWorld.Tick(30);
	TestEqual(TEXT("Half a second turns the sweeper once, not twice"), Sweeper->GetAngle(), Sweeper->DegreesPerSecond * 0.5f, 2.f);

	return true;
}

#endif
```

# Hints

- For each loop in the director's Tick, ask which object's state it reads and writes; that object is where the loop's body belongs.
- The per-thing lists become one field on each thing, and the loop body becomes that thing's Tick, which also has to be switched on in its constructor.
- The director keeps only its two UPROPERTY lists; with its Tick and BeginPlay gone, its source file needs neither thing's header.

# Rubric

- The brazier and the sweeper each tick themselves, with their state (phase, angle) stored on themselves.
- The director no longer ticks, holds no per-thing state, and does not include the brazier or sweeper headers.
- A brazier or sweeper placed without a director behaves the same as one listed in a director.
- The waver and sweep use the same properties and formulas as before, so the tuned look is unchanged.
- No per-frame work is done twice: nothing still drives the things from outside.

# Alternative

Both behaviors could be actor components (a waver component and a spin component) that any actor can carry, each with its own TickComponent. That is the next step when a chandelier also wants to waver and a door also wants to spin: the behavior is reused, not copied. For one brazier class and one sweeper class it adds two classes and the component setup for no reuse yet, so putting the Tick on the actor is the simpler change today, and moving it into a component later is a small step from there.
