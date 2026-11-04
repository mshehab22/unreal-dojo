---
id: p13-door-conditions
title: Doors that open on a written rule
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [bytecode]
skills: [bytecode, data-modeling]
terms: [stack-machine, ustruct, uenum, tarray, edit-condition, blueprintpure]
prerequisites: [p13-bytecode-card, p13-potion-recipes]
xp: 110
estimatedMinutes: 30
concepts:
  - A door's condition is a list of steps a designer writes, and it must leave exactly one value
  - Comparisons and logic put back 1 for true and 0 for false
  - A condition that is not well formed is Broken, and the door stays shut whatever the stats
  - Judging a condition reads the stats and changes nothing
  - The door reuses the potions' stats; the stats know nothing about doors
---

# Brief

When you press Play with the setup below, the Treasurer's door opens for an adventurer with 12 gold and a key, stays shut for one with 12 gold and no key, and a door whose condition is broken stays shut for everyone.

`ADojoP13VaultDoor` has a `Condition`: a list of `FDojoP13CheckStep` rows, each with an `Op` and, depending on the op, a `Number` or a `Stat` of the `FDojoP13Stats` from the potion quest. The door's own machine runs the condition against an adventurer's stats on a stack of at most 8 values:

- `PushNumber` puts its number on top; `ReadStat` puts the stat's value there.
- `Equal`, `Less`, and `Greater` take two values off and put back 1 or 0. They read the way the condition is written: `ReadStat Gold, PushNumber 9, Greater` asks whether Gold is greater than 9.
- `And` and `Or` take two values off and put back 1 when both, or either, are not 0, else 0. `Not` takes one value and puts back 1 for 0 and 0 for anything else.

Yours are `Judge` and its helper `ApplyStep`. `Judge` returns `Open` when the condition ends with exactly one value and it is not 0, and `Shut` when that one value is 0. It returns `Broken` when a step needs more values than the stack holds, when a step would put a ninth value on it, or when the condition ends with no value or with more than one. It changes neither the stats nor the door, and it never crashes on a condition someone wrote badly. `TryOpen`, `Shut`, and `IsOpen` are given. The door depends on the stats; the stats know nothing about doors.

Compiles against earlier quests: p13-potion-recipes (`Quests/p13-potion-recipes/DojoP13Stats.h`).

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP13VaultDoor` and give it a Static Mesh component in the Details panel (a cube scaled to a door shape is enough) so you can see it. Fill its Condition with eight rows: Read Stat (Gold), Push Number (9), Greater, Read Stat (Keys), Push Number (0), Equal, Not, And. In the Level Blueprint, make a `DojoP13Stats` variable with Gold 12 and Keys 1, and on Begin Play call Try Open on the door with it: the door disappears. Set Keys to 0 and play again: the door stays. Delete the last row, And, and play once more: two values are left, so Judge says Broken and the door stays for everyone. Print the result of Judge to see the verdict each time.

# Files

## DojoP13CheckStep.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Quests/p13-potion-recipes/DojoP13Stats.h"
#include "DojoP13CheckStep.generated.h"

/** What one step of a door's condition does. Comparisons and logic put back 1 for true and 0 for false. */
UENUM(BlueprintType)
enum class EDojoP13CheckOp : uint8
{
	/** Puts Number on top of the stack. */
	ECO_PushNumber UMETA(DisplayName = "Push Number"),
	/** Puts the value of Stat on top of the stack. */
	ECO_ReadStat UMETA(DisplayName = "Read Stat"),
	/** Takes two values and puts back whether they are equal. */
	ECO_Equal UMETA(DisplayName = "Equal"),
	/** Takes two values and puts back whether the comparison holds. */
	ECO_Less UMETA(DisplayName = "Less"),
	/** Takes two values and puts back whether the comparison holds. */
	ECO_Greater UMETA(DisplayName = "Greater"),
	/** Takes two values and puts back whether both are true. */
	ECO_And UMETA(DisplayName = "And"),
	/** Takes two values and puts back whether either is true. */
	ECO_Or UMETA(DisplayName = "Or"),
	/** Takes one value and puts back its opposite. */
	ECO_Not UMETA(DisplayName = "Not")
};

/** One step of a door's condition, edited as a row in the Details panel. */
USTRUCT(BlueprintType)
struct FDojoP13CheckStep
{
	GENERATED_BODY()

	/** What this step does. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition")
	EDojoP13CheckOp Op = EDojoP13CheckOp::ECO_PushNumber;

	/** The number PushNumber puts on the stack. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition", meta = (EditCondition = "Op == EDojoP13CheckOp::ECO_PushNumber", EditConditionHides))
	int32 Number = 0;

	/** The stat ReadStat reads. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition", meta = (EditCondition = "Op == EDojoP13CheckOp::ECO_ReadStat", EditConditionHides))
	EDojoP13Stat Stat = EDojoP13Stat::ES_Health;
};
```

## DojoP13VaultDoor.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP13CheckStep.h"
#include "GameFramework/Actor.h"
#include "Quests/p13-potion-recipes/DojoP13Stats.h"
#include "DojoP13VaultDoor.generated.h"

/** What a door's condition says about an adventurer. */
UENUM(BlueprintType)
enum class EDojoP13Verdict : uint8
{
	/** The condition holds: the door may open. */
	EV_Open UMETA(DisplayName = "Open"),
	/** The condition does not hold: the door stays shut. */
	EV_Shut UMETA(DisplayName = "Shut"),
	/** The condition is not a well-formed script: the door stays shut whatever the stats. */
	EV_Broken UMETA(DisplayName = "Broken")
};

/** A vault door that opens only for an adventurer whose stats pass a condition a designer writes in the Details panel. Bytecode pattern. */
UCLASS()
class ADojoP13VaultDoor : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP13VaultDoor();

	/** The most values the condition's stack may hold at once. */
	static constexpr int32 StackLimit = 8;

	/** The steps that decide whether the door opens, in order; they must leave exactly one value. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Door")
	TArray<FDojoP13CheckStep> Condition;

	/** Runs the condition against Stats without changing anything. */
	UFUNCTION(BlueprintPure, Category = "Door")
	EDojoP13Verdict Judge(const FDojoP13Stats& Stats) const;

	/** Opens the door, hidden and with no collision, when the verdict for Stats is Open; true when it is open afterwards. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	bool TryOpen(const FDojoP13Stats& Stats);

	/** Closes the door again, shown and with collision. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Shut();

	/** True while the door is open. */
	UFUNCTION(BlueprintPure, Category = "Door")
	bool IsOpen() const;

private:
	/** Does one step of the condition on Stack; false when the step cannot be done. */
	bool ApplyStep(const FDojoP13CheckStep& Step, const FDojoP13Stats& Stats, TArray<int32>& Stack) const;

	/** True while the door is open. */
	bool bOpen = false;
};
```

## DojoP13VaultDoor.cpp

```cpp
#include "DojoP13VaultDoor.h"

#include "Components/SceneComponent.h"

ADojoP13VaultDoor::ADojoP13VaultDoor()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

EDojoP13Verdict ADojoP13VaultDoor::Judge(const FDojoP13Stats& Stats) const
{
	return EDojoP13Verdict::EV_Shut;
}

bool ADojoP13VaultDoor::ApplyStep(const FDojoP13CheckStep& Step, const FDojoP13Stats& Stats, TArray<int32>& Stack) const
{
	return false;
}

bool ADojoP13VaultDoor::TryOpen(const FDojoP13Stats& Stats)
{
	if (Judge(Stats) == EDojoP13Verdict::EV_Open)
	{
		bOpen = true;
		SetActorHiddenInGame(true);
		SetActorEnableCollision(false);
	}
	return bOpen;
}

void ADojoP13VaultDoor::Shut()
{
	bOpen = false;
	SetActorHiddenInGame(false);
	SetActorEnableCollision(true);
}

bool ADojoP13VaultDoor::IsOpen() const
{
	return bOpen;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p13-door-conditions/DojoP13CheckStep.h"
#include "Quests/p13-door-conditions/DojoP13VaultDoor.h"
#include "Quests/p13-potion-recipes/DojoP13Stats.h"
#include "Support/DojoTestWorld.h"

namespace DojoP13DoorTest
{
	/** A step with no number or stat. */
	FDojoP13CheckStep Step(EDojoP13CheckOp Op)
	{
		FDojoP13CheckStep Result;
		Result.Op = Op;
		return Result;
	}

	/** A step that pushes Number. */
	FDojoP13CheckStep PushStep(int32 Number)
	{
		FDojoP13CheckStep Result = Step(EDojoP13CheckOp::ECO_PushNumber);
		Result.Number = Number;
		return Result;
	}

	/** A step that reads Stat. */
	FDojoP13CheckStep ReadStep(EDojoP13Stat Stat)
	{
		FDojoP13CheckStep Result = Step(EDojoP13CheckOp::ECO_ReadStat);
		Result.Stat = Stat;
		return Result;
	}

	/** Stats with the given health, gold, and keys. */
	FDojoP13Stats MakeStats(int32 Health, int32 Gold, int32 Keys)
	{
		FDojoP13Stats Result;
		Result.Health = Health;
		Result.Stamina = 20;
		Result.Gold = Gold;
		Result.Keys = Keys;
		return Result;
	}

	/** Spawns a door with Condition. */
	ADojoP13VaultDoor* SpawnDoor(FDojoTestWorld& TestWorld, const TArray<FDojoP13CheckStep>& Condition)
	{
		ADojoP13VaultDoor* Door = TestWorld.SpawnActor<ADojoP13VaultDoor>();
		if (Door) Door->Condition = Condition;
		return Door;
	}

	/** The verdict as a word, for messages. */
	FString Say(EDojoP13Verdict Verdict)
	{
		switch (Verdict)
		{
		case EDojoP13Verdict::EV_Open: return TEXT("Open");
		case EDojoP13Verdict::EV_Shut: return TEXT("Shut");
		case EDojoP13Verdict::EV_Broken: return TEXT("Broken");
		}
		return TEXT("?");
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_DoorConditions_EqualAndLogicDecide, "Dojo.P13.DoorConditions.EqualAndLogicDecide", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Equal, And, Or, and Not decide the verdict, and TryOpen opens only on Open. */
bool FDojo_P13_DoorConditions_EqualAndLogicDecide::RunTest(const FString& Parameters)
{
	using namespace DojoP13DoorTest;

	FDojoTestWorld TestWorld;

	ADojoP13VaultDoor* KeyDoor = SpawnDoor(TestWorld, { ReadStep(EDojoP13Stat::ES_Keys), PushStep(0), Step(EDojoP13CheckOp::ECO_Equal), Step(EDojoP13CheckOp::ECO_Not) });
	if (!TestNotNull(TEXT("Key door spawned"), KeyDoor)) return false;
	TestEqual(TEXT("Keys is not 0, with a key: Open"), Say(KeyDoor->Judge(MakeStats(50, 0, 1))), FString(TEXT("Open")));
	TestEqual(TEXT("Keys is not 0, with no key: Shut"), Say(KeyDoor->Judge(MakeStats(50, 0, 0))), FString(TEXT("Shut")));

	ADojoP13VaultDoor* EitherDoor = SpawnDoor(TestWorld, {
		ReadStep(EDojoP13Stat::ES_Keys), PushStep(2), Step(EDojoP13CheckOp::ECO_Equal),
		ReadStep(EDojoP13Stat::ES_Health), PushStep(100), Step(EDojoP13CheckOp::ECO_Equal),
		Step(EDojoP13CheckOp::ECO_Or) });
	if (!TestNotNull(TEXT("Either door spawned"), EitherDoor)) return false;
	TestEqual(TEXT("Two keys or full health, with two keys: Open"), Say(EitherDoor->Judge(MakeStats(50, 0, 2))), FString(TEXT("Open")));
	TestEqual(TEXT("Two keys or full health, with full health: Open"), Say(EitherDoor->Judge(MakeStats(100, 0, 0))), FString(TEXT("Open")));
	TestEqual(TEXT("Two keys or full health, with neither: Shut"), Say(EitherDoor->Judge(MakeStats(50, 0, 0))), FString(TEXT("Shut")));

	ADojoP13VaultDoor* BothDoor = SpawnDoor(TestWorld, {
		ReadStep(EDojoP13Stat::ES_Gold), PushStep(5), Step(EDojoP13CheckOp::ECO_Equal),
		PushStep(1), ReadStep(EDojoP13Stat::ES_Keys), Step(EDojoP13CheckOp::ECO_Equal),
		Step(EDojoP13CheckOp::ECO_And) });
	if (!TestNotNull(TEXT("Both door spawned"), BothDoor)) return false;
	TestEqual(TEXT("Five gold and one key, with both: Open"), Say(BothDoor->Judge(MakeStats(50, 5, 1))), FString(TEXT("Open")));
	TestEqual(TEXT("Five gold and one key, with no key: Shut"), Say(BothDoor->Judge(MakeStats(50, 5, 0))), FString(TEXT("Shut")));

	ADojoP13VaultDoor* Always = SpawnDoor(TestWorld, { PushStep(1) });
	ADojoP13VaultDoor* Never = SpawnDoor(TestWorld, { PushStep(0) });
	if (!TestNotNull(TEXT("Always door spawned"), Always) || !TestNotNull(TEXT("Never door spawned"), Never)) return false;
	TestEqual(TEXT("A lone 1 opens"), Say(Always->Judge(MakeStats(50, 0, 0))), FString(TEXT("Open")));
	TestEqual(TEXT("A lone 0 stays shut"), Say(Never->Judge(MakeStats(50, 0, 0))), FString(TEXT("Shut")));

	ADojoP13VaultDoor* BothSet = SpawnDoor(TestWorld, { ReadStep(EDojoP13Stat::ES_Gold), ReadStep(EDojoP13Stat::ES_Keys), Step(EDojoP13CheckOp::ECO_And) });
	ADojoP13VaultDoor* NoGold = SpawnDoor(TestWorld, { ReadStep(EDojoP13Stat::ES_Gold), Step(EDojoP13CheckOp::ECO_Not) });
	ADojoP13VaultDoor* EitherIsOne = SpawnDoor(TestWorld, { ReadStep(EDojoP13Stat::ES_Gold), ReadStep(EDojoP13Stat::ES_Keys), Step(EDojoP13CheckOp::ECO_Or), PushStep(1), Step(EDojoP13CheckOp::ECO_Equal) });
	if (!TestNotNull(TEXT("Both-set door spawned"), BothSet) || !TestNotNull(TEXT("No-gold door spawned"), NoGold) || !TestNotNull(TEXT("Either door spawned"), EitherIsOne)) return false;
	TestEqual(TEXT("Any value but 0 is true: 2 gold and 1 key joined by And open"), Say(BothSet->Judge(MakeStats(50, 2, 1))), FString(TEXT("Open")));
	TestEqual(TEXT("Not of 12 gold is 0, so the door stays shut"), Say(NoGold->Judge(MakeStats(50, 12, 0))), FString(TEXT("Shut")));
	TestEqual(TEXT("Not of 0 gold is 1, so the door opens"), Say(NoGold->Judge(MakeStats(50, 0, 0))), FString(TEXT("Open")));
	TestEqual(TEXT("Or puts back exactly 1, even for 3 gold and 2 keys"), Say(EitherIsOne->Judge(MakeStats(50, 3, 2))), FString(TEXT("Open")));

	TestFalse(TEXT("TryOpen with no key leaves the key door shut"), KeyDoor->TryOpen(MakeStats(50, 0, 0)));
	TestFalse(TEXT("And shown"), KeyDoor->IsHidden());
	TestTrue(TEXT("TryOpen with a key opens it"), KeyDoor->TryOpen(MakeStats(50, 0, 1)));
	TestTrue(TEXT("It is open"), KeyDoor->IsOpen());
	TestTrue(TEXT("And hidden"), KeyDoor->IsHidden());
	TestFalse(TEXT("With no collision"), KeyDoor->GetActorEnableCollision());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_DoorConditions_BrokenConditionsStayShut, "Dojo.P13.DoorConditions.BrokenConditionsStayShut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Conditions that run out of values, overfill the stack, or leave anything but one value are Broken, and the door stays shut. */
bool FDojo_P13_DoorConditions_BrokenConditionsStayShut::RunTest(const FString& Parameters)
{
	using namespace DojoP13DoorTest;

	FDojoTestWorld TestWorld;
	const FDojoP13Stats Rich = MakeStats(100, 50, 3);

	ADojoP13VaultDoor* Door = SpawnDoor(TestWorld, {});
	if (!TestNotNull(TEXT("Door spawned"), Door)) return false;
	TestEqual(TEXT("An empty condition is Broken"), Say(Door->Judge(Rich)), FString(TEXT("Broken")));

	Door->Condition = { Step(EDojoP13CheckOp::ECO_Not) };
	TestEqual(TEXT("Not with nothing on the stack is Broken"), Say(Door->Judge(Rich)), FString(TEXT("Broken")));

	Door->Condition = { PushStep(1), Step(EDojoP13CheckOp::ECO_And) };
	TestEqual(TEXT("And with one value is Broken"), Say(Door->Judge(Rich)), FString(TEXT("Broken")));

	Door->Condition = { PushStep(1), PushStep(1) };
	TestEqual(TEXT("Two values left at the end is Broken"), Say(Door->Judge(Rich)), FString(TEXT("Broken")));

	TArray<FDojoP13CheckStep> Eight;
	for (int32 Index = 0; Index < ADojoP13VaultDoor::StackLimit; Index++) Eight.Add(PushStep(1));
	TArray<FDojoP13CheckStep> EightAndJoined = Eight;
	for (int32 Index = 1; Index < ADojoP13VaultDoor::StackLimit; Index++) EightAndJoined.Add(Step(EDojoP13CheckOp::ECO_And));
	Door->Condition = EightAndJoined;
	TestEqual(TEXT("Eight values joined by And fit and open"), Say(Door->Judge(Rich)), FString(TEXT("Open")));

	TArray<FDojoP13CheckStep> NineAndJoined = Eight;
	NineAndJoined.Add(PushStep(1));
	for (int32 Index = 0; Index < ADojoP13VaultDoor::StackLimit; Index++) NineAndJoined.Add(Step(EDojoP13CheckOp::ECO_And));
	Door->Condition = NineAndJoined;
	TestEqual(TEXT("A ninth value overfills the stack: Broken"), Say(Door->Judge(Rich)), FString(TEXT("Broken")));

	Door->Condition = { PushStep(1), PushStep(1) };
	TestFalse(TEXT("TryOpen on a broken condition opens nothing"), Door->TryOpen(Rich));
	TestFalse(TEXT("The door is shut"), Door->IsOpen());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_DoorConditions_GreaterAndLessReadAsWritten, "Dojo.P13.DoorConditions.GreaterAndLessReadAsWritten", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The Treasurer's door, Gold greater than 9 and Keys not 0, over four cases, and a low-health door over three. */
bool FDojo_P13_DoorConditions_GreaterAndLessReadAsWritten::RunTest(const FString& Parameters)
{
	using namespace DojoP13DoorTest;

	FDojoTestWorld TestWorld;

	ADojoP13VaultDoor* Treasurer = SpawnDoor(TestWorld, {
		ReadStep(EDojoP13Stat::ES_Gold), PushStep(9), Step(EDojoP13CheckOp::ECO_Greater),
		ReadStep(EDojoP13Stat::ES_Keys), PushStep(0), Step(EDojoP13CheckOp::ECO_Equal), Step(EDojoP13CheckOp::ECO_Not),
		Step(EDojoP13CheckOp::ECO_And) });
	if (!TestNotNull(TEXT("Treasurer's door spawned"), Treasurer)) return false;

	TestEqual(TEXT("Gold 12 and a key: Gold > 9 holds, so Open"), Say(Treasurer->Judge(MakeStats(50, 12, 1))), FString(TEXT("Open")));
	TestEqual(TEXT("Gold 12 and no key: Shut"), Say(Treasurer->Judge(MakeStats(50, 12, 0))), FString(TEXT("Shut")));
	TestEqual(TEXT("Gold 5 and a key: Gold > 9 fails, so Shut"), Say(Treasurer->Judge(MakeStats(50, 5, 1))), FString(TEXT("Shut")));
	TestEqual(TEXT("Gold 9 and a key: 9 is not greater than 9, so Shut"), Say(Treasurer->Judge(MakeStats(50, 9, 1))), FString(TEXT("Shut")));

	ADojoP13VaultDoor* Mercy = SpawnDoor(TestWorld, { ReadStep(EDojoP13Stat::ES_Health), PushStep(30), Step(EDojoP13CheckOp::ECO_Less) });
	if (!TestNotNull(TEXT("Mercy door spawned"), Mercy)) return false;

	TestEqual(TEXT("Health 10: Health < 30 holds, so Open"), Say(Mercy->Judge(MakeStats(10, 0, 0))), FString(TEXT("Open")));
	TestEqual(TEXT("Health 50: Health < 30 fails, so Shut"), Say(Mercy->Judge(MakeStats(50, 0, 0))), FString(TEXT("Shut")));
	TestEqual(TEXT("Health 30: 30 is not less than 30, so Shut"), Say(Mercy->Judge(MakeStats(30, 0, 0))), FString(TEXT("Shut")));

	return true;
}

#endif
```

# Hints

- The failing test is the only one that uses `Greater` and `Less`. Read its message: in which cases did the door give the opposite answer, and what do those cases have in common?
- A stack hands back the value put on it last before the one under it. In `ReadStat Gold, PushNumber 9, Greater`, which of the two values does your first take give you, and on which side of the comparison does the condition mean it to stand?
- Name the two values by where they stand in the written condition, left and right, before you compare them. `Equal`, `And`, and `Or` give the same answer either way round, which is why only the comparisons showed it.

# Rubric

- Judge runs the condition in order on a fresh stack and returns Open when it ends with exactly one value that is not 0, and Shut when that value is 0.
- Equal, Less, Greater, And, Or, and Not give the answers the brief describes, each putting back 1 or 0.
- A step that needs more values than the stack holds, a ninth value, an empty condition, or a condition that leaves more than one value gives Broken.
- Judge changes neither the stats nor the door, and TryOpen opens the door only on Open.
- No condition, however badly written, crashes the game: the door refuses it as Broken.
- The door depends on the stats from the potion quest; the stats know nothing about doors.

# Alternative

Each door could instead be a Blueprint child with an overridable `CanOpen` function, and designers would draw the rule as a graph. That gives them the Blueprint debugger and every node the engine has, which is a real gain for a team of designers; it also means an asset per rule, and a rule that can call anything a Blueprint can call, so it is no place for a modder's file. A third choice is a fixed set of door kinds with numbers (needs N gold, needs a key), which is easier than either when the rules never combine.

# Parsons

```yaml
- id: judge
  prompt: Put Judge in order.
  lines:
    - "EDojoP13Verdict ADojoP13VaultDoor::Judge(const FDojoP13Stats& Stats) const"
    - "{"
    - "	TArray<int32> Stack;"
    - "	for (const FDojoP13CheckStep& Step : Condition)"
    - "	{"
    - "		if (!ApplyStep(Step, Stats, Stack)) return EDojoP13Verdict::EV_Broken;"
    - "	}"
    - "	if (Stack.Num() != 1) return EDojoP13Verdict::EV_Broken;"
    - "	return Stack[0] != 0 ? EDojoP13Verdict::EV_Open : EDojoP13Verdict::EV_Shut;"
    - "}"
  distractors:
    - line: "	check(Stack.Num() == 1);"
      mistake: check stops the game when a condition leaves the wrong number of values, so a designer's or modder's typo would crash the session; a badly written condition is refused as Broken.
```
