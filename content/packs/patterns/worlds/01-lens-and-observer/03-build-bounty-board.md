---
id: p1-bounty-board
title: A bounty board that hears every fall
order: 3
kind: build
scaffold: worked
difficulty: 2
patterns: [observer]
skills: [delegates, observer]
terms: [multicast-delegate, broadcast, unbinding-delegates, endplay, beginplay, tobjectptr, isvalid]
prerequisites: [p1-multicast-delegates]
xp: 50
estimatedMinutes: 15
concepts:
  - The announcer fires a native multicast delegate with Broadcast and never learns who listens
  - The listener binds itself with AddUObject and removes its bindings in EndPlay
---

# Brief

When you press Play and run `ke * TakeHit` three times, the board above the arena counts 1 / 3, 2 / 3, and then reads BOUNTY DONE, while the foes themselves know nothing about the board.

Two actors, most of their code written for you. `ADojoP1TrainingFoe` falls after `HitsToDefeat` hits. `ADojoP1BountyBoard` holds a list of foes a designer picked and counts how many have fallen. First read the marked lines and say in a sentence why each one is there. Then fill the two gaps:

1. In `TakeHit`, the hit that knocks the foe down announces it: fire `OnDefeated` with this foe.
2. In the board's `BeginPlay`, sign the board up for each listed foe's `OnDefeated`, with `HandleFoeDefeated` as the function to call.

Dependency direction: the board depends on the foes. The board's source file includes the foe's header and binds itself; the foe's files never mention the board. A second board, a crowd, or a scoreboard can listen to the same foes later without one line of the foe changing.

Naive first: you could give the foe a pointer to the board and call `Board->CountDefeat()` from `TakeHit`. It works for one board. Then a designer places a second board for a side bounty, and the foe needs a list of boards; then the crowd wants to cheer, and the foe needs a crowd pointer. The delegate is the version where those changes never reach the foe.

## See it in the editor

Place three `DojoP1TrainingFoe` actors and set their Hits To Defeat to 1, 2, and 3. Place one `DojoP1BountyBoard`, and in its Details panel add the three foes to Foes with the eyedropper. Press Play: the board reads 0 / 3 and each foe shows its hits left. Open the console and run `ke * TakeHit` (every foe takes one hit): the first foe reads DOWN and the board 1 / 3. Run it again: 2 / 3. Once more: BOUNTY DONE. A fourth run changes nothing, because fallen foes ignore hits and announce only once.

# Files

## DojoP1TrainingFoe.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1TrainingFoe.generated.h"

class ADojoP1TrainingFoe;
class UTextRenderComponent;

/** Fired once when a foe falls; carries the foe so a listener watching several can tell them apart. */
DECLARE_MULTICAST_DELEGATE_OneParam(FDojoP1OnFoeDefeated, ADojoP1TrainingFoe*); // @explain: The macro declares a new delegate type whose bound functions take one foe pointer; it must come before the class that holds one.

/** An arena foe that falls after enough hits and announces it to whoever listens. */
UCLASS()
class ADojoP1TrainingFoe : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1TrainingFoe();

	/** Floating text that shows the hits left, or DOWN. */
	UPROPERTY(VisibleAnywhere, Category = "Foe")
	TObjectPtr<UTextRenderComponent> Label;

	/** Hits that knock this foe down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Foe", meta = (ClampMin = "1"))
	int32 HitsToDefeat = 1;

	/** Counts one hit; the hit that knocks the foe down also announces the defeat. A fallen foe ignores hits. */
	UFUNCTION(BlueprintCallable, Category = "Foe")
	void TakeHit();

	/** True once the foe has taken HitsToDefeat hits. */
	UFUNCTION(BlueprintPure, Category = "Foe")
	bool IsDefeated() const;

	/** Fired once, after the foe falls. C++ listeners bind with AddUObject. */
	FDojoP1OnFoeDefeated OnDefeated; // @explain: A native multicast delegate is not reflected, so it needs no UPROPERTY; it is only a list of callbacks the foe can fire.

protected:
	/** Shows the starting hit count on the label. */
	virtual void BeginPlay() override;

private:
	/** Writes the hits left, or DOWN, into the label. */
	void RefreshLabel();

	int32 HitsTaken = 0;
};
```

## DojoP1TrainingFoe.cpp

```cpp
#include "DojoP1TrainingFoe.h"

#include "Components/TextRenderComponent.h"

ADojoP1TrainingFoe::ADojoP1TrainingFoe()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1TrainingFoe::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP1TrainingFoe::TakeHit()
{
	if (IsDefeated()) return;

	HitsTaken++;
	RefreshLabel();

	// Your code: if this hit knocked the foe down, tell every listener, passing this foe.
}

bool ADojoP1TrainingFoe::IsDefeated() const
{
	return HitsTaken >= HitsToDefeat;
}

void ADojoP1TrainingFoe::RefreshLabel()
{
	const FText Text = IsDefeated() ? FText::FromString(TEXT("DOWN")) : FText::AsNumber(HitsToDefeat - HitsTaken);
	Label->SetText(Text);
}
```

## DojoP1BountyBoard.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1BountyBoard.generated.h"

class ADojoP1TrainingFoe;
class UTextRenderComponent;

/** Counts defeats among the foes a designer listed and shows the bounty's progress. */
UCLASS()
class ADojoP1BountyBoard : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1BountyBoard();

	/** Floating text that shows defeats heard out of defeats needed. */
	UPROPERTY(VisibleAnywhere, Category = "Bounty")
	TObjectPtr<UTextRenderComponent> Label;

	/** The foes this board listens to, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Bounty")
	TArray<TObjectPtr<ADojoP1TrainingFoe>> Foes;

	/** Defeats that complete the bounty. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Bounty", meta = (ClampMin = "1"))
	int32 DefeatsNeeded = 3;

	/** Defeats this board has heard so far. */
	UFUNCTION(BlueprintPure, Category = "Bounty")
	int32 GetDefeatsHeard() const;

	/** True once DefeatsNeeded defeats have been heard. */
	UFUNCTION(BlueprintPure, Category = "Bounty")
	bool IsBountyDone() const;

protected:
	/** Starts listening to every listed foe and shows the starting count. */
	virtual void BeginPlay() override;

	/** Stops listening to every listed foe, since the foes may outlive the board. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Counts one defeat and refreshes the label. */
	void HandleFoeDefeated(ADojoP1TrainingFoe* Foe);

	/** Writes the progress, or BOUNTY DONE, into the label. */
	void RefreshLabel();

	int32 DefeatsHeard = 0;
};
```

## DojoP1BountyBoard.cpp

```cpp
#include "DojoP1BountyBoard.h"

#include "Components/TextRenderComponent.h"
#include "DojoP1TrainingFoe.h" // @explain: The board depends on the foe, so it includes the foe; the foe never includes the board.

ADojoP1BountyBoard::ADojoP1BountyBoard()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1BountyBoard::BeginPlay()
{
	Super::BeginPlay();

	for (ADojoP1TrainingFoe* Foe : Foes)
	{
		if (!IsValid(Foe)) continue; // @explain: A designer can leave an empty slot in the list, and binding through a null pointer would crash.

		// Your code: bind HandleFoeDefeated on this board to the foe's OnDefeated.
	}

	RefreshLabel();
}

void ADojoP1BountyBoard::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoP1TrainingFoe* Foe : Foes)
	{
		if (IsValid(Foe)) Foe->OnDefeated.RemoveAll(this); // @explain: Foes can outlive the board, so the board removes every binding it owns before it goes.
	}

	Super::EndPlay(EndPlayReason);
}

int32 ADojoP1BountyBoard::GetDefeatsHeard() const
{
	return DefeatsHeard;
}

bool ADojoP1BountyBoard::IsBountyDone() const
{
	return DefeatsHeard >= DefeatsNeeded;
}

void ADojoP1BountyBoard::HandleFoeDefeated(ADojoP1TrainingFoe* Foe)
{
	DefeatsHeard++;
	RefreshLabel();
}

void ADojoP1BountyBoard::RefreshLabel()
{
	const FString Text = IsBountyDone() ? FString(TEXT("BOUNTY DONE")) : FString::Printf(TEXT("%d / %d"), DefeatsHeard, DefeatsNeeded);
	Label->SetText(FText::FromString(Text));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p1-bounty-board/DojoP1BountyBoard.h"
#include "Quests/p1-bounty-board/DojoP1TrainingFoe.h"
#include "Support/DojoTestWorld.h"

namespace DojoP1BountyBoardTest
{
	/** Spawns a foe that falls after the given number of hits. */
	ADojoP1TrainingFoe* SpawnFoe(FDojoTestWorld& TestWorld, int32 HitsToDefeat)
	{
		ADojoP1TrainingFoe* Foe = TestWorld.SpawnActor<ADojoP1TrainingFoe>();
		if (Foe) Foe->HitsToDefeat = HitsToDefeat;
		return Foe;
	}

	/** Spawns a board the way a level does: the foe list and the target are filled in before BeginPlay runs. */
	ADojoP1BountyBoard* SpawnBoard(FDojoTestWorld& TestWorld, const TArray<ADojoP1TrainingFoe*>& Foes, int32 DefeatsNeeded)
	{
		ADojoP1BountyBoard* Board = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP1BountyBoard>(ADojoP1BountyBoard::StaticClass(), FTransform::Identity);
		if (!Board) return nullptr;

		for (ADojoP1TrainingFoe* Foe : Foes) Board->Foes.Add(Foe);
		Board->DefeatsNeeded = DefeatsNeeded;
		Board->FinishSpawning(FTransform::Identity);
		return Board;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P1_BountyBoard_CountsEachFallOnce, "Dojo.P1.BountyBoard.CountsEachFallOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Three foes, an empty slot, and two boards on the same foe: each fall is heard once by every board that listens. */
bool FDojo_P1_BountyBoard_CountsEachFallOnce::RunTest(const FString& Parameters)
{
	using namespace DojoP1BountyBoardTest;

	FDojoTestWorld TestWorld;

	ADojoP1TrainingFoe* Quick = SpawnFoe(TestWorld, 1);
	ADojoP1TrainingFoe* Steady = SpawnFoe(TestWorld, 1);
	ADojoP1TrainingFoe* Tough = SpawnFoe(TestWorld, 2);
	if (!TestNotNull(TEXT("Foes spawned"), Quick) || !TestNotNull(TEXT("Foes spawned"), Steady) || !TestNotNull(TEXT("Foes spawned"), Tough)) return false;

	ADojoP1BountyBoard* Board = SpawnBoard(TestWorld, { Quick, nullptr, Steady, Tough }, 3);
	ADojoP1BountyBoard* SideBoard = SpawnBoard(TestWorld, { Quick }, 1);
	if (!TestNotNull(TEXT("Boards spawned"), Board) || !TestNotNull(TEXT("Boards spawned"), SideBoard)) return false;
	if (!TestNotNull(TEXT("Board has a label"), Board->Label.Get())) return false;

	TestEqual(TEXT("Label reads 0 / 3 at the start"), Board->Label->Text.ToString(), FString(TEXT("0 / 3")));

	Quick->TakeHit();
	TestEqual(TEXT("The board heard the first fall"), Board->GetDefeatsHeard(), 1);
	TestEqual(TEXT("Label reads 1 / 3"), Board->Label->Text.ToString(), FString(TEXT("1 / 3")));
	TestTrue(TEXT("A second board on the same foe heard it too"), SideBoard->IsBountyDone());

	Quick->TakeHit();
	TestEqual(TEXT("A fallen foe announces only once"), Board->GetDefeatsHeard(), 1);

	Steady->TakeHit();
	Tough->TakeHit();
	TestEqual(TEXT("A foe that is still standing announces nothing"), Board->GetDefeatsHeard(), 2);

	Tough->TakeHit();
	TestTrue(TEXT("Three falls complete the bounty"), Board->IsBountyDone());
	TestEqual(TEXT("Label reads BOUNTY DONE"), Board->Label->Text.ToString(), FString(TEXT("BOUNTY DONE")));
	TestEqual(TEXT("The side board heard only its own foe"), SideBoard->GetDefeatsHeard(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P1_BountyBoard_LeavesOnEndPlay, "Dojo.P1.BountyBoard.LeavesOnEndPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A board binds to its foes, then is destroyed while the foes live on: no binding may be left behind. */
bool FDojo_P1_BountyBoard_LeavesOnEndPlay::RunTest(const FString& Parameters)
{
	using namespace DojoP1BountyBoardTest;

	FDojoTestWorld TestWorld;

	ADojoP1TrainingFoe* First = SpawnFoe(TestWorld, 1);
	ADojoP1TrainingFoe* Second = SpawnFoe(TestWorld, 1);
	if (!TestNotNull(TEXT("Foes spawned"), First) || !TestNotNull(TEXT("Foes spawned"), Second)) return false;

	ADojoP1BountyBoard* Board = SpawnBoard(TestWorld, { First, Second }, 2);
	if (!TestNotNull(TEXT("Board spawned"), Board)) return false;

	TestTrue(TEXT("The board signed up for the first foe"), First->OnDefeated.IsBoundToObject(Board));
	TestTrue(TEXT("The board signed up for the second foe"), Second->OnDefeated.IsBoundToObject(Board));

	Board->Destroy();

	TestFalse(TEXT("No binding left on the first foe"), First->OnDefeated.IsBound());
	TestFalse(TEXT("No binding left on the second foe"), Second->OnDefeated.IsBound());

	First->TakeHit();
	TestTrue(TEXT("A foe falls fine with nobody listening"), First->IsDefeated());

	return true;
}

#endif
```

# Hints

- One gap is on the side that knows something happened, the other on the side that wants to hear it; look at how EndPlay talks to the same member for the shape of the second.
- The announcing side calls the delegate's fire function with the foe itself; the listening side adds a binding that names this object and a pointer to its own member function.
- The member functions you need are declared on the native multicast delegate type in `Delegates/DelegateSignatureImpl.inl`; one of them is named after binding to a UObject.

# Rubric

- TakeHit fires OnDefeated once, on the hit that knocks the foe down, after the hit is counted.
- The board binds with AddUObject in BeginPlay and skips empty slots.
- The board removes its bindings in EndPlay, so a destroyed board leaves nothing on the foes.
- Dependency direction: the board includes the foe's header; the foe's files never mention the board.
- The defeat count lives in the board, and the bounty target comes from the editable DefeatsNeeded property.
- Nothing ticks; the board reacts only when a foe announces.

# Alternative

The board could bind with `AddWeakLambda(this, [this](ADojoP1TrainingFoe* Foe) { ... })` and keep the reaction next to the bind, with no separate handler function. That is shorter for a two-line reaction and still skips the board once it is gone. The cost is that `RemoveAll(this)` is then the only clean way out, and a long lambda hides the reaction from anyone reading the class header. A named handler shows up in the header as part of what the board does, which is why the starter uses one.

# Parsons

```yaml
- id: foe-take-hit
  prompt: Put TakeHit in order so the foe announces only the hit that knocks it down.
  lines:
    - "void ADojoP1TrainingFoe::TakeHit()"
    - "{"
    - "	if (IsDefeated()) return;"
    - "	HitsTaken++;"
    - "	RefreshLabel();"
    - "	if (IsDefeated()) OnDefeated.Broadcast(this);"
    - "}"
  distractors:
    - line: "	OnDefeated.Broadcast(this);"
      mistake: Without the check, every hit announces a defeat, so a foe with three hits to go would be counted three times.
- id: board-end-play
  prompt: Put the board's EndPlay in order.
  lines:
    - "void ADojoP1BountyBoard::EndPlay(const EEndPlayReason::Type EndPlayReason)"
    - "{"
    - "	for (ADojoP1TrainingFoe* Foe : Foes)"
    - "	{"
    - "		if (IsValid(Foe)) Foe->OnDefeated.RemoveAll(this);"
    - "	}"
    - "	Super::EndPlay(EndPlayReason);"
    - "}"
  distractors:
    - line: "		if (IsValid(Foe)) Foe->OnDefeated.Clear();"
      mistake: Clear removes every listener on the foe, including other boards that are still alive; a listener removes only its own bindings.
```
