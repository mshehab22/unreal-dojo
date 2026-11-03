---
id: p13-potion-recipes
title: Potions a designer writes in Details
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [bytecode]
skills: [bytecode, data-modeling]
terms: [stack-machine, ustruct, uenum, tarray, edit-condition, uparam-ref]
prerequisites: [p13-behavior-as-data]
xp: 60
estimatedMinutes: 20
concepts:
  - A potion's effect is a list of steps in a UPROPERTY array, so a new potion needs no compile
  - A small machine runs the steps in order, passing values between them on a stack
  - A step that needs more values than the stack has, or would overfill it, is refused, and the machine gives up instead of crashing
  - The steps work on a copy of the stats, so a potion that fails part way changes nothing
  - The potion depends on the machine and the stats; neither knows potions exist
---

# Brief

When you press Play with the setup below, drinking the Second Wind potion raises Health from 50 to 90 and leaves Stamina at 20, and drinking a broken potion leaves every stat exactly as it was.

`FDojoP13Stats` holds four numbers: `Health`, `Stamina`, `Gold`, and `Keys`. `ADojoP13Potion` has a `Recipe`: a list of `FDojoP13Instruction` rows a designer fills in on the Details panel. Each row has an `Op` and, depending on the op, a `Number` or a `Stat`:

- `PushNumber` puts its number on top of the stack; `ReadStat` puts the stat's value there.
- `WriteStat` takes the top value off and stores it in its stat.
- `Add` and `Multiply` take two values off and put back their sum or product.

`FDojoP13RecipeMachine` runs a recipe. Its stack holds at most 8 values. `Drink` makes a machine and asks it to run the potion's recipe on the stats it was given. The potion depends on the machine and the stats; the machine and the stats know nothing about potions.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `Run`. It runs every step of the program in order, starting from an empty stack, and returns true. If any step fails, it stops at once and returns false, and the stats it was given are exactly as they were before, even if earlier steps wrote to them. Values still on the stack at the end are simply dropped. The same machine may be asked to run again after a failure.

## See it in the editor

Place a `DojoP13Potion`. In Details, add six rows to its Recipe: Read Stat (Health), Read Stat (Stamina), Push Number (2), Multiply, Add, Write Stat (Health). Notice each row shows a Number or a Stat field only when its Op uses one. In the Level Blueprint, make a variable of type `DojoP13Stats` with Health 50 and Stamina 20. On Begin Play, call Drink on the potion with that variable, then print the variable's Health and Stamina: 90 and 20. Add a seventh row, Add, at the very end, play again, and the print shows 50 and 20: the recipe now needs a value the stack does not have, Drink returns false, and nothing changed.

# Files

## DojoP13Stats.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP13Stats.generated.h"

/** The four numbers a vault script may read or write. */
UENUM(BlueprintType)
enum class EDojoP13Stat : uint8
{
	Health,
	Stamina,
	Gold,
	Keys
};

/** An adventurer's numbers in the vault, reachable by name so a script can pick one. */
USTRUCT(BlueprintType)
struct FDojoP13Stats
{
	GENERATED_BODY()

	/** Hit points. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
	int32 Health = 0;

	/** Breath for running and striking. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
	int32 Stamina = 0;

	/** Coins carried. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
	int32 Gold = 0;

	/** Keys carried. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
	int32 Keys = 0;

	/** The value of the stat named by Which. */
	int32 Get(EDojoP13Stat Which) const
	{
		switch (Which)
		{
		case EDojoP13Stat::Health: return Health;
		case EDojoP13Stat::Stamina: return Stamina;
		case EDojoP13Stat::Gold: return Gold;
		case EDojoP13Stat::Keys: return Keys;
		}
		return 0;
	}

	/** Sets the stat named by Which to Value. */
	void Set(EDojoP13Stat Which, int32 Value)
	{
		switch (Which)
		{
		case EDojoP13Stat::Health: Health = Value; break;
		case EDojoP13Stat::Stamina: Stamina = Value; break;
		case EDojoP13Stat::Gold: Gold = Value; break;
		case EDojoP13Stat::Keys: Keys = Value; break;
		}
	}
};
```

## DojoP13Instruction.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP13Stats.h"
#include "DojoP13Instruction.generated.h"

/** What one step of a potion recipe does. */
UENUM(BlueprintType)
enum class EDojoP13Op : uint8
{
	/** Puts Number on top of the stack. */
	PushNumber,
	/** Puts the value of Stat on top of the stack. */
	ReadStat,
	/** Takes the top value off the stack and stores it in Stat. */
	WriteStat,
	/** Takes two values off the stack and puts back their sum. */
	Add,
	/** Takes two values off the stack and puts back their product. */
	Multiply
};

/** One step of a potion recipe, edited as a row in the Details panel. */
USTRUCT(BlueprintType)
struct FDojoP13Instruction
{
	GENERATED_BODY()

	/** What this step does. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Recipe")
	EDojoP13Op Op = EDojoP13Op::PushNumber;

	/** The number PushNumber puts on the stack. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Recipe", meta = (EditCondition = "Op == EDojoP13Op::PushNumber", EditConditionHides)) // @explain: The panel shows Number only on push rows, so a designer is offered only the fields the chosen op uses.
	int32 Number = 0;

	/** The stat ReadStat and WriteStat use. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Recipe", meta = (EditCondition = "Op == EDojoP13Op::ReadStat || Op == EDojoP13Op::WriteStat", EditConditionHides))
	EDojoP13Stat Stat = EDojoP13Stat::Health;
};
```

## DojoP13RecipeMachine.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP13Instruction.h"
#include "DojoP13Stats.h"

/** Runs a potion recipe, one step at a time, passing values between steps on a small stack. */
class FDojoP13RecipeMachine
{
public:
	/** The most values the stack may hold at once. */
	static constexpr int32 StackLimit = 8;

	/** Runs every step of Program against a copy of Stats and keeps the copy only if no step failed; false, with Stats untouched, when a step failed. */
	bool Run(const TArray<FDojoP13Instruction>& Program, FDojoP13Stats& Stats);

private:
	/** Does one step to Stats; false when the step cannot be done. */
	bool Execute(const FDojoP13Instruction& Instruction, FDojoP13Stats& Stats);

	/** Puts Value on top of the stack; false when the stack is full. */
	bool Push(int32 Value);

	/** Takes the top value off the stack into OutValue; false when the stack is empty. */
	bool Pop(int32& OutValue);

	/** Values waiting for the next step, the last one pushed on top. */
	TArray<int32, TInlineAllocator<StackLimit>> Stack;
};
```

## DojoP13RecipeMachine.cpp

```cpp
#include "DojoP13RecipeMachine.h"

bool FDojoP13RecipeMachine::Run(const TArray<FDojoP13Instruction>& Program, FDojoP13Stats& Stats)
{
	return false;
}

bool FDojoP13RecipeMachine::Execute(const FDojoP13Instruction& Instruction, FDojoP13Stats& Stats)
{
	switch (Instruction.Op)
	{
	case EDojoP13Op::PushNumber:
		return Push(Instruction.Number);

	case EDojoP13Op::ReadStat:
		return Push(Stats.Get(Instruction.Stat));

	case EDojoP13Op::WriteStat:
	{
		int32 Value = 0;
		if (!Pop(Value)) return false;

		Stats.Set(Instruction.Stat, Value);
		return true;
	}

	case EDojoP13Op::Add:
	case EDojoP13Op::Multiply:
	{
		int32 Top = 0;
		int32 Under = 0;
		if (!Pop(Top) || !Pop(Under)) return false; // @explain: A step that needs two values when the stack holds fewer is refused with false, so a broken recipe stops the machine instead of crashing the game.

		return Push(Instruction.Op == EDojoP13Op::Add ? Top + Under : Top * Under);
	}
	}

	return false; // @explain: An op this machine does not know is refused, so the machine can only ever do what its own cases do.
}

bool FDojoP13RecipeMachine::Push(int32 Value)
{
	if (Stack.Num() >= StackLimit) return false; // @explain: The stack has a fixed size, so no recipe, however long, can make the machine use more memory.

	Stack.Add(Value);
	return true;
}

bool FDojoP13RecipeMachine::Pop(int32& OutValue)
{
	if (Stack.IsEmpty()) return false;

	OutValue = Stack.Pop(EAllowShrinking::No);
	return true;
}
```

## DojoP13Potion.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP13Instruction.h"
#include "DojoP13Stats.h"
#include "GameFramework/Actor.h"
#include "DojoP13Potion.generated.h"

/** A potion on a vault shelf whose effect is a recipe of steps a designer writes in the Details panel. */
UCLASS()
class ADojoP13Potion : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP13Potion();

	/** The steps the potion runs on whoever drinks it, in order. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Potion")
	TArray<FDojoP13Instruction> Recipe;

	/** Runs the recipe on Stats; false, with Stats unchanged, when the recipe is broken. */
	UFUNCTION(BlueprintCallable, Category = "Potion")
	bool Drink(UPARAM(ref) FDojoP13Stats& Stats) const; // @explain: UPARAM(ref) gives the Blueprint node one stats pin that goes in and comes back changed, instead of an output pin only.
};
```

## DojoP13Potion.cpp

```cpp
#include "DojoP13Potion.h"

#include "Components/SceneComponent.h"
#include "DojoP13RecipeMachine.h"

ADojoP13Potion::ADojoP13Potion()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

bool ADojoP13Potion::Drink(FDojoP13Stats& Stats) const
{
	FDojoP13RecipeMachine Machine;
	return Machine.Run(Recipe, Stats);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p13-potion-recipes/DojoP13Instruction.h"
#include "Quests/p13-potion-recipes/DojoP13Potion.h"
#include "Quests/p13-potion-recipes/DojoP13RecipeMachine.h"
#include "Quests/p13-potion-recipes/DojoP13Stats.h"
#include "Support/DojoTestWorld.h"

namespace DojoP13PotionTest
{
	/** A step with no number or stat. */
	FDojoP13Instruction Step(EDojoP13Op Op)
	{
		FDojoP13Instruction Result;
		Result.Op = Op;
		return Result;
	}

	/** A step that pushes Number. */
	FDojoP13Instruction PushStep(int32 Number)
	{
		FDojoP13Instruction Result = Step(EDojoP13Op::PushNumber);
		Result.Number = Number;
		return Result;
	}

	/** A step that reads or writes Stat. */
	FDojoP13Instruction StatStep(EDojoP13Op Op, EDojoP13Stat Stat)
	{
		FDojoP13Instruction Result = Step(Op);
		Result.Stat = Stat;
		return Result;
	}

	/** Health 50, Stamina 20, no gold, no keys. */
	FDojoP13Stats Fresh()
	{
		FDojoP13Stats Result;
		Result.Health = 50;
		Result.Stamina = 20;
		return Result;
	}

	/** Health = Health + Stamina * 2. */
	TArray<FDojoP13Instruction> SecondWind()
	{
		return {
			StatStep(EDojoP13Op::ReadStat, EDojoP13Stat::Health),
			StatStep(EDojoP13Op::ReadStat, EDojoP13Stat::Stamina),
			PushStep(2),
			Step(EDojoP13Op::Multiply),
			Step(EDojoP13Op::Add),
			StatStep(EDojoP13Op::WriteStat, EDojoP13Stat::Health),
		};
	}

	/** True when every stat of A equals the same stat of B. */
	bool SameStats(const FDojoP13Stats& A, const FDojoP13Stats& B)
	{
		return A.Health == B.Health && A.Stamina == B.Stamina && A.Gold == B.Gold && A.Keys == B.Keys;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_PotionRecipes_SecondWindRaisesHealth, "Dojo.P13.PotionRecipes.SecondWindRaisesHealth", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A potion placed in the world with the Second Wind recipe turns Health 50 and Stamina 20 into Health 90 and leaves the rest alone. */
bool FDojo_P13_PotionRecipes_SecondWindRaisesHealth::RunTest(const FString& Parameters)
{
	using namespace DojoP13PotionTest;

	FDojoTestWorld TestWorld;

	ADojoP13Potion* Potion = TestWorld.SpawnActor<ADojoP13Potion>();
	if (!TestNotNull(TEXT("Potion spawned"), Potion)) return false;
	Potion->Recipe = SecondWind();

	FDojoP13Stats Stats = Fresh();
	TestTrue(TEXT("Second Wind runs"), Potion->Drink(Stats));
	TestEqual(TEXT("Health is 50 plus twice 20"), Stats.Health, 90);
	TestEqual(TEXT("Stamina is only read"), Stats.Stamina, 20);
	TestEqual(TEXT("Gold is untouched"), Stats.Gold, 0);
	TestEqual(TEXT("Keys are untouched"), Stats.Keys, 0);

	TestTrue(TEXT("A second drink runs again"), Potion->Drink(Stats));
	TestEqual(TEXT("And works from the new health"), Stats.Health, 130);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_PotionRecipes_StepsRunInOrder, "Dojo.P13.PotionRecipes.StepsRunInOrder", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Steps run in the order written, a recipe may write several stats, and leftovers or an empty recipe are fine. */
bool FDojo_P13_PotionRecipes_StepsRunInOrder::RunTest(const FString& Parameters)
{
	using namespace DojoP13PotionTest;

	FDojoP13RecipeMachine Machine;

	FDojoP13Stats Stats = Fresh();
	Stats.Gold = 4;
	Stats.Keys = 3;
	const TArray<FDojoP13Instruction> AddThenMultiply = {
		StatStep(EDojoP13Op::ReadStat, EDojoP13Stat::Gold), PushStep(3), Step(EDojoP13Op::Add),
		StatStep(EDojoP13Op::ReadStat, EDojoP13Stat::Keys), Step(EDojoP13Op::Multiply),
		StatStep(EDojoP13Op::WriteStat, EDojoP13Stat::Gold) };
	TestTrue(TEXT("(Gold + 3) * Keys runs"), Machine.Run(AddThenMultiply, Stats));
	TestEqual(TEXT("Gold is (4 + 3) * 3"), Stats.Gold, 21);

	const TArray<FDojoP13Instruction> TwoWrites = {
		PushStep(7), StatStep(EDojoP13Op::WriteStat, EDojoP13Stat::Keys),
		PushStep(100), StatStep(EDojoP13Op::WriteStat, EDojoP13Stat::Health) };
	TestTrue(TEXT("A recipe that writes two stats runs"), Machine.Run(TwoWrites, Stats));
	TestEqual(TEXT("Keys is 7"), Stats.Keys, 7);
	TestEqual(TEXT("Health is 100"), Stats.Health, 100);

	const FDojoP13Stats Before = Stats;
	TestTrue(TEXT("Values left on the stack are dropped"), Machine.Run({ PushStep(1), PushStep(2) }, Stats));
	TestTrue(TEXT("And change nothing"), SameStats(Stats, Before));

	TestTrue(TEXT("An empty recipe runs"), Machine.Run({}, Stats));
	TestTrue(TEXT("And changes nothing"), SameStats(Stats, Before));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_PotionRecipes_BrokenRecipeChangesNothing, "Dojo.P13.PotionRecipes.BrokenRecipeChangesNothing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A recipe that runs out of values or overfills the stack is refused, and stats it wrote before failing are not kept. */
bool FDojo_P13_PotionRecipes_BrokenRecipeChangesNothing::RunTest(const FString& Parameters)
{
	using namespace DojoP13PotionTest;

	FDojoP13RecipeMachine Machine;
	const FDojoP13Stats Start = Fresh();

	FDojoP13Stats Stats = Start;
	const TArray<FDojoP13Instruction> WritesThenFails = { PushStep(5), StatStep(EDojoP13Op::WriteStat, EDojoP13Stat::Gold), Step(EDojoP13Op::Add) };
	TestFalse(TEXT("Add with nothing on the stack is refused"), Machine.Run(WritesThenFails, Stats));
	TestEqual(TEXT("The gold written before the failure is not kept"), Stats.Gold, 0);
	TestTrue(TEXT("Every stat is as it was"), SameStats(Stats, Start));

	TestFalse(TEXT("Writing with nothing on the stack is refused"), Machine.Run({ StatStep(EDojoP13Op::WriteStat, EDojoP13Stat::Health) }, Stats));
	TestTrue(TEXT("Still as it was"), SameStats(Stats, Start));

	TArray<FDojoP13Instruction> EightPushes;
	for (int32 Index = 0; Index < FDojoP13RecipeMachine::StackLimit; Index++) EightPushes.Add(PushStep(Index));
	TestTrue(TEXT("Eight values fit on the stack"), Machine.Run(EightPushes, Stats));

	TArray<FDojoP13Instruction> NinePushes = EightPushes;
	NinePushes.Add(PushStep(9));
	NinePushes.Add(StatStep(EDojoP13Op::WriteStat, EDojoP13Stat::Keys));
	TestFalse(TEXT("A ninth value overfills the stack and is refused"), Machine.Run(NinePushes, Stats));
	TestTrue(TEXT("And changes nothing"), SameStats(Stats, Start));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_PotionRecipes_MachineRunsAgainAfterAFault, "Dojo.P13.PotionRecipes.MachineRunsAgainAfterAFault", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A machine that gave up on a recipe with values still on its stack runs the next recipe from an empty stack. */
bool FDojo_P13_PotionRecipes_MachineRunsAgainAfterAFault::RunTest(const FString& Parameters)
{
	using namespace DojoP13PotionTest;

	FDojoP13RecipeMachine Machine;

	TArray<FDojoP13Instruction> Overfill;
	for (int32 Index = 0; Index <= FDojoP13RecipeMachine::StackLimit; Index++) Overfill.Add(PushStep(1));

	FDojoP13Stats Stats = Fresh();
	TestFalse(TEXT("The overfilling recipe is refused"), Machine.Run(Overfill, Stats));

	TestTrue(TEXT("The next recipe runs on the same machine"), Machine.Run(SecondWind(), Stats));
	TestEqual(TEXT("And gives the right health"), Stats.Health, 90);

	return true;
}

#endif
```

# Hints

- Every step already has its own code in `Execute`, which says with true or false whether the step worked. What does `Run` do with that answer, and when should it stop asking?
- The stats must come back unchanged when the fifth step fails, even though the second step wrote to them. Where can the steps write while you do not yet know whether the whole recipe will work?
- The machine is reused. After a recipe gave up with values still on the stack, what does the next recipe find there unless `Run` does something first?

# Rubric

- Run executes every step of the program in order through Execute, from an empty stack, and returns true when all of them worked.
- The first step that fails stops the run, and Run returns false.
- A failed run leaves the stats exactly as they were, even when earlier steps wrote to them; a successful run keeps every change.
- The machine can run another program after a failure, and values left on the stack at the end are dropped without an error.
- The stack never holds more than 8 values, and nothing in the machine crashes on a broken recipe.
- The potion depends on the machine and the stats; the machine and the stats know nothing about potions.

# Alternative

The steps could write straight into the stats and undo what they wrote when a later step fails. That saves one copy of four numbers, but every step that writes needs an undo, and a crash part way leaves the stats half changed; with four small integers, the copy costs nothing worth saving. A heavier alternative is a potion class per effect in C++ or a Blueprint child per potion: each is easier to debug with breakpoints, but each new potion is a compile or an asset made by someone with the editor, and modders cannot add one safely.

# Parsons

```yaml
- id: run-recipe
  prompt: Put Run in order.
  lines:
    - "bool FDojoP13RecipeMachine::Run(const TArray<FDojoP13Instruction>& Program, FDojoP13Stats& Stats)"
    - "{"
    - "	Stack.Reset();"
    - "	FDojoP13Stats Working = Stats;"
    - "	for (const FDojoP13Instruction& Instruction : Program)"
    - "	{"
    - "		if (!Execute(Instruction, Working)) return false;"
    - "	}"
    - "	Stats = Working;"
    - "	return true;"
    - "}"
  distractors:
    - line: "		check(Execute(Instruction, Working));"
      mistake: check stops the whole game when its condition is false, so one broken recipe from a designer or a modder would crash the session; a failed step must be refused with false.
```
