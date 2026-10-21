---
id: p4-straw-fire
title: Straw that burns the same whichever way you look
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [double-buffer]
skills: [double-buffer, containers]
terms: [uenum, tarray, timer-manager, ufunction]
prerequisites: [p4-read-while-writing]
xp: 50
estimatedMinutes: 15
concepts:
  - A step that reads and writes the same grid lets squares visited early change what squares visited later see
  - Reading only the finished grid and writing a second one makes every square see the same moment
  - Swapping the two arrays hands over the whole new grid at once, without copying it
---

# Brief

When you press Play and light the middle of the floor with `ke * Ignite 6 4`, a ring of orange squares spreads across the arena's straw one square per half second in every direction at the same pace, and it spreads exactly the same if you flip Walk Backward on.

The rule is simple: a burning square turns to ash, and straw next to a burning square catches. The trap is in how a step applies it. Walk the floor left to right and write each square's new state straight into the floor, and the square you just set burning is already "next to fire" when the walk reaches its neighbor. The fire then races through a whole row in one step in the direction of the walk, or dies out the other way. The outcome depends on the order of a loop nobody chose on purpose.

`ADojoP4StrawFloor` keeps two floors: `Squares`, the finished one that every rule reads, and `NextSquares`, the one the step writes. Most of the class is written, including `NextStateOf`, which reads only `Squares`. First read the marked lines and say in a sentence why each one is there. Then fill the two gaps in `Step`: write each square's next state into `NextSquares`, and after the walk make the new floor the one everybody reads. `Swap(Squares, NextSquares)` exchanges the two arrays' contents in constant time, without copying a square.

Naive first: write `Squares[Index] = NextStateOf(Index);` and run the tests. The line of straw that should burn one square per step does something else, and it does a different wrong thing with Walk Backward on.

## See it in the editor

Place a `DojoP4StrawFloor` in the sandbox map. Press Play, open the console, and run `ke * Ignite 6 4`: orange squares spread outward as a diamond, one ring every half second, leaving ash behind, while the label counts the burning squares. Stop, tick Walk Backward in the Details panel, and play again: the diamond is identical. That flag is the experiment: before your fix, flipping it changes the fire.

# Files

## DojoP4StrawFloor.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP4StrawFloor.generated.h"

class UTextRenderComponent;

/** One square of straw on the arena floor. */
UENUM(BlueprintType)
enum class EDojoP4StrawState : uint8
{
	ESS_Straw UMETA(DisplayName = "Straw"),
	ESS_Burning UMETA(DisplayName = "Burning"),
	ESS_Ash UMETA(DisplayName = "Ash")
};

/** A grid of straw squares where fire spreads one square per step, the same whichever way the step walks the grid. */
UCLASS()
class ADojoP4StrawFloor : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on for drawing. */
	ADojoP4StrawFloor();

	/** Floating text that shows how many squares are burning. */
	UPROPERTY(VisibleAnywhere, Category = "Straw")
	TObjectPtr<UTextRenderComponent> Label;

	/** Squares along X. */
	UPROPERTY(EditAnywhere, Category = "Straw", meta = (ClampMin = "1"))
	int32 Width = 12;

	/** Squares along Y. */
	UPROPERTY(EditAnywhere, Category = "Straw", meta = (ClampMin = "1"))
	int32 Height = 8;

	/** Seconds between spread steps during play. */
	UPROPERTY(EditAnywhere, Category = "Straw", meta = (ClampMin = "0.05"))
	float StepSeconds = 0.5f;

	/** Which way a step walks the squares; with a correct step the fire spreads the same either way. */
	UPROPERTY(EditAnywhere, Category = "Straw")
	bool bWalkBackward = false;

	/** Refills the floor with fresh straw at the given size. */
	UFUNCTION(BlueprintCallable, Category = "Straw")
	void ResetGrid(int32 NewWidth, int32 NewHeight);

	/** Sets one straw square burning; ash and squares off the floor are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Straw")
	void Ignite(int32 X, int32 Y);

	/** One spread step: burning squares turn to ash, and straw next to a burning square catches. */
	UFUNCTION(BlueprintCallable, Category = "Straw")
	void Step();

	/** The state of one square; squares off the floor read as ash. */
	UFUNCTION(BlueprintPure, Category = "Straw")
	EDojoP4StrawState GetSquare(int32 X, int32 Y) const;

	/** How many squares are burning right now. */
	UFUNCTION(BlueprintPure, Category = "Straw")
	int32 CountBurning() const;

	/** Draws the burning squares. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Fills the floor and starts the step timer. */
	virtual void BeginPlay() override;

private:
	/** The state the square at Index will have after this step, read only from Squares. */
	EDojoP4StrawState NextStateOf(int32 Index) const; // @explain: const and reading only Squares, so a square's next state can never depend on a neighbor already changed this step.

	/** True when the square at X, Y is on the floor and burning in Squares. */
	bool IsBurningAt(int32 X, int32 Y) const;

	/** Writes the burning count into the label. */
	void RefreshLabel();

	/** The finished floor everyone reads. */
	TArray<EDojoP4StrawState> Squares;

	/** The floor being built by the current step. */
	TArray<EDojoP4StrawState> NextSquares; // @explain: A second copy of the floor, so a step can write new states without touching the copy it is reading.

	FTimerHandle StepTimer;
};
```

## DojoP4StrawFloor.cpp

```cpp
#include "DojoP4StrawFloor.h"

#include "Components/TextRenderComponent.h"
#include "DrawDebugHelpers.h"
#include "TimerManager.h"

ADojoP4StrawFloor::ADojoP4StrawFloor()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP4StrawFloor::BeginPlay()
{
	Super::BeginPlay();

	ResetGrid(Width, Height);
	GetWorldTimerManager().SetTimer(StepTimer, this, &ADojoP4StrawFloor::Step, StepSeconds, true);
}

void ADojoP4StrawFloor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	for (int32 Index = 0; Index < Squares.Num(); ++Index)
	{
		if (Squares[Index] != EDojoP4StrawState::ESS_Burning) continue;

		const FVector Center = GetActorLocation() + FVector((Index % Width) * 100.f, (Index / Width) * 100.f, 0.f);
		DrawDebugSolidBox(GetWorld(), Center, FVector(45.f, 45.f, 5.f), FColor::Orange);
	}
}

void ADojoP4StrawFloor::ResetGrid(int32 NewWidth, int32 NewHeight)
{
	Width = FMath::Max(1, NewWidth);
	Height = FMath::Max(1, NewHeight);
	Squares.Init(EDojoP4StrawState::ESS_Straw, Width * Height);
	NextSquares.Init(EDojoP4StrawState::ESS_Straw, Width * Height);
	RefreshLabel();
}

void ADojoP4StrawFloor::Ignite(int32 X, int32 Y)
{
	if (X < 0 || X >= Width || Y < 0 || Y >= Height) return;

	EDojoP4StrawState& Square = Squares[Y * Width + X];
	if (Square == EDojoP4StrawState::ESS_Straw) Square = EDojoP4StrawState::ESS_Burning;

	RefreshLabel();
}

void ADojoP4StrawFloor::Step()
{
	NextSquares.SetNum(Squares.Num()); // @explain: The copy being built must have a slot for every square before the walk writes into it.

	for (int32 Visit = 0; Visit < Squares.Num(); ++Visit)
	{
		const int32 Index = bWalkBackward ? Squares.Num() - 1 - Visit : Visit; // @explain: The walk direction is a switch for testing the claim that order no longer matters.
		// Your code: write this square's next state into the copy being built, not into Squares.
	}

	// Your code: make the copy you just built the floor everyone reads.

	RefreshLabel();
}

EDojoP4StrawState ADojoP4StrawFloor::NextStateOf(int32 Index) const
{
	const EDojoP4StrawState Current = Squares[Index];

	if (Current == EDojoP4StrawState::ESS_Burning) return EDojoP4StrawState::ESS_Ash; // @explain: Every rule decides from the finished floor only: a square that was burning when the step began turns to ash.
	if (Current == EDojoP4StrawState::ESS_Ash) return EDojoP4StrawState::ESS_Ash;

	const int32 X = Index % Width;
	const int32 Y = Index / Width;
	const bool bNextToFire = IsBurningAt(X - 1, Y) || IsBurningAt(X + 1, Y) || IsBurningAt(X, Y - 1) || IsBurningAt(X, Y + 1);

	return bNextToFire ? EDojoP4StrawState::ESS_Burning : EDojoP4StrawState::ESS_Straw;
}

bool ADojoP4StrawFloor::IsBurningAt(int32 X, int32 Y) const
{
	return GetSquare(X, Y) == EDojoP4StrawState::ESS_Burning;
}

EDojoP4StrawState ADojoP4StrawFloor::GetSquare(int32 X, int32 Y) const
{
	if (X < 0 || X >= Width || Y < 0 || Y >= Height) return EDojoP4StrawState::ESS_Ash;

	return Squares[Y * Width + X];
}

int32 ADojoP4StrawFloor::CountBurning() const
{
	int32 Count = 0;
	for (const EDojoP4StrawState Square : Squares)
	{
		if (Square == EDojoP4StrawState::ESS_Burning) Count++;
	}
	return Count;
}

void ADojoP4StrawFloor::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Burning: %d"), CountBurning())));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p4-straw-fire/DojoP4StrawFloor.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P4_StrawFire_LineBurnsOneSquarePerStep, "Dojo.P4.StrawFire.LineBurnsOneSquarePerStep", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A one-row strip lit at its left end burns exactly one square further each step, walking forward or backward. */
bool FDojo_P4_StrawFire_LineBurnsOneSquarePerStep::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	for (const bool bBackward : { false, true })
	{
		ADojoP4StrawFloor* Floor = TestWorld.SpawnActor<ADojoP4StrawFloor>();
		if (!TestNotNull(TEXT("Floor spawned"), Floor)) return false;

		Floor->bWalkBackward = bBackward;
		Floor->ResetGrid(6, 1);
		Floor->Ignite(0, 0);

		const TCHAR* Direction = bBackward ? TEXT("walking backward") : TEXT("walking forward");

		Floor->Step();
		TestEqual(FString::Printf(TEXT("After one step the lit square is ash, %s"), Direction), Floor->GetSquare(0, 0), EDojoP4StrawState::ESS_Ash);
		TestEqual(FString::Printf(TEXT("After one step its neighbor burns, %s"), Direction), Floor->GetSquare(1, 0), EDojoP4StrawState::ESS_Burning);
		TestEqual(FString::Printf(TEXT("After one step the fire has gone no further, %s"), Direction), Floor->GetSquare(2, 0), EDojoP4StrawState::ESS_Straw);

		Floor->Step();
		Floor->Step();
		Floor->Step();
		TestEqual(FString::Printf(TEXT("After four steps square 4 burns, %s"), Direction), Floor->GetSquare(4, 0), EDojoP4StrawState::ESS_Burning);
		TestEqual(FString::Printf(TEXT("After four steps square 5 is still straw, %s"), Direction), Floor->GetSquare(5, 0), EDojoP4StrawState::ESS_Straw);
		TestEqual(FString::Printf(TEXT("Exactly one square burns, %s"), Direction), Floor->CountBurning(), 1);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P4_StrawFire_SameFireEitherWay, "Dojo.P4.StrawFire.SameFireEitherWay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two fires on a 7 by 5 floor, stepped three times walking forward and walking backward, leave identical floors. */
bool FDojo_P4_StrawFire_SameFireEitherWay::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP4StrawFloor* Forward = TestWorld.SpawnActor<ADojoP4StrawFloor>();
	ADojoP4StrawFloor* Backward = TestWorld.SpawnActor<ADojoP4StrawFloor>();
	if (!TestNotNull(TEXT("Floors spawned"), Forward) || !TestNotNull(TEXT("Floors spawned"), Backward)) return false;

	Backward->bWalkBackward = true;

	for (ADojoP4StrawFloor* Floor : { Forward, Backward })
	{
		Floor->ResetGrid(7, 5);
		Floor->Ignite(3, 2);
		Floor->Ignite(0, 4);
		Floor->Step();
		Floor->Step();
		Floor->Step();
	}

	int32 Differences = 0;
	for (int32 Y = 0; Y < 5; ++Y)
	{
		for (int32 X = 0; X < 7; ++X)
		{
			if (Forward->GetSquare(X, Y) != Backward->GetSquare(X, Y)) Differences++;
		}
	}

	TestEqual(TEXT("Walking direction changes no square"), Differences, 0);
	TestTrue(TEXT("The fire is still burning after three steps"), Forward->CountBurning() > 0);
	TestEqual(TEXT("The center fire is burning three squares to its right"), Forward->GetSquare(6, 2), EDojoP4StrawState::ESS_Burning);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P4_StrawFire_AshStaysAsh, "Dojo.P4.StrawFire.AshStaysAsh", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Ash never relights, and lighting a square off the floor changes nothing. */
bool FDojo_P4_StrawFire_AshStaysAsh::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP4StrawFloor* Floor = TestWorld.SpawnActor<ADojoP4StrawFloor>();
	if (!TestNotNull(TEXT("Floor spawned"), Floor)) return false;

	Floor->ResetGrid(3, 1);
	Floor->Ignite(1, 0);
	Floor->Ignite(9, 9);
	Floor->Step();
	Floor->Ignite(1, 0);

	TestEqual(TEXT("The burned square stays ash"), Floor->GetSquare(1, 0), EDojoP4StrawState::ESS_Ash);
	TestEqual(TEXT("Both neighbors caught"), Floor->CountBurning(), 2);

	return true;
}

#endif
```

# Hints

- Two lines are missing. One goes inside the loop and decides which array receives the new state; the other goes after the loop.
- Inside the loop, the result of NextStateOf belongs in NextSquares at the same index. After the loop, exchange the two arrays so the one you built becomes Squares.
- `Swap` for two arrays is declared in `Templates/UnrealTemplate.h`; it moves the arrays' storage, so no square is copied.

# Rubric

- Every rule reads only Squares, the finished floor, during a step.
- The step writes only into NextSquares and swaps the two arrays once, after the walk.
- The result is identical walking forward and backward, and a strip burns exactly one square per step.
- The swap exchanges the arrays without copying them square by square.
- Grid size and step interval are editable properties, and play advances the fire on a timer rather than in Tick.

# Alternative

The step could instead copy `Squares` into `NextSquares` at the start, change only the squares that change, and copy back, or skip the second array and collect a list of changes to apply after the walk. A change list is cheaper when a few squares change in a huge floor, and it is the same idea: nothing is written to the floor everyone reads until the walk is done. The full second array is simplest to read and costs one extra floor of memory; on a 12 by 8 floor that is 96 bytes.

# Parsons

```yaml
- id: straw-step
  prompt: Put the heart of Step in order.
  lines:
    - "	NextSquares.SetNum(Squares.Num());"
    - "	for (int32 Index = 0; Index < Squares.Num(); ++Index)"
    - "	{"
    - "		NextSquares[Index] = NextStateOf(Index);"
    - "	}"
    - "	Swap(Squares, NextSquares);"
  distractors:
    - line: "		Squares[Index] = NextStateOf(Index);"
      mistake: Writing into the floor being read lets a square changed earlier in the walk decide what its neighbor becomes in the same step.
```
