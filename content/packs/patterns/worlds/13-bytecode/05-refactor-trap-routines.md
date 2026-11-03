---
id: p13-trap-refactor
title: One routine, many traps
order: 5
kind: refactor
scaffold: stub
difficulty: 4
patterns: [bytecode]
skills: [bytecode, refactoring]
terms: [instanced-specifier, data-asset, ustruct, tick, deltatime, tobjectptr]
prerequisites: [p13-door-conditions]
xp: 110
estimatedMinutes: 30
concepts:
  - A routine is read-only data that any number of traps can run at once
  - Where a trap has got to in its routine, and how long its wait has lasted, belongs to the trap
  - Steps as plain structs in an array replace a step object per row
  - A routine that never waits is stopped by a budget of steps per frame
  - The routine's builder functions and a single trap's rhythm stay exactly as they were
---

# Brief

After the refactor, any number of dart traps can run one routine asset at the same time, each keeping exactly the rhythm it would keep alone, and a single trap fires exactly as before.

`ADojoP13DartTrap` runs a `UDojoP13TrapRoutine`, a Data Asset a designer fills with steps: `Fire` shoots a dart and goes on at once, `Wait` lets its `Seconds` pass and goes on the frame after it ends, and `Jump` goes on from the step numbered `Target`. Each frame the trap runs steps from where it stopped until a wait holds it, the routine ends, or it has run 16 steps in that frame, which jams it for good; so does a jump to a step that does not exist. Tests and tools build routines with `AddFire`, `AddWait`, and `AddJump`.

Today every step is its own `UDojoP13TrapStep` object, created inside the routine with the `Instanced` specifier, and a wait step remembers how long it has waited. That was fine while every trap had its own routine. Now the designers have made one Steady Rhythm asset for the whole hall, and the traps that share it no longer keep time.

Refactor the routine into plain data:

- `UDojoP13TrapStep` becomes the struct `FDojoP13TrapStep` in the same header, holding only `Kind`, `Seconds`, and `Target`; the routine holds a `TArray` of them and holds no objects at all. Nothing writes to a routine while traps run it.
- Each trap keeps its own place: the next step and how long its current wait has waited.
- `AddFire`, `AddWait`, and `AddJump` keep their names and signatures, and everything a single trap does, step for step and frame for frame, stays the same.

Two of the four tests pass on the starter and must pass after; two do not. Read their messages.

## See it in the editor

In the Content Browser, right-click, choose Miscellaneous, then Data Asset, pick `DojoP13TrapRoutine`, and name it `DA_SteadyRhythm`. Give it three steps: Fire, Wait (Seconds 0.5), Jump (Target 0). Before the refactor each step is an object you pick from a class list; after it, each step is a plain row. Place three `DojoP13DartTrap` actors and set all three to the one routine. Press Play, wait ten seconds, press F8, and select each trap in turn: Shots Fired is in its Details. Before the refactor the three counts disagree with each other and with a trap that has a routine of its own; after it, they all read the same, about 20.

# Files

## DojoP13TrapStep.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP13TrapStep.generated.h"

/** What one step of a dart trap's routine does. */
UENUM(BlueprintType)
enum class EDojoP13TrapStepKind : uint8
{
	/** Shoots one dart and goes on to the next step at once. */
	Fire,
	/** Lets Seconds of play pass, then goes on to the next step on the following frame. */
	Wait,
	/** Goes on from the step numbered Target. */
	Jump
};

/** One step of a dart trap's routine, kept as its own object inside the routine. */
UCLASS(EditInlineNew, DefaultToInstanced, BlueprintType)
class UDojoP13TrapStep : public UObject
{
	GENERATED_BODY()

public:
	/** What this step does. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Routine")
	EDojoP13TrapStepKind Kind = EDojoP13TrapStepKind::Fire;

	/** How long a Wait step waits. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Routine", meta = (EditCondition = "Kind == EDojoP13TrapStepKind::Wait", EditConditionHides, ClampMin = "0.0"))
	float Seconds = 0.5f;

	/** The step a Jump step goes on from, counting from 0. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Routine", meta = (EditCondition = "Kind == EDojoP13TrapStepKind::Jump", EditConditionHides, ClampMin = "0"))
	int32 Target = 0;

	/** How long this Wait step has waited so far. */
	UPROPERTY(Transient)
	float WaitedSeconds = 0.f;
};
```

## DojoP13TrapRoutine.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP13TrapStep.h"
#include "Engine/DataAsset.h"
#include "DojoP13TrapRoutine.generated.h"

/** A dart trap's routine as an asset: a list of step objects. */
UCLASS(BlueprintType)
class UDojoP13TrapRoutine : public UDataAsset
{
	GENERATED_BODY()

public:
	/** The steps, in order, each one an object made inside the routine. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Instanced, Category = "Routine")
	TArray<TObjectPtr<UDojoP13TrapStep>> Steps;

	/** Adds a step that shoots one dart. */
	UFUNCTION(BlueprintCallable, Category = "Routine")
	void AddFire();

	/** Adds a step that waits Seconds. */
	UFUNCTION(BlueprintCallable, Category = "Routine")
	void AddWait(float Seconds);

	/** Adds a step that goes on from the step numbered Target. */
	UFUNCTION(BlueprintCallable, Category = "Routine")
	void AddJump(int32 Target);

private:
	/** Creates a step of Kind inside this routine and adds it to the end. */
	UDojoP13TrapStep* AddStep(EDojoP13TrapStepKind Kind);
};
```

## DojoP13TrapRoutine.cpp

```cpp
#include "DojoP13TrapRoutine.h"

void UDojoP13TrapRoutine::AddFire()
{
	AddStep(EDojoP13TrapStepKind::Fire);
}

void UDojoP13TrapRoutine::AddWait(float Seconds)
{
	AddStep(EDojoP13TrapStepKind::Wait)->Seconds = Seconds;
}

void UDojoP13TrapRoutine::AddJump(int32 Target)
{
	AddStep(EDojoP13TrapStepKind::Jump)->Target = Target;
}

UDojoP13TrapStep* UDojoP13TrapRoutine::AddStep(EDojoP13TrapStepKind Kind)
{
	UDojoP13TrapStep* Step = NewObject<UDojoP13TrapStep>(this);
	Step->Kind = Kind;
	Steps.Add(Step);
	return Step;
}
```

## DojoP13DartTrap.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP13TrapRoutine.h"
#include "GameFramework/Actor.h"
#include "DojoP13DartTrap.generated.h"

/** A dart trap that runs a designer's routine a few steps each frame. */
UCLASS()
class ADojoP13DartTrap : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking on. */
	ADojoP13DartTrap();

	/** The most steps the trap runs in one frame; a routine that needs more is jammed. */
	static constexpr int32 StepsPerFrame = 16;

	/** The routine this trap runs. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trap")
	TObjectPtr<UDojoP13TrapRoutine> Routine;

	/** Runs the routine from where it stopped last frame until it waits, ends, or runs out of steps for this frame. */
	virtual void Tick(float DeltaSeconds) override;

	/** Darts shot so far. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	int32 GetShotsFired() const;

	/** True once the routine needed more than StepsPerFrame steps in one frame or jumped to a step that does not exist; a jammed trap does nothing more. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	bool IsJammed() const;

	/** True once the routine has run past its last step. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	bool IsFinished() const;

protected:
	/** Darts shot so far, shown in Details while playing. */
	UPROPERTY(VisibleInstanceOnly, Category = "Trap")
	int32 ShotsFired = 0;

private:
	/** The step this trap runs next. */
	int32 StepIndex = 0;

	/** True once the routine went wrong. */
	bool bJammed = false;
};
```

## DojoP13DartTrap.cpp

```cpp
#include "DojoP13DartTrap.h"

#include "Components/SceneComponent.h"

ADojoP13DartTrap::ADojoP13DartTrap()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP13DartTrap::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (bJammed || !IsValid(Routine)) return;

	for (int32 Spent = 0; Spent < StepsPerFrame; Spent++)
	{
		if (!Routine->Steps.IsValidIndex(StepIndex)) return;

		UDojoP13TrapStep* Step = Routine->Steps[StepIndex];
		if (!IsValid(Step))
		{
			bJammed = true;
			return;
		}

		switch (Step->Kind)
		{
		case EDojoP13TrapStepKind::Fire:
			ShotsFired++;
			StepIndex++;
			break;

		case EDojoP13TrapStepKind::Wait:
			Step->WaitedSeconds += DeltaSeconds;
			if (Step->WaitedSeconds >= Step->Seconds)
			{
				Step->WaitedSeconds = 0.f;
				StepIndex++;
			}
			return;

		case EDojoP13TrapStepKind::Jump:
			if (!Routine->Steps.IsValidIndex(Step->Target))
			{
				bJammed = true;
				return;
			}
			StepIndex = Step->Target;
			break;
		}
	}

	bJammed = true;
}

int32 ADojoP13DartTrap::GetShotsFired() const
{
	return ShotsFired;
}

bool ADojoP13DartTrap::IsJammed() const
{
	return bJammed;
}

bool ADojoP13DartTrap::IsFinished() const
{
	return !bJammed && IsValid(Routine) && !Routine->Steps.IsValidIndex(StepIndex);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p13-trap-refactor/DojoP13DartTrap.h"
#include "Quests/p13-trap-refactor/DojoP13TrapRoutine.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoP13TrapTest
{
	/** Fire, wait half a second, and start again. */
	UDojoP13TrapRoutine* MakeSteadyRhythm()
	{
		UDojoP13TrapRoutine* Routine = NewObject<UDojoP13TrapRoutine>(GetTransientPackage());
		Routine->AddFire();
		Routine->AddWait(0.5f);
		Routine->AddJump(0);
		return Routine;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_TrapRefactor_OneTrapKeepsItsRhythm, "Dojo.P13.TrapRefactor.OneTrapKeepsItsRhythm", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A lone trap fires about twice a second on the steady rhythm, and a routine without a jump fires its darts and finishes. */
bool FDojo_P13_TrapRefactor_OneTrapKeepsItsRhythm::RunTest(const FString& Parameters)
{
	using namespace DojoP13TrapTest;

	FDojoTestWorld TestWorld;

	ADojoP13DartTrap* Trap = TestWorld.SpawnActor<ADojoP13DartTrap>();
	if (!TestNotNull(TEXT("Trap spawned"), Trap)) return false;
	Trap->Routine = MakeSteadyRhythm();

	TestWorld.Tick(15);
	TestEqual(TEXT("One dart in the first quarter second"), Trap->GetShotsFired(), 1);
	TestWorld.Tick(30);
	TestEqual(TEXT("Two darts after three quarters of a second"), Trap->GetShotsFired(), 2);
	TestWorld.Tick(30);
	TestEqual(TEXT("Three darts after a second and a quarter"), Trap->GetShotsFired(), 3);
	TestFalse(TEXT("A looping routine never finishes"), Trap->IsFinished());
	TestFalse(TEXT("And is not jammed"), Trap->IsJammed());

	ADojoP13DartTrap* Volley = TestWorld.SpawnActor<ADojoP13DartTrap>();
	if (!TestNotNull(TEXT("Volley trap spawned"), Volley)) return false;
	UDojoP13TrapRoutine* TwoShots = NewObject<UDojoP13TrapRoutine>(GetTransientPackage());
	TwoShots->AddFire();
	TwoShots->AddFire();
	TwoShots->AddWait(0.2f);
	Volley->Routine = TwoShots;

	TestWorld.Tick(1);
	TestEqual(TEXT("Two Fire steps in a row both fire in one frame"), Volley->GetShotsFired(), 2);
	TestFalse(TEXT("The trap is still waiting"), Volley->IsFinished());
	TestWorld.Tick(30);
	TestTrue(TEXT("After its wait the routine has run past its end"), Volley->IsFinished());
	TestEqual(TEXT("And fired nothing more"), Volley->GetShotsFired(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_TrapRefactor_RunawayRoutineJams, "Dojo.P13.TrapRefactor.RunawayRoutineJams", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A routine that loops without waiting stops after 16 steps in a frame, and a jump to a missing step jams the trap too. */
bool FDojo_P13_TrapRefactor_RunawayRoutineJams::RunTest(const FString& Parameters)
{
	using namespace DojoP13TrapTest;

	FDojoTestWorld TestWorld;

	UDojoP13TrapRoutine* Runaway = NewObject<UDojoP13TrapRoutine>(GetTransientPackage());
	Runaway->AddFire();
	Runaway->AddJump(0);

	ADojoP13DartTrap* Trap = TestWorld.SpawnActor<ADojoP13DartTrap>();
	if (!TestNotNull(TEXT("Trap spawned"), Trap)) return false;
	Trap->Routine = Runaway;

	TestWorld.Tick(1);
	TestTrue(TEXT("The runaway routine jams the trap"), Trap->IsJammed());
	TestEqual(TEXT("Sixteen steps fired eight darts first"), Trap->GetShotsFired(), 8);
	TestWorld.Tick(10);
	TestEqual(TEXT("A jammed trap fires no more"), Trap->GetShotsFired(), 8);

	UDojoP13TrapRoutine* BadJump = NewObject<UDojoP13TrapRoutine>(GetTransientPackage());
	BadJump->AddFire();
	BadJump->AddJump(5);

	ADojoP13DartTrap* Other = TestWorld.SpawnActor<ADojoP13DartTrap>();
	if (!TestNotNull(TEXT("Second trap spawned"), Other)) return false;
	Other->Routine = BadJump;

	TestWorld.Tick(1);
	TestTrue(TEXT("A jump to a missing step jams the trap"), Other->IsJammed());
	TestEqual(TEXT("After its one dart"), Other->GetShotsFired(), 1);
	TestFalse(TEXT("A jammed trap is not finished"), Other->IsFinished());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_TrapRefactor_TrapsShareOneRoutine, "Dojo.P13.TrapRefactor.TrapsShareOneRoutine", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two traps that share one routine, started ten frames apart, fire on every frame exactly as two traps with routines of their own. */
bool FDojo_P13_TrapRefactor_TrapsShareOneRoutine::RunTest(const FString& Parameters)
{
	using namespace DojoP13TrapTest;

	FDojoTestWorld TestWorld;

	ADojoP13DartTrap* AloneFirst = TestWorld.SpawnActor<ADojoP13DartTrap>();
	ADojoP13DartTrap* AloneSecond = TestWorld.SpawnActor<ADojoP13DartTrap>();
	ADojoP13DartTrap* SharingFirst = TestWorld.SpawnActor<ADojoP13DartTrap>();
	ADojoP13DartTrap* SharingSecond = TestWorld.SpawnActor<ADojoP13DartTrap>();
	if (!AloneFirst || !AloneSecond || !SharingFirst || !SharingSecond) return TestTrue(TEXT("Four traps spawned"), false);

	UDojoP13TrapRoutine* Shared = MakeSteadyRhythm();
	AloneFirst->Routine = MakeSteadyRhythm();
	SharingFirst->Routine = Shared;
	TestWorld.Tick(10);

	AloneSecond->Routine = MakeSteadyRhythm();
	SharingSecond->Routine = Shared;

	for (int32 Frame = 0; Frame < 190; Frame++)
	{
		TestWorld.Tick(1);

		if (SharingFirst->GetShotsFired() != AloneFirst->GetShotsFired() || SharingSecond->GetShotsFired() != AloneSecond->GetShotsFired())
		{
			AddError(FString::Printf(TEXT("Frame %d after the second start: the sharing traps fired %d and %d, but traps with routines of their own fired %d and %d"),
				Frame + 1, SharingFirst->GetShotsFired(), SharingSecond->GetShotsFired(), AloneFirst->GetShotsFired(), AloneSecond->GetShotsFired()));
			return true;
		}
	}

	TestTrue(TEXT("The traps kept firing the whole time"), AloneFirst->GetShotsFired() >= 6);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_TrapRefactor_RoutineHoldsNoObjects, "Dojo.P13.TrapRefactor.RoutineHoldsNoObjects", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The routine's own properties hold plain data only, checked through reflection, so no step object can carry state between traps. */
bool FDojo_P13_TrapRefactor_RoutineHoldsNoObjects::RunTest(const FString& Parameters)
{
	int32 Checked = 0;
	for (TFieldIterator<FProperty> It(UDojoP13TrapRoutine::StaticClass(), EFieldIteratorFlags::ExcludeSuper); It; ++It)
	{
		const FProperty* Property = *It;
		const FArrayProperty* ArrayProperty = CastField<FArrayProperty>(Property);
		const FProperty* Held = ArrayProperty ? ArrayProperty->Inner : Property;
		Checked++;

		if (CastField<FObjectPropertyBase>(Held)) AddError(FString::Printf(TEXT("The routine's %s holds objects; a routine shared by many traps should hold plain data only"), *Property->GetName()));
	}

	TestTrue(TEXT("The routine has properties to check"), Checked > 0);

	return true;
}

#endif
```

# Hints

- `TrapsShareOneRoutine` names the first frame where a sharing trap and its twin disagree. When both sharing traps are waiting, which object does each of them add its frame time to?
- A routine shared by many traps must not change while they run it. Which values in the starter change during play, and whose are they really: the routine's, or one trap's?
- Turn the step class into a struct with only what a designer writes, keep the trap's place and its wait time in the trap, and let `AddStep`'s three callers build structs. `RoutineHoldsNoObjects` checks the routine's properties through reflection, so the array itself must hold structs.

# Rubric

- The routine holds a TArray of FDojoP13TrapStep structs with only Kind, Seconds, and Target, and no object of any kind.
- Each trap keeps its own next step and its own wait time, and nothing writes to the routine while traps run it.
- Any number of traps can share one routine asset and each keeps the rhythm it would keep alone, whenever it started.
- A single trap's behavior is unchanged: Fire goes on at once, a finished wait ends the frame, 16 steps in a frame or a jump to a missing step jams, and running past the end finishes.
- AddFire, AddWait, and AddJump keep their names and signatures, and the trap's public functions are unchanged.
- The trap depends on the routine; the routine knows nothing about traps.

# Alternative

Keeping the step objects and moving only their changing values into the trap, for example a map from step to elapsed time, also fixes the sharing, and it keeps the class list that lets a programmer add a step kind as a new subclass. It costs an object per step and a lookup per frame, and nothing stops the next step class from keeping state again. Plain structs make the rule part of the type: a routine is data, so it cannot hold run state. If designers need many more step kinds than three, a hybrid works too: an authoring tree of objects in the editor, flattened into structs once when the asset is saved.
