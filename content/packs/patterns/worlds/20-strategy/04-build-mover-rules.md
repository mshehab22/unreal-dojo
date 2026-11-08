---
id: p20-mover-rules
title: A dummy that moves by whichever rule it is given
order: 4
kind: build
scaffold: stub
difficulty: 4
patterns: [strategy]
skills: [strategy, object-model]
terms: [tsubclassof, newobject, uobject, tobjectptr, abstract-specifier]
prerequisites: [p20-strategy-card]
xp: 130
estimatedMinutes: 40
concepts:
  - A class reference lets a designer, or code, pick the movement rule's class for each dummy
  - The mover makes its own rule object from that class when a step needs one, owned by the mover
  - A rule that remembers things needs an object for each mover, so two movers never tangle
  - An abstract class, or no class, makes the dummy stand still instead of failing
  - Changing the class changes how the dummy moves from the next step on
---

# Brief

When you press Play with the setup below, a practice dummy stands, circles, or patrols according to the rule class it is given, and giving it another class changes how it moves from the next step on.

`ADojoP20Mover` is a practice dummy. It does not know how to move. It has `RuleClass`, a reference to a class derived from `UDojoP20MoveRule`, and the rule class decides each step with `NextLocation`, which gets where the dummy is, where it was when play began, and how long the step lasts, and answers with where it goes next. Three rules are written for you. Stand returns where the dummy is. Orbit turns the dummy around a centre. Patrol walks it out along X to a distance and back, and **remembers which way it is heading**, so a patrol rule cannot be shared by two dummies.

The declarations, the constructor, `BeginPlay`, which records the anchor, and the getters are given. Yours are:

- `SetRuleClass(NewClass)`: makes `NewClass` the movement rule from the next step on. An empty class makes the dummy stand still.
- `Step(DeltaSeconds)`: moves the dummy to the place its rule says. It does nothing when there is no class, or when the class is abstract. It makes the rule object when a step needs one, as an object owned by the mover, and it moves the actor with `SetActorLocation`.

The mover never names a rule class. Every mover has a rule object of its own.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Drag a Dojo P20 Mover from the Place Actors panel into the level at the origin; it has no mesh, so find it in the Outliner. In Details, under Mover, set Rule Class to Dojo P20 Patrol Rule. In the Level Blueprint, select the mover in the Outliner, right click the graph and choose Create a Reference to Dojo P20 Mover. Add a custom event named TakeStep that calls Step on that reference with Delta Seconds 0.5 and prints its Get Actor Location, and on Begin Play call Set Timer by Event with Time 0.5 and Looping on, pointing at TakeStep. The X values go 50, 100, 150, 200, 150, 100, 50, 0, and turn again. Stop, set Rule Class to Dojo P20 Orbit Rule, and run again: the dummy circles a point 50 along X from the start. With Rule Class empty it never moves.

# Files

## DojoP20MoveRule.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP20MoveRule.generated.h"

/** The shape every movement rule shares: given where a dummy is, where it started, and how long the step lasts, say where it goes next. A rule may remember things between steps, so each mover needs a rule object of its own. */
UCLASS(Abstract, Blueprintable, EditInlineNew)
class UDojoP20MoveRule : public UObject
{
	GENERATED_BODY()

public:
	/** Where the dummy goes after DeltaSeconds; the base rule leaves it where it is. */
	virtual FVector NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds);
};
```

## DojoP20MoveRule.cpp

```cpp
#include "DojoP20MoveRule.h"

FVector UDojoP20MoveRule::NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds)
{
	return Current;
}
```

## DojoP20StandRule.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20MoveRule.h"
#include "DojoP20StandRule.generated.h"

/** The dummy stands where it is. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20StandRule : public UDojoP20MoveRule
{
	GENERATED_BODY()

public:
	/** Returns Current unchanged. */
	virtual FVector NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds) override;
};
```

## DojoP20StandRule.cpp

```cpp
#include "DojoP20StandRule.h"

FVector UDojoP20StandRule::NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds)
{
	return Current;
}
```

## DojoP20OrbitRule.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20MoveRule.h"
#include "DojoP20OrbitRule.generated.h"

/** The dummy circles a centre that sits a fixed offset from where it started, turning at a steady rate. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20OrbitRule : public UDojoP20MoveRule
{
	GENERATED_BODY()

public:
	/** Turns Current around the centre by the angle covered in DeltaSeconds. */
	virtual FVector NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds) override;

	/** Where the centre of the circle is, relative to where the dummy started. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Orbit")
	FVector CenterOffset = FVector(50.f, 0.f, 0.f);

	/** How fast the dummy turns, in degrees per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Orbit")
	float DegreesPerSecond = 90.f;
};
```

## DojoP20OrbitRule.cpp

```cpp
#include "DojoP20OrbitRule.h"

FVector UDojoP20OrbitRule::NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds)
{
	const FVector Centre = Anchor + CenterOffset;
	const FVector Turned = (Current - Centre).RotateAngleAxis(DegreesPerSecond * DeltaSeconds, FVector::UpVector);
	return Centre + Turned;
}
```

## DojoP20PatrolRule.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20MoveRule.h"
#include "DojoP20PatrolRule.generated.h"

/** The dummy walks along X from where it started out to a set distance and back again, turning at each end. It remembers which way it is heading. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20PatrolRule : public UDojoP20MoveRule
{
	GENERATED_BODY()

public:
	/** Moves Current along X by the distance covered in DeltaSeconds, stopping at an end and turning round there. */
	virtual FVector NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds) override;

	/** How far out from the start the dummy walks. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Patrol")
	float Distance = 200.f;

	/** How fast the dummy walks. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Patrol")
	float Speed = 100.f;

private:
	/** True while the dummy is walking away from its start. */
	bool bHeadingOut = true;
};
```

## DojoP20PatrolRule.cpp

```cpp
#include "DojoP20PatrolRule.h"

FVector UDojoP20PatrolRule::NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds)
{
	const double Stride = Speed * DeltaSeconds;
	const double Low = Anchor.X;
	const double High = Anchor.X + Distance;

	FVector Next = Current;
	Next.X += bHeadingOut ? Stride : -Stride;

	if (Next.X >= High)
	{
		Next.X = High;
		bHeadingOut = false;
	}
	else if (Next.X <= Low)
	{
		Next.X = Low;
		bHeadingOut = true;
	}

	return Next;
}
```

## DojoP20Mover.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20MoveRule.h"
#include "GameFramework/Actor.h"
#include "DojoP20Mover.generated.h"

/** A practice dummy that moves by whichever movement rule class it is given; the class can be changed while it moves. */
UCLASS()
class ADojoP20Mover : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP20Mover();

	/** The class of the rule that moves this dummy; empty means it stands still. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mover")
	TSubclassOf<UDojoP20MoveRule> RuleClass;

	/** Makes NewClass the movement rule from the next step on; an empty class makes the dummy stand still. */
	UFUNCTION(BlueprintCallable, Category = "Mover")
	void SetRuleClass(TSubclassOf<UDojoP20MoveRule> NewClass);

	/** Moves the dummy to where its rule says it goes after DeltaSeconds; does nothing without a rule class, or with an abstract one. */
	UFUNCTION(BlueprintCallable, Category = "Mover")
	void Step(float DeltaSeconds);

	/** Where the dummy was when play began. */
	UFUNCTION(BlueprintPure, Category = "Mover")
	FVector GetAnchor() const;

	/** The rule object now moving the dummy, or nullptr before the first step. */
	UFUNCTION(BlueprintPure, Category = "Mover")
	UDojoP20MoveRule* GetRule() const;

protected:
	/** Remembers where the dummy started. */
	virtual void BeginPlay() override;

private:
	/** The rule object that moves this dummy; one object for each mover, because a rule may remember things between steps. */
	UPROPERTY()
	TObjectPtr<UDojoP20MoveRule> Rule; // @explain: Each mover keeps a rule object of its own, because a rule such as the patrol remembers which way it is heading and two movers must not share that memory.

	/** Where the dummy was when play began. */
	FVector Anchor = FVector::ZeroVector;
};
```

## DojoP20Mover.cpp

```cpp
#include "DojoP20Mover.h"

#include "Components/SceneComponent.h"

ADojoP20Mover::ADojoP20Mover()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP20Mover::BeginPlay()
{
	Super::BeginPlay();

	Anchor = GetActorLocation();
}

void ADojoP20Mover::SetRuleClass(TSubclassOf<UDojoP20MoveRule> NewClass)
{
}

void ADojoP20Mover::Step(float DeltaSeconds)
{
}

FVector ADojoP20Mover::GetAnchor() const
{
	return Anchor;
}

UDojoP20MoveRule* ADojoP20Mover::GetRule() const
{
	return Rule.Get();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p20-mover-rules/DojoP20Mover.h"
#include "Quests/p20-mover-rules/DojoP20OrbitRule.h"
#include "Quests/p20-mover-rules/DojoP20PatrolRule.h"
#include "Quests/p20-mover-rules/DojoP20StandRule.h"
#include "Support/DojoTestWorld.h"

namespace DojoP20MoverTest
{
	/** Spawns a mover at Place in the test world; its anchor is where BeginPlay finds it. */
	ADojoP20Mover* MakeMover(FDojoTestWorld& TestWorld, const FVector& Place)
	{
		return TestWorld.GetWorld()->SpawnActor<ADojoP20Mover>(Place, FRotator::ZeroRotator);
	}

	/** True when the mover is where Expected says, within half a unit. */
	bool IsAt(const ADojoP20Mover* Mover, const FVector& Expected)
	{
		return Mover->GetActorLocation().Equals(Expected, 0.5);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_MoverRules_NoClassStandsStill, "Dojo.P20.MoverRules.NoClassStandsStill", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With no class, or an abstract one, a step does nothing and makes no rule. */
bool FDojo_P20_MoverRules_NoClassStandsStill::RunTest(const FString& Parameters)
{
	using namespace DojoP20MoverTest;

	FDojoTestWorld TestWorld;

	ADojoP20Mover* Mover = MakeMover(TestWorld, FVector(100.f, 0.f, 0.f));
	if (!TestNotNull(TEXT("Mover made"), Mover)) return false;

	TestTrue(TEXT("The anchor is where the dummy started"), Mover->GetAnchor().Equals(FVector(100.f, 0.f, 0.f), 0.01));

	Mover->Step(1.f);
	TestTrue(TEXT("With no class the dummy has not moved"), IsAt(Mover, FVector(100.f, 0.f, 0.f)));
	TestTrue(TEXT("And no rule was made"), Mover->GetRule() == nullptr);

	Mover->SetRuleClass(UDojoP20MoveRule::StaticClass());
	Mover->Step(1.f);
	TestTrue(TEXT("With the abstract base class it has not moved either"), IsAt(Mover, FVector(100.f, 0.f, 0.f)));
	TestTrue(TEXT("And no rule was made"), Mover->GetRule() == nullptr);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_MoverRules_StandRuleStaysPut, "Dojo.P20.MoverRules.StandRuleStaysPut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The stand rule is made from the class, belongs to the mover, and leaves the dummy where it is. */
bool FDojo_P20_MoverRules_StandRuleStaysPut::RunTest(const FString& Parameters)
{
	using namespace DojoP20MoverTest;

	FDojoTestWorld TestWorld;

	ADojoP20Mover* Mover = MakeMover(TestWorld, FVector(100.f, 0.f, 0.f));
	if (!TestNotNull(TEXT("Mover made"), Mover)) return false;

	Mover->SetRuleClass(UDojoP20StandRule::StaticClass());
	for (int32 Count = 0; Count < 3; Count++) Mover->Step(1.f);

	TestTrue(TEXT("The dummy has not moved"), IsAt(Mover, FVector(100.f, 0.f, 0.f)));
	if (!TestNotNull(TEXT("A rule was made"), Mover->GetRule())) return false;
	TestEqual(TEXT("It is a stand rule"), Mover->GetRule()->GetClass(), UDojoP20StandRule::StaticClass());
	TestTrue(TEXT("It belongs to the mover"), Mover->GetRule()->GetOuter() == Mover);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_MoverRules_OrbitCirclesItsCentre, "Dojo.P20.MoverRules.OrbitCirclesItsCentre", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The orbit rule turns the dummy 90 degrees a second around a centre 50 along X from where it started. */
bool FDojo_P20_MoverRules_OrbitCirclesItsCentre::RunTest(const FString& Parameters)
{
	using namespace DojoP20MoverTest;

	FDojoTestWorld TestWorld;

	ADojoP20Mover* Mover = MakeMover(TestWorld, FVector(450.f, 0.f, 0.f));
	if (!TestNotNull(TEXT("Mover made"), Mover)) return false;

	Mover->SetRuleClass(UDojoP20OrbitRule::StaticClass());
	Mover->Step(0.5f);
	Mover->Step(0.5f);

	const FVector Quarter = Mover->GetActorLocation();
	TestTrue(TEXT("A quarter of the way round, the dummy is level with the centre, 50 to the side"), FMath::IsNearlyEqual(Quarter.X, 500.f, 0.5f) && FMath::IsNearlyEqual(FMath::Abs(Quarter.Y), 50.f, 0.5f));

	Mover->Step(0.5f);
	Mover->Step(0.5f);
	TestTrue(TEXT("Halfway round, it is on the far side of the centre"), IsAt(Mover, FVector(550.f, 0.f, 0.f)));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_MoverRules_PatrolWalksOutAndBack, "Dojo.P20.MoverRules.PatrolWalksOutAndBack", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The patrol rule walks 100 units a second out to 200 along X and back, turning at each end. */
bool FDojo_P20_MoverRules_PatrolWalksOutAndBack::RunTest(const FString& Parameters)
{
	using namespace DojoP20MoverTest;

	FDojoTestWorld TestWorld;

	ADojoP20Mover* Mover = MakeMover(TestWorld, FVector::ZeroVector);
	if (!TestNotNull(TEXT("Mover made"), Mover)) return false;

	Mover->SetRuleClass(UDojoP20PatrolRule::StaticClass());

	const float ExpectedAlong[] = { 100.f, 200.f, 100.f, 0.f, 100.f };
	for (const float Along : ExpectedAlong)
	{
		Mover->Step(1.f);
		TestTrue(*FString::Printf(TEXT("After the step the dummy is %.0f along"), Along), IsAt(Mover, FVector(Along, 0.f, 0.f)));
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_MoverRules_EachMoverKeepsItsOwnMemory, "Dojo.P20.MoverRules.EachMoverKeepsItsOwnMemory", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two patrolling dummies each remember their own heading, so one turning round does not turn the other. */
bool FDojo_P20_MoverRules_EachMoverKeepsItsOwnMemory::RunTest(const FString& Parameters)
{
	using namespace DojoP20MoverTest;

	FDojoTestWorld TestWorld;

	ADojoP20Mover* First = MakeMover(TestWorld, FVector::ZeroVector);
	ADojoP20Mover* Second = MakeMover(TestWorld, FVector(0.f, 100.f, 0.f));
	if (!TestNotNull(TEXT("First mover made"), First) || !TestNotNull(TEXT("Second mover made"), Second)) return false;

	First->SetRuleClass(UDojoP20PatrolRule::StaticClass());
	Second->SetRuleClass(UDojoP20PatrolRule::StaticClass());

	for (int32 Count = 0; Count < 3; Count++) First->Step(1.f);
	TestTrue(TEXT("The first dummy has walked out and turned back to 100"), IsAt(First, FVector(100.f, 0.f, 0.f)));

	Second->Step(1.f);
	TestTrue(TEXT("The second is still walking out, 100 along"), IsAt(Second, FVector(100.f, 100.f, 0.f)));
	Second->Step(1.f);
	TestTrue(TEXT("And reaches the end of its walk"), IsAt(Second, FVector(200.f, 100.f, 0.f)));

	TestTrue(TEXT("Each has a rule"), First->GetRule() != nullptr && Second->GetRule() != nullptr);
	TestTrue(TEXT("And they are not the same object"), First->GetRule() != Second->GetRule());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_MoverRules_NewClassMovesTheNextStep, "Dojo.P20.MoverRules.NewClassMovesTheNextStep", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** After a new class is set, the very next step moves the dummy by a rule of that class. */
bool FDojo_P20_MoverRules_NewClassMovesTheNextStep::RunTest(const FString& Parameters)
{
	using namespace DojoP20MoverTest;

	FDojoTestWorld TestWorld;

	ADojoP20Mover* Mover = MakeMover(TestWorld, FVector::ZeroVector);
	if (!TestNotNull(TEXT("Mover made"), Mover)) return false;

	Mover->SetRuleClass(UDojoP20PatrolRule::StaticClass());
	Mover->Step(1.f);
	TestTrue(TEXT("The patrol has walked the dummy to 100"), IsAt(Mover, FVector(100.f, 0.f, 0.f)));

	Mover->SetRuleClass(UDojoP20StandRule::StaticClass());
	Mover->Step(1.f);
	TestTrue(TEXT("After the stand class is set, the next step leaves the dummy at 100"), IsAt(Mover, FVector(100.f, 0.f, 0.f)));
	if (!TestNotNull(TEXT("There is a rule"), Mover->GetRule())) return false;
	TestEqual(TEXT("And the rule is a stand rule"), Mover->GetRule()->GetClass(), UDojoP20StandRule::StaticClass());

	Mover->SetRuleClass(UDojoP20OrbitRule::StaticClass());
	Mover->Step(1.f);
	const FVector Turned = Mover->GetActorLocation();
	TestTrue(TEXT("After the orbit class is set, the next step turns the dummy a quarter round the centre at 50"), FMath::IsNearlyEqual(Turned.X, 50.f, 0.5f) && FMath::IsNearlyEqual(FMath::Abs(Turned.Y), 50.f, 0.5f));
	if (!TestNotNull(TEXT("There is still a rule"), Mover->GetRule())) return false;
	TestEqual(TEXT("And the rule is an orbit rule"), Mover->GetRule()->GetClass(), UDojoP20OrbitRule::StaticClass());

	Mover->SetRuleClass(nullptr);
	const FVector Resting = Mover->GetActorLocation();
	Mover->Step(1.f);
	TestTrue(TEXT("An empty class makes the dummy stand still where it is"), IsAt(Mover, Resting));

	return true;
}

#endif
```

# Hints

- `Step` has three questions to settle in order: is there a usable class, is there a rule object to ask, and where does the dummy go.
- If `NewClassMovesTheNextStep` fails, read what the dummy did after the class changed, and ask what the mover is still holding when the next step runs.
- An object made for the old class must not be asked about the new one, so one of the two functions has to see to it.

# Rubric

- SetRuleClass records the class, and the next step moves the dummy by a rule of that class.
- Step moves the actor to the location its rule answers with, given the actor's location, the anchor, and DeltaSeconds.
- With no class, or an abstract class, Step does nothing and makes no object.
- Each mover makes its own rule object, owned by the mover, only when a step needs one, and no two movers share one.
- The mover names no rule class, tests no kind of rule, and changes nothing else about the dummy.

# Alternative

The mover could hold its rule as an instanced property, as the launcher does, and a swap would assign a new object. Details then creates the rule inside each mover and shows its settings, so one dummy can patrol a longer way than another with no new class. The cost is that code which wants to swap the rule has to build the object itself, and a class reference is the shorter thing to hand around. When a dummy is tuned one by one in the editor, choose the instanced form. When code swaps rules and only the kind matters, as in a game mode that sets every dummy to a different drill, the class reference is simpler. A rule that keeps no memory between calls could even be shared by every mover, which the patrol, with its heading, cannot be.

# Parsons

```yaml
- id: orbit-rule
  prompt: Put the orbit rule's NextLocation in order.
  lines:
    - "FVector UDojoP20OrbitRule::NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds)"
    - "{"
    - "	const FVector Centre = Anchor + CenterOffset;"
    - "	const FVector Turned = (Current - Centre).RotateAngleAxis(DegreesPerSecond * DeltaSeconds, FVector::UpVector);"
    - "	return Centre + Turned;"
    - "}"
  distractors:
    - line: "	const FVector Turned = Current.RotateAngleAxis(DegreesPerSecond * DeltaSeconds, FVector::UpVector);"
      mistake: This turns the dummy's position around the world origin instead of turning its offset from the centre.
    - line: "	return Turned;"
      mistake: Turned is an offset from the centre, so the centre has to be added back to get a place in the world.
```
