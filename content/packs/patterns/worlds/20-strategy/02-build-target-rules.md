---
id: p20-target-rules
title: A launcher that asks a rule who to shoot
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [strategy]
skills: [strategy, object-model]
terms: [uobject, abstract-specifier, instanced-subobjects, tobjectptr, fname, virtual-function]
prerequisites: [p20-one-function-every-aim]
xp: 60
estimatedMinutes: 20
concepts:
  - One abstract UObject class declares the question, and each rule is a child class that answers it
  - An Instanced property on the launcher lets a designer pick the rule's class in Details and tune its settings there
  - The launcher asks the rule and never names a rule class
  - A rule that has nothing to say, or that is missing, makes the launcher aim at nothing instead of failing
---

# Brief

When you press Play with the setup below, a launcher fires at the dummy its rule picks, and changing the rule in Details changes the target with no change to the launcher.

`ADojoP20Launcher` is a practice launcher. It has a list of `Candidates`, the dummies in the yard, each with a name, a location, and a health. It does not decide which dummy to shoot. It holds one `Rule`, an object of a class derived from `UDojoP20TargetRule`, and asks it `ChooseTarget`, which gets the launcher's place and the dummies and answers with the index of the dummy to aim at, or `INDEX_NONE` when there is none. Three rules are written for you: nearest, weakest, and farthest. Each skips a dummy at 0 health or below, and on a tie each keeps the dummy that comes first in the list.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `PickTarget`. It asks the rule from the launcher's own place and gives back the name of the dummy the rule picked. It gives back `NAME_None` when the launcher has no rule and when the rule picks no dummy.

## See it in the editor

Drag a Dojo P20 Launcher from the Place Actors panel into the level at the origin; it has no mesh, so find it in the Outliner. In Details, under Launcher, add three Candidates: Anvil at 500, 0, 0 with Health 30; Barrel at 200, 0, 0 with Health 50; and Crate at 300, 0, 0 with Health 10. Open the Rule dropdown: it lists the three rule classes and not the base class. Choose Dojo P20 Nearest Rule. In the Level Blueprint, select the launcher in the Outliner, right click the graph and choose Create a Reference to Dojo P20 Launcher, then on Begin Play call Pick Target on it and print the result: Barrel. Go back and choose the Weakest Rule instead: Crate. Choose the Farthest Rule: Anvil. The launcher is the same each time.

# Files

## DojoP20Candidate.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20Candidate.generated.h"

/** One practice dummy as a targeting rule sees it: its name, where it stands, and how much health it has left. */
USTRUCT(BlueprintType)
struct FDojoP20Candidate
{
	GENERATED_BODY()

	/** The dummy's name. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Candidate")
	FName Name = NAME_None;

	/** Where the dummy stands. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Candidate")
	FVector Location = FVector::ZeroVector;

	/** Health left; a dummy at 0 or below is down and is not a target. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Candidate")
	int32 Health = 30;
};
```

## DojoP20TargetRule.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20Candidate.h"
#include "UObject/Object.h"
#include "DojoP20TargetRule.generated.h"

/** The shape every targeting rule shares: given where the launcher is and the dummies, say which one to aim at. The launcher knows only this class. */
UCLASS(Abstract, Blueprintable, EditInlineNew) // @explain: Abstract stops anyone making a bare base rule, and EditInlineNew lets the Details panel create rules of its subclasses inside the object that owns them.
class UDojoP20TargetRule : public UObject
{
	GENERATED_BODY()

public:
	/** The index in Candidates of the dummy to aim at, or INDEX_NONE when there is none; the base rule never picks one. */
	virtual int32 ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const;
};
```

## DojoP20TargetRule.cpp

```cpp
#include "DojoP20TargetRule.h"

int32 UDojoP20TargetRule::ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const
{
	return INDEX_NONE;
}
```

## DojoP20NearestRule.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20TargetRule.h"
#include "DojoP20NearestRule.generated.h"

/** Aims at the standing dummy closest to the launcher; on equal distance the earlier one in the list wins. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20NearestRule : public UDojoP20TargetRule
{
	GENERATED_BODY()

public:
	/** The standing dummy nearest From, or INDEX_NONE when none is standing. */
	virtual int32 ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const override;
};
```

## DojoP20NearestRule.cpp

```cpp
#include "DojoP20NearestRule.h"

int32 UDojoP20NearestRule::ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const
{
	int32 Best = INDEX_NONE;
	double BestDistance = 0.0;

	for (int32 Index = 0; Index < Candidates.Num(); Index++)
	{
		if (Candidates[Index].Health <= 0) continue;

		// Strictly nearer only, so on a tie the earlier dummy keeps its place.
		const double Distance = FVector::DistSquared(From, Candidates[Index].Location);
		if (Best == INDEX_NONE || Distance < BestDistance) // @explain: Strictly nearer, never equal, so when two dummies are the same distance the one earlier in the list is kept.
		{
			Best = Index;
			BestDistance = Distance;
		}
	}

	return Best;
}
```

## DojoP20WeakestRule.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20TargetRule.h"
#include "DojoP20WeakestRule.generated.h"

/** Aims at the standing dummy with the least health; on equal health the earlier one in the list wins. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20WeakestRule : public UDojoP20TargetRule
{
	GENERATED_BODY()

public:
	/** The standing dummy with the lowest health, or INDEX_NONE when none is standing. */
	virtual int32 ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const override;
};
```

## DojoP20WeakestRule.cpp

```cpp
#include "DojoP20WeakestRule.h"

int32 UDojoP20WeakestRule::ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const
{
	int32 Best = INDEX_NONE;

	for (int32 Index = 0; Index < Candidates.Num(); Index++)
	{
		if (Candidates[Index].Health <= 0) continue;

		// Strictly weaker only, so on a tie the earlier dummy keeps its place.
		if (Best == INDEX_NONE || Candidates[Index].Health < Candidates[Best].Health) Best = Index;
	}

	return Best;
}
```

## DojoP20FarthestRule.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20TargetRule.h"
#include "DojoP20FarthestRule.generated.h"

/** Aims at the standing dummy farthest from the launcher; on equal distance the earlier one in the list wins. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20FarthestRule : public UDojoP20TargetRule
{
	GENERATED_BODY()

public:
	/** The standing dummy farthest from From, or INDEX_NONE when none is standing. */
	virtual int32 ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const override;
};
```

## DojoP20FarthestRule.cpp

```cpp
#include "DojoP20FarthestRule.h"

int32 UDojoP20FarthestRule::ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const
{
	int32 Best = INDEX_NONE;
	double BestDistance = 0.0;

	for (int32 Index = 0; Index < Candidates.Num(); Index++)
	{
		if (Candidates[Index].Health <= 0) continue;

		// Strictly farther only, so on a tie the earlier dummy keeps its place.
		const double Distance = FVector::DistSquared(From, Candidates[Index].Location);
		if (Best == INDEX_NONE || Distance > BestDistance)
		{
			Best = Index;
			BestDistance = Distance;
		}
	}

	return Best;
}
```

## DojoP20Launcher.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP20Candidate.h"
#include "DojoP20TargetRule.h"
#include "GameFramework/Actor.h"
#include "DojoP20Launcher.generated.h"

/** A practice launcher that fires at whichever dummy its targeting rule picks; the rule is an object a designer chooses and tunes on each launcher. */
UCLASS()
class ADojoP20Launcher : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP20Launcher();

	/** The dummies in the yard, in the order they were set up. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Launcher")
	TArray<FDojoP20Candidate> Candidates;

	/** The rule that picks the target; a designer chooses its class in Details and tunes its settings there. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Instanced, Category = "Launcher")
	TObjectPtr<UDojoP20TargetRule> Rule; // @explain: Instanced makes the Details panel offer a list of rule classes and create the rule inside this launcher, so each launcher owns and tunes its own rule.

	/** The name of the dummy the rule picks from the launcher's own place, or NAME_None when there is no rule or no dummy to pick. */
	UFUNCTION(BlueprintCallable, Category = "Launcher")
	FName PickTarget() const;

	/** Picks a target, remembers it as the last target, counts the shot, and returns it; NAME_None counts as a shot at nothing. */
	UFUNCTION(BlueprintCallable, Category = "Launcher")
	FName Fire();

	/** The target of the last shot, or NAME_None. */
	UFUNCTION(BlueprintPure, Category = "Launcher")
	FName GetLastTarget() const;

	/** How many shots have been fired. */
	UFUNCTION(BlueprintPure, Category = "Launcher")
	int32 GetShotCount() const;

private:
	/** The target of the last shot. */
	FName LastTarget = NAME_None;

	/** Shots fired. */
	int32 ShotCount = 0;
};
```

## DojoP20Launcher.cpp

```cpp
#include "DojoP20Launcher.h"

#include "Components/SceneComponent.h"

ADojoP20Launcher::ADojoP20Launcher()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

FName ADojoP20Launcher::PickTarget() const
{
	return NAME_None;
}

FName ADojoP20Launcher::Fire()
{
	LastTarget = PickTarget(); // @explain: Fire asks PickTarget and never names a rule class, so a new rule needs no change here.
	ShotCount++;
	return LastTarget;
}

FName ADojoP20Launcher::GetLastTarget() const
{
	return LastTarget;
}

int32 ADojoP20Launcher::GetShotCount() const
{
	return ShotCount;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p20-target-rules/DojoP20FarthestRule.h"
#include "Quests/p20-target-rules/DojoP20Launcher.h"
#include "Quests/p20-target-rules/DojoP20NearestRule.h"
#include "Quests/p20-target-rules/DojoP20WeakestRule.h"
#include "Support/DojoTestWorld.h"

namespace DojoP20LauncherTest
{
	/** One dummy for a test: a name, a place along X, and a health. */
	FDojoP20Candidate MakeDummy(const TCHAR* DummyName, float AlongX, int32 DummyHealth)
	{
		FDojoP20Candidate Dummy;
		Dummy.Name = DummyName;
		Dummy.Location = FVector(AlongX, 0.f, 0.f);
		Dummy.Health = DummyHealth;
		return Dummy;
	}

	/** Puts the three dummies of the editor setup in a launcher: Anvil 500 out with 30 health, Barrel 200 out with 50, Crate 300 out with 10. */
	void FillYard(ADojoP20Launcher* Launcher)
	{
		Launcher->Candidates = { MakeDummy(TEXT("Anvil"), 500.f, 30), MakeDummy(TEXT("Barrel"), 200.f, 50), MakeDummy(TEXT("Crate"), 300.f, 10) };
	}

	/** A launcher at the origin in the test world with the three dummies and no rule. */
	ADojoP20Launcher* MakeLauncher(FDojoTestWorld& TestWorld)
	{
		ADojoP20Launcher* Launcher = TestWorld.SpawnActor<ADojoP20Launcher>();
		if (Launcher) FillYard(Launcher);
		return Launcher;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TargetRules_RuleDecidesTheTarget, "Dojo.P20.TargetRules.RuleDecidesTheTarget", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The same launcher and the same dummies give a different target for each rule it holds. */
bool FDojo_P20_TargetRules_RuleDecidesTheTarget::RunTest(const FString& Parameters)
{
	using namespace DojoP20LauncherTest;

	FDojoTestWorld TestWorld;

	ADojoP20Launcher* Launcher = MakeLauncher(TestWorld);
	if (!TestNotNull(TEXT("Launcher made"), Launcher)) return false;

	Launcher->Rule = NewObject<UDojoP20NearestRule>(Launcher);
	TestEqual(TEXT("The nearest rule picks the barrel, 200 away"), Launcher->PickTarget(), FName(TEXT("Barrel")));

	Launcher->Rule = NewObject<UDojoP20WeakestRule>(Launcher);
	TestEqual(TEXT("The weakest rule picks the crate, health 10"), Launcher->PickTarget(), FName(TEXT("Crate")));

	Launcher->Rule = NewObject<UDojoP20FarthestRule>(Launcher);
	TestEqual(TEXT("The farthest rule picks the anvil, 500 away"), Launcher->PickTarget(), FName(TEXT("Anvil")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TargetRules_AimsFromTheLaunchersPlace, "Dojo.P20.TargetRules.AimsFromTheLaunchersPlace", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The rule is given the launcher's own place, so moving the launcher changes who is nearest and who is farthest. */
bool FDojo_P20_TargetRules_AimsFromTheLaunchersPlace::RunTest(const FString& Parameters)
{
	using namespace DojoP20LauncherTest;

	FDojoTestWorld TestWorld;

	ADojoP20Launcher* Launcher = MakeLauncher(TestWorld);
	if (!TestNotNull(TEXT("Launcher made"), Launcher)) return false;

	Launcher->SetActorLocation(FVector(500.f, 0.f, 0.f));

	Launcher->Rule = NewObject<UDojoP20NearestRule>(Launcher);
	TestEqual(TEXT("Standing on the anvil, the anvil is nearest"), Launcher->PickTarget(), FName(TEXT("Anvil")));

	Launcher->Rule = NewObject<UDojoP20FarthestRule>(Launcher);
	TestEqual(TEXT("And the barrel, 300 away, is farthest"), Launcher->PickTarget(), FName(TEXT("Barrel")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TargetRules_DownDummiesAreNotTargets, "Dojo.P20.TargetRules.DownDummiesAreNotTargets", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A dummy at 0 health or below is never picked, whatever the rule, and a yard of down dummies gives no target. */
bool FDojo_P20_TargetRules_DownDummiesAreNotTargets::RunTest(const FString& Parameters)
{
	using namespace DojoP20LauncherTest;

	FDojoTestWorld TestWorld;

	ADojoP20Launcher* Launcher = MakeLauncher(TestWorld);
	if (!TestNotNull(TEXT("Launcher made"), Launcher)) return false;

	Launcher->Candidates[1].Health = 0;
	Launcher->Rule = NewObject<UDojoP20NearestRule>(Launcher);
	TestEqual(TEXT("With the barrel down, the crate is nearest"), Launcher->PickTarget(), FName(TEXT("Crate")));

	Launcher->Candidates[2].Health = -5;
	Launcher->Rule = NewObject<UDojoP20WeakestRule>(Launcher);
	TestEqual(TEXT("With the crate down as well, the weakest left is the anvil"), Launcher->PickTarget(), FName(TEXT("Anvil")));

	Launcher->Candidates[0].Health = 0;
	TestEqual(TEXT("With every dummy down there is no target"), Launcher->PickTarget(), FName(NAME_None));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TargetRules_TiesKeepTheEarlierDummy, "Dojo.P20.TargetRules.TiesKeepTheEarlierDummy", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two dummies that tie for a rule leave the choice with the one earlier in the list. */
bool FDojo_P20_TargetRules_TiesKeepTheEarlierDummy::RunTest(const FString& Parameters)
{
	using namespace DojoP20LauncherTest;

	FDojoTestWorld TestWorld;

	ADojoP20Launcher* Launcher = TestWorld.SpawnActor<ADojoP20Launcher>();
	if (!TestNotNull(TEXT("Launcher made"), Launcher)) return false;

	Launcher->Candidates = { MakeDummy(TEXT("First"), 400.f, 20), MakeDummy(TEXT("Second"), 400.f, 20) };

	Launcher->Rule = NewObject<UDojoP20NearestRule>(Launcher);
	TestEqual(TEXT("Nearest keeps the first"), Launcher->PickTarget(), FName(TEXT("First")));

	Launcher->Rule = NewObject<UDojoP20WeakestRule>(Launcher);
	TestEqual(TEXT("Weakest keeps the first"), Launcher->PickTarget(), FName(TEXT("First")));

	Launcher->Rule = NewObject<UDojoP20FarthestRule>(Launcher);
	TestEqual(TEXT("Farthest keeps the first"), Launcher->PickTarget(), FName(TEXT("First")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TargetRules_NoRuleAimsAtNothing, "Dojo.P20.TargetRules.NoRuleAimsAtNothing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A launcher with no rule, or with no dummies, aims at nothing and does not fail. */
bool FDojo_P20_TargetRules_NoRuleAimsAtNothing::RunTest(const FString& Parameters)
{
	using namespace DojoP20LauncherTest;

	FDojoTestWorld TestWorld;

	ADojoP20Launcher* Launcher = MakeLauncher(TestWorld);
	if (!TestNotNull(TEXT("Launcher made"), Launcher)) return false;

	TestEqual(TEXT("No rule, no target"), Launcher->PickTarget(), FName(NAME_None));

	Launcher->Rule = NewObject<UDojoP20NearestRule>(Launcher);
	Launcher->Candidates.Reset();
	TestEqual(TEXT("A rule and no dummies, no target"), Launcher->PickTarget(), FName(NAME_None));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TargetRules_FireRemembersTheShot, "Dojo.P20.TargetRules.FireRemembersTheShot", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Each shot returns its target, remembers it, and is counted, including a shot at nothing. */
bool FDojo_P20_TargetRules_FireRemembersTheShot::RunTest(const FString& Parameters)
{
	using namespace DojoP20LauncherTest;

	FDojoTestWorld TestWorld;

	ADojoP20Launcher* Launcher = MakeLauncher(TestWorld);
	if (!TestNotNull(TEXT("Launcher made"), Launcher)) return false;

	Launcher->Rule = NewObject<UDojoP20NearestRule>(Launcher);
	TestEqual(TEXT("The first shot goes to the barrel"), Launcher->Fire(), FName(TEXT("Barrel")));
	TestEqual(TEXT("The launcher remembers it"), Launcher->GetLastTarget(), FName(TEXT("Barrel")));
	TestEqual(TEXT("One shot counted"), Launcher->GetShotCount(), 1);

	Launcher->Rule = NewObject<UDojoP20WeakestRule>(Launcher);
	TestEqual(TEXT("After the rule is changed the next shot follows the new rule"), Launcher->Fire(), FName(TEXT("Crate")));
	TestEqual(TEXT("Two shots counted"), Launcher->GetShotCount(), 2);

	Launcher->Candidates.Reset();
	TestEqual(TEXT("A shot with nothing to aim at returns no name"), Launcher->Fire(), FName(NAME_None));
	TestEqual(TEXT("It is still counted"), Launcher->GetShotCount(), 3);
	TestEqual(TEXT("And it is the last target"), Launcher->GetLastTarget(), FName(NAME_None));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TargetRules_EachLauncherOwnsItsRule, "Dojo.P20.TargetRules.EachLauncherOwnsItsRule", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two launchers over the same dummies, each with its own rule, aim differently, and changing one rule leaves the other launcher alone. */
bool FDojo_P20_TargetRules_EachLauncherOwnsItsRule::RunTest(const FString& Parameters)
{
	using namespace DojoP20LauncherTest;

	FDojoTestWorld TestWorld;

	ADojoP20Launcher* Near = MakeLauncher(TestWorld);
	ADojoP20Launcher* Far = MakeLauncher(TestWorld);
	if (!TestNotNull(TEXT("First launcher made"), Near) || !TestNotNull(TEXT("Second launcher made"), Far)) return false;

	Near->Rule = NewObject<UDojoP20NearestRule>(Near);
	Far->Rule = NewObject<UDojoP20FarthestRule>(Far);
	TestEqual(TEXT("The first launcher aims at the barrel"), Near->PickTarget(), FName(TEXT("Barrel")));
	TestEqual(TEXT("The second aims at the anvil"), Far->PickTarget(), FName(TEXT("Anvil")));

	Far->Rule = NewObject<UDojoP20WeakestRule>(Far);
	TestEqual(TEXT("Changing the second launcher's rule moves its aim to the crate"), Far->PickTarget(), FName(TEXT("Crate")));
	TestEqual(TEXT("And leaves the first launcher aiming at the barrel"), Near->PickTarget(), FName(TEXT("Barrel")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TargetRules_DetailsCanMakeTheRule, "Dojo.P20.TargetRules.DetailsCanMakeTheRule", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The Rule property is Instanced, the base rule is abstract, and its children can be made inline, which is what the Details panel needs. */
bool FDojo_P20_TargetRules_DetailsCanMakeTheRule::RunTest(const FString& Parameters)
{
	const FObjectProperty* RuleProperty = FindFProperty<FObjectProperty>(ADojoP20Launcher::StaticClass(), TEXT("Rule"));
	if (!TestNotNull(TEXT("The launcher has a Rule property"), RuleProperty)) return false;

	TestTrue(TEXT("Rule is Instanced, so Details creates the rule inside the launcher"), RuleProperty->HasAnyPropertyFlags(CPF_InstancedReference));
	TestTrue(TEXT("The base rule class is abstract, so Details never offers it"), UDojoP20TargetRule::StaticClass()->HasAnyClassFlags(CLASS_Abstract));
	TestTrue(TEXT("The nearest rule can be made inline"), UDojoP20NearestRule::StaticClass()->HasAnyClassFlags(CLASS_EditInlineNew));
	TestFalse(TEXT("The nearest rule is not abstract"), UDojoP20NearestRule::StaticClass()->HasAnyClassFlags(CLASS_Abstract));

	return true;
}

#endif
```

# Hints

- Start with the case that has nothing to ask: what should the launcher give back when it holds no rule?
- The rule has to be told where to aim from, so ask which function of an actor says where it is.
- Ask the rule, and read a name from the list only when its answer is a real place in it.

# Rubric

- PickTarget asks the launcher's rule and returns the name of the dummy at the index the rule answers with.
- It passes the launcher's own location and the launcher's dummies to the rule.
- With no rule it returns NAME_None and does not touch the pointer.
- When the rule answers INDEX_NONE, it returns NAME_None and does not read the list at that index.
- It does not name any rule class, test which kind of rule it holds, or change the rule, the dummies, or any counter.

# Alternative

A `TFunction` member, or a delegate, would also let a launcher be handed a way of choosing without a class for each way. That is lighter when the choice is made in code and has no settings. It cannot be chosen in the Details panel, it cannot hold settings a designer tunes there, it cannot keep a memory between calls without a captured variable, and a Blueprint cannot derive from it. A rule object takes more files and gives all four. Pick the object when designers choose and tune, and the function when the choice is a one-line tweak in code.

# Parsons

```yaml
- id: weakest-rule
  prompt: Put the weakest rule's ChooseTarget in order.
  lines:
    - "int32 UDojoP20WeakestRule::ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const"
    - "{"
    - "	int32 Best = INDEX_NONE;"
    - "	for (int32 Index = 0; Index < Candidates.Num(); Index++)"
    - "	{"
    - "		if (Candidates[Index].Health <= 0) continue;"
    - "		if (Best == INDEX_NONE || Candidates[Index].Health < Candidates[Best].Health) Best = Index;"
    - "	}"
    - "	return Best;"
    - "}"
  distractors:
    - line: "		if (Candidates[Index].Health < Candidates[Best].Health) Best = Index;"
      mistake: On the first dummy Best is still INDEX_NONE, so this reads the list at a place that does not exist.
    - line: "	return Candidates[Best].Name;"
      mistake: The rule answers with an index; turning it into a name is the launcher's job, and with no dummy standing there is no Best to read.
```
