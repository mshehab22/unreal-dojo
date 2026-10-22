---
id: p7-prize-kiosk
title: A prize kiosk with one mode at a time
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [state]
skills: [state]
terms: [uenum, ufunction, timer-manager, finite-state-machine]
prerequisites: [p7-flags-to-modes]
xp: 50
estimatedMinutes: 15
concepts:
  - One enum field holds the current mode, so impossible combinations cannot be stored
  - Each input switches on the mode first, and inputs a mode has no rule for are ignored
  - Work that must happen on entering a mode lives in one place, run on every way in
---

# Brief

When you press Play and run `ke * InsertToken`, `ke * Choose`, then wait, the kiosk's label goes from Insert Token (3 left) to Choose Prize to Dispensing and back to Insert Token (2 left), and after the last prize it reads Sold Out and ignores every token.

The arena's prize kiosk has four modes, and the same button means different things in each. A token starts a choice when the kiosk is idle, but does nothing while it is dispensing or sold out. Choosing only works while a choice is open. `ADojoP7PrizeKiosk` keeps one field, `State`, of the enum `EDojoP7KioskState`. Every input switches on it first, and the `default` case ignores the input. Entering Dispensing always starts the drop timer, in one place, `SetState`, whichever input caused it.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap in `FinishDispensing`: hand out one prize (one less in stock, one more given), then go back to Idle, or to OutOfStock if that was the last prize.

Naive first: always go back to Idle. Run the tests and see what a sold-out kiosk does with the next token.

## See it in the editor

Place a `DojoP7PrizeKiosk` with Stock 2 in a map with no other kiosks, press Play, and open the console. Run `ke * Choose`: nothing happens, because no token is in. Run `ke * InsertToken`, then `ke * Choose`: the label reads Dispensing, and a second and a half later Insert Token (1 left). Do it again: Sold Out (0 left). Now `ke * InsertToken` changes nothing. Run `ke * Restock 3`: Insert Token (3 left).

# Files

## DojoP7PrizeKiosk.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP7PrizeKiosk.generated.h"

class UTextRenderComponent;

/** The one thing the prize kiosk is doing right now. */
UENUM(BlueprintType)
enum class EDojoP7KioskState : uint8
{
	EKS_Idle UMETA(DisplayName = "Insert Token"),
	EKS_Selecting UMETA(DisplayName = "Choose Prize"),
	EKS_Dispensing UMETA(DisplayName = "Dispensing"),
	EKS_OutOfStock UMETA(DisplayName = "Sold Out")
};

/** A prize kiosk by the arena gate whose every input means something different in each of its four modes. */
UCLASS()
class ADojoP7PrizeKiosk : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP7PrizeKiosk();

	/** Floating text that shows the kiosk's mode and stock. */
	UPROPERTY(VisibleAnywhere, Category = "Kiosk")
	TObjectPtr<UTextRenderComponent> Label;

	/** Prizes inside the kiosk. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Kiosk", meta = (ClampMin = "0"))
	int32 Stock = 3;

	/** Seconds a prize takes to drop during play. */
	UPROPERTY(EditAnywhere, Category = "Kiosk", meta = (ClampMin = "0.1"))
	float DispenseSeconds = 1.5f;

	/** A token goes in: starts a choice when idle; ignored in every other mode. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void InsertToken();

	/** The player picks a prize: starts dispensing while choosing; ignored otherwise. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void Choose();

	/** The player backs out: refunds the token while choosing; ignored otherwise. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void Cancel();

	/** The prize has dropped: hands it out and returns to idle, or to sold out when the last one is gone. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void FinishDispensing();

	/** Adds prizes; a sold-out kiosk opens again. */
	UFUNCTION(BlueprintCallable, Category = "Kiosk")
	void Restock(int32 Amount);

	/** The kiosk's current mode. */
	UFUNCTION(BlueprintPure, Category = "Kiosk")
	EDojoP7KioskState GetState() const;

	/** Prizes handed out so far. */
	UFUNCTION(BlueprintPure, Category = "Kiosk")
	int32 GetPrizesGiven() const;

	/** Tokens given back after a cancel. */
	UFUNCTION(BlueprintPure, Category = "Kiosk")
	int32 GetTokensRefunded() const;

protected:
	/** Shows the starting mode. */
	virtual void BeginPlay() override;

private:
	/** Switches to a new mode, runs that mode's entry action, and refreshes the label. */
	void SetState(EDojoP7KioskState NewState);

	/** Writes the mode's display name and the stock into the label. */
	void RefreshLabel();

	/** The kiosk's one current mode. */
	UPROPERTY(VisibleInstanceOnly, Category = "Kiosk")
	EDojoP7KioskState State = EDojoP7KioskState::EKS_Idle; // @explain: One field holds the mode, so the kiosk can never be choosing and sold out at the same time.

	int32 PrizesGiven = 0;
	int32 TokensRefunded = 0;
	FTimerHandle DispenseTimer;
};
```

## DojoP7PrizeKiosk.cpp

```cpp
#include "DojoP7PrizeKiosk.h"

#include "Components/TextRenderComponent.h"
#include "TimerManager.h"

ADojoP7PrizeKiosk::ADojoP7PrizeKiosk()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP7PrizeKiosk::BeginPlay()
{
	Super::BeginPlay();

	SetState(Stock > 0 ? EDojoP7KioskState::EKS_Idle : EDojoP7KioskState::EKS_OutOfStock);
}

void ADojoP7PrizeKiosk::InsertToken()
{
	switch (State) // @explain: Each input asks the mode first, so everything the token means in each mode sits in one place.
	{
	case EDojoP7KioskState::EKS_Idle:
		SetState(EDojoP7KioskState::EKS_Selecting);
		break;
	default: // @explain: In any mode with no rule for this input, the input is simply ignored.
		break;
	}
}

void ADojoP7PrizeKiosk::Choose()
{
	switch (State)
	{
	case EDojoP7KioskState::EKS_Selecting:
		SetState(EDojoP7KioskState::EKS_Dispensing);
		break;
	default:
		break;
	}
}

void ADojoP7PrizeKiosk::Cancel()
{
	switch (State)
	{
	case EDojoP7KioskState::EKS_Selecting:
		TokensRefunded++;
		SetState(EDojoP7KioskState::EKS_Idle);
		break;
	default:
		break;
	}
}

void ADojoP7PrizeKiosk::FinishDispensing()
{
	switch (State)
	{
	case EDojoP7KioskState::EKS_Dispensing:
		// Your code: hand out one prize, then move to Idle, or to OutOfStock when that was the last one.
		break;
	default:
		break;
	}
}

void ADojoP7PrizeKiosk::Restock(int32 Amount)
{
	if (Amount <= 0) return;

	Stock += Amount;

	if (State == EDojoP7KioskState::EKS_OutOfStock) SetState(EDojoP7KioskState::EKS_Idle);
	else RefreshLabel();
}

EDojoP7KioskState ADojoP7PrizeKiosk::GetState() const
{
	return State;
}

int32 ADojoP7PrizeKiosk::GetPrizesGiven() const
{
	return PrizesGiven;
}

int32 ADojoP7PrizeKiosk::GetTokensRefunded() const
{
	return TokensRefunded;
}

void ADojoP7PrizeKiosk::SetState(EDojoP7KioskState NewState)
{
	State = NewState;

	// Entry action: dispensing always starts the drop timer, whichever input led here.
	if (State == EDojoP7KioskState::EKS_Dispensing) // @explain: The entry action lives with the mode, so every way into Dispensing starts the drop timer the same way.
	{
		GetWorldTimerManager().SetTimer(DispenseTimer, this, &ADojoP7PrizeKiosk::FinishDispensing, DispenseSeconds, false);
	}

	RefreshLabel();
}

void ADojoP7PrizeKiosk::RefreshLabel()
{
	const FText ModeName = StaticEnum<EDojoP7KioskState>()->GetDisplayNameTextByValue(static_cast<int64>(State)); // @explain: Reflection turns the mode into its display name, so the label needs no switch of its own.
	Label->SetText(FText::FromString(FString::Printf(TEXT("%s (%d left)"), *ModeName.ToString(), Stock)));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p7-prize-kiosk/DojoP7PrizeKiosk.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P7_PrizeKiosk_OnePurchase, "Dojo.P7.PrizeKiosk.OnePurchase", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A token, a choice, and the drop: the kiosk walks Idle, Selecting, Dispensing, Idle, and ignores a token while dispensing. */
bool FDojo_P7_PrizeKiosk_OnePurchase::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP7PrizeKiosk* Kiosk = TestWorld.SpawnActor<ADojoP7PrizeKiosk>();
	if (!TestNotNull(TEXT("Kiosk spawned"), Kiosk) || !TestNotNull(TEXT("Kiosk has a label"), Kiosk->Label.Get())) return false;

	TestEqual(TEXT("The kiosk starts idle"), Kiosk->GetState(), EDojoP7KioskState::EKS_Idle);

	Kiosk->InsertToken();
	TestEqual(TEXT("A token opens a choice"), Kiosk->GetState(), EDojoP7KioskState::EKS_Selecting);

	Kiosk->Choose();
	TestEqual(TEXT("Choosing starts the drop"), Kiosk->GetState(), EDojoP7KioskState::EKS_Dispensing);

	Kiosk->InsertToken();
	TestEqual(TEXT("A token while dispensing is ignored"), Kiosk->GetState(), EDojoP7KioskState::EKS_Dispensing);

	Kiosk->FinishDispensing();
	TestEqual(TEXT("After the drop the kiosk is idle again"), Kiosk->GetState(), EDojoP7KioskState::EKS_Idle);
	TestEqual(TEXT("One prize was given"), Kiosk->GetPrizesGiven(), 1);
	TestEqual(TEXT("The label shows the mode and the stock"), Kiosk->Label->Text.ToString(), FString(TEXT("Insert Token (2 left)")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P7_PrizeKiosk_LastPrizeSellsOut, "Dojo.P7.PrizeKiosk.LastPrizeSellsOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Handing out the last prize leaves the kiosk sold out, deaf to tokens, until it is restocked. */
bool FDojo_P7_PrizeKiosk_LastPrizeSellsOut::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP7PrizeKiosk* Kiosk = TestWorld.SpawnActor<ADojoP7PrizeKiosk>();
	if (!TestNotNull(TEXT("Kiosk spawned"), Kiosk)) return false;

	Kiosk->Stock = 1;
	Kiosk->InsertToken();
	Kiosk->Choose();
	Kiosk->FinishDispensing();
	TestEqual(TEXT("The last prize sells the kiosk out"), Kiosk->GetState(), EDojoP7KioskState::EKS_OutOfStock);

	Kiosk->InsertToken();
	TestEqual(TEXT("A sold-out kiosk ignores tokens"), Kiosk->GetState(), EDojoP7KioskState::EKS_OutOfStock);

	Kiosk->Restock(2);
	TestEqual(TEXT("Restocking opens it again"), Kiosk->GetState(), EDojoP7KioskState::EKS_Idle);

	Kiosk->InsertToken();
	TestEqual(TEXT("And it takes tokens again"), Kiosk->GetState(), EDojoP7KioskState::EKS_Selecting);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P7_PrizeKiosk_InputsWithoutARuleAreIgnored, "Dojo.P7.PrizeKiosk.InputsWithoutARuleAreIgnored", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Choosing, cancelling, and finishing do nothing while idle; cancelling a choice refunds the token. */
bool FDojo_P7_PrizeKiosk_InputsWithoutARuleAreIgnored::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP7PrizeKiosk* Kiosk = TestWorld.SpawnActor<ADojoP7PrizeKiosk>();
	if (!TestNotNull(TEXT("Kiosk spawned"), Kiosk)) return false;

	Kiosk->Choose();
	Kiosk->Cancel();
	Kiosk->FinishDispensing();
	TestEqual(TEXT("Idle ignores choose, cancel, and finish"), Kiosk->GetState(), EDojoP7KioskState::EKS_Idle);
	TestEqual(TEXT("No prize was given for nothing"), Kiosk->GetPrizesGiven(), 0);

	Kiosk->InsertToken();
	Kiosk->Cancel();
	TestEqual(TEXT("Cancelling a choice returns to idle"), Kiosk->GetState(), EDojoP7KioskState::EKS_Idle);
	TestEqual(TEXT("And refunds the token"), Kiosk->GetTokensRefunded(), 1);

	return true;
}

#endif
```

# Hints

- The gap is inside the Dispensing case only: it changes two counters and then picks the next mode.
- Pick the next mode from the stock left after this prize: none left means OutOfStock, any left means Idle. Change modes through SetState so the label and any entry action follow.
- Nothing new is needed from the engine; the ternary operator chooses between the two enum values in one line.

# Rubric

- The kiosk's mode is one enum field; no booleans describe what it is doing.
- Every input switches on the mode first, and inputs a mode has no rule for are ignored.
- FinishDispensing hands out exactly one prize and goes to OutOfStock after the last one, Idle otherwise.
- Mode changes go through SetState, where the Dispensing entry action and the label live.
- Enum values follow the project's naming rule (`EKS_` initials) and carry display names for the label.

# Alternative

The four modes could be four small state classes, each with its own InsertToken and Choose, with the kiosk keeping whichever one is current. That pays off when modes carry data of their own or grow many inputs; here every mode's rule is one or two lines and no mode keeps private data, so one enum and a switch per input is the plainer code and the easiest to read top to bottom. The ballista later in this world is the case where the class version earns its keep.

# Parsons

```yaml
- id: kiosk-choose
  prompt: Put Choose in order.
  lines:
    - "void ADojoP7PrizeKiosk::Choose()"
    - "{"
    - "	switch (State)"
    - "	{"
    - "	case EDojoP7KioskState::EKS_Selecting:"
    - "		SetState(EDojoP7KioskState::EKS_Dispensing);"
    - "		break;"
    - "	default:"
    - "		break;"
    - "	}"
    - "}"
  distractors:
    - line: "		State = EDojoP7KioskState::EKS_Dispensing;"
      mistake: Assigning the field directly skips SetState, so the drop timer never starts and the label keeps the old mode.
- id: kiosk-finish
  prompt: Put the Dispensing case of FinishDispensing in order.
  lines:
    - "	case EDojoP7KioskState::EKS_Dispensing:"
    - "		Stock--;"
    - "		PrizesGiven++;"
    - "		SetState(Stock > 0 ? EDojoP7KioskState::EKS_Idle : EDojoP7KioskState::EKS_OutOfStock);"
    - "		break;"
  distractors:
    - line: "		SetState(EDojoP7KioskState::EKS_Idle);"
      mistake: Always returning to Idle leaves an empty kiosk taking tokens it can never pay out.
```
