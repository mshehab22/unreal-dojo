---
id: p20-turret-refactor
title: A turret with an aim switch
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [strategy]
skills: [strategy, refactoring]
terms: [instanced-subobjects, tobjectptr, fname, tarray]
prerequisites: [p20-mover-rules, p20-target-rules]
xp: 100
estimatedMinutes: 20
concepts:
  - A switch on a number that picks between ways of doing one job is a rule object waiting to be made
  - The rules already exist, so the refactor deletes the switch and the loop instead of writing them again
  - The turret asks its rule from its own place and turns the answer into a name
  - A turret with no rule aims at nothing
  - Names, signatures, and the aims that already worked stay exactly as they were
---

# Brief

After the refactor, the turret aims by the rule it holds, the switch and the number that drove it are gone, and every aim that worked before still picks the same dummy.

`ADojoP20Turret` is the yard's turret. It was written before the targeting rules existed. A number, `AimStyle`, tells `PickTarget` how to aim: 0 for the nearest dummy, 1 for the weakest, 2 for the farthest, and anything else like 0. `PickTarget` loops over the dummies, skips the ones that are down, and compares them inside a `switch`. A designer has since added a `Rule` property to the turret for the new levels, and nothing reads it.

Refactor the turret onto its rule:

- `PickTarget` asks `Rule` from the turret's own place and gives back the name of the dummy the rule picked. It gives back `NAME_None` when the turret has no rule and when the rule picks no dummy.
- Remove `AimStyle`, the switch, and the loop that skipped down dummies and compared them. The rules do that work now, and you must not copy it into the turret.
- Names, signatures, `Fire`, and the counters stay as they are. The turret names no rule class.

Compiles against earlier quests: p20-target-rules (`Quests/p20-target-rules/DojoP20Candidate.h`, `Quests/p20-target-rules/DojoP20TargetRule.h`, `Quests/p20-target-rules/DojoP20NearestRule.h`, `Quests/p20-target-rules/DojoP20WeakestRule.h`, `Quests/p20-target-rules/DojoP20FarthestRule.h`).

Two of the three tests pass on the starter and must pass after; one does not. Read its message.

## See it in the editor

Place a Dojo P20 Turret at the origin with three Candidates: Anvil at 500, 0, 0 with Health 30; Barrel at 200, 0, 0 with Health 50; and Crate at 300, 0, 0 with Health 10. In the Level Blueprint, on Begin Play, print Pick Target. Before the refactor, Aim Style 0 prints Barrel, 1 prints Crate, and 2 prints Anvil, and the Rule dropdown changes nothing. After the refactor there is no Aim Style: choose the Nearest Rule and it prints Barrel, the Weakest Rule and it prints Crate, the Farthest Rule and it prints Anvil, and with the Rule empty it prints None.

# Files

## DojoP20Turret.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Quests/p20-target-rules/DojoP20Candidate.h"
#include "Quests/p20-target-rules/DojoP20TargetRule.h"
#include "GameFramework/Actor.h"
#include "DojoP20Turret.generated.h"

/** The yard's turret: it fires at a dummy picked by its aim style, a number set on each turret. */
UCLASS()
class ADojoP20Turret : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP20Turret();

	/** The dummies in the yard, in the order they were set up. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turret")
	TArray<FDojoP20Candidate> Candidates;

	/** How the turret aims: 0 for the nearest dummy, 1 for the weakest, 2 for the farthest; anything else aims like 0. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turret")
	int32 AimStyle = 0;

	/** A targeting rule a designer can choose; added for the new levels, and nothing reads it yet. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Instanced, Category = "Turret")
	TObjectPtr<UDojoP20TargetRule> Rule;

	/** The name of the dummy the turret aims at from its own place, or NAME_None when none is standing. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	FName PickTarget() const;

	/** Picks a target, remembers it, counts the shot, and returns it. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	FName Fire();

	/** The target of the last shot, or NAME_None. */
	UFUNCTION(BlueprintPure, Category = "Turret")
	FName GetLastTarget() const;

	/** How many shots have been fired. */
	UFUNCTION(BlueprintPure, Category = "Turret")
	int32 GetShotCount() const;

private:
	/** The target of the last shot. */
	FName LastTarget = NAME_None;

	/** Shots fired. */
	int32 ShotCount = 0;
};
```

## DojoP20Turret.cpp

```cpp
#include "DojoP20Turret.h"

#include "Components/SceneComponent.h"

ADojoP20Turret::ADojoP20Turret()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

FName ADojoP20Turret::PickTarget() const
{
	int32 Best = INDEX_NONE;

	for (int32 Index = 0; Index < Candidates.Num(); Index++)
	{
		if (Candidates[Index].Health <= 0) continue;

		if (Best == INDEX_NONE)
		{
			Best = Index;
			continue;
		}

		const FDojoP20Candidate& Leader = Candidates[Best];
		const FDojoP20Candidate& Challenger = Candidates[Index];
		const double LeaderDistance = FVector::DistSquared(GetActorLocation(), Leader.Location);
		const double ChallengerDistance = FVector::DistSquared(GetActorLocation(), Challenger.Location);

		switch (AimStyle)
		{
		case 1:
			if (Challenger.Health < Leader.Health) Best = Index;
			break;
		case 2:
			if (ChallengerDistance > LeaderDistance) Best = Index;
			break;
		default:
			if (ChallengerDistance < LeaderDistance) Best = Index;
			break;
		}
	}

	return Best == INDEX_NONE ? NAME_None : Candidates[Best].Name;
}

FName ADojoP20Turret::Fire()
{
	LastTarget = PickTarget();
	ShotCount++;
	return LastTarget;
}

FName ADojoP20Turret::GetLastTarget() const
{
	return LastTarget;
}

int32 ADojoP20Turret::GetShotCount() const
{
	return ShotCount;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p20-target-rules/DojoP20FarthestRule.h"
#include "Quests/p20-target-rules/DojoP20NearestRule.h"
#include "Quests/p20-target-rules/DojoP20WeakestRule.h"
#include "Quests/p20-turret-refactor/DojoP20Turret.h"
#include "Support/DojoTestWorld.h"

namespace DojoP20TurretTest
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

	/** A turret at the origin in the test world with Anvil 500 out with 30 health, Barrel 200 out with 50, and Crate 300 out with 10. */
	ADojoP20Turret* MakeTurret(FDojoTestWorld& TestWorld)
	{
		ADojoP20Turret* Turret = TestWorld.SpawnActor<ADojoP20Turret>();
		if (Turret) Turret->Candidates = { MakeDummy(TEXT("Anvil"), 500.f, 30), MakeDummy(TEXT("Barrel"), 200.f, 50), MakeDummy(TEXT("Crate"), 300.f, 10) };
		return Turret;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TurretRefactor_NearestStillAimsAtTheNearest, "Dojo.P20.TurretRefactor.NearestStillAimsAtTheNearest", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The nearest aim picks the nearest standing dummy from the turret's own place and skips dummies that are down. */
bool FDojo_P20_TurretRefactor_NearestStillAimsAtTheNearest::RunTest(const FString& Parameters)
{
	using namespace DojoP20TurretTest;

	FDojoTestWorld TestWorld;

	ADojoP20Turret* Turret = MakeTurret(TestWorld);
	if (!TestNotNull(TEXT("Turret made"), Turret)) return false;

	Turret->Rule = NewObject<UDojoP20NearestRule>(Turret);
	TestEqual(TEXT("From the origin the barrel is nearest"), Turret->PickTarget(), FName(TEXT("Barrel")));

	Turret->Candidates[1].Health = 0;
	TestEqual(TEXT("With the barrel down the crate is nearest"), Turret->PickTarget(), FName(TEXT("Crate")));

	Turret->SetActorLocation(FVector(500.f, 0.f, 0.f));
	TestEqual(TEXT("From 500 along the anvil is nearest"), Turret->PickTarget(), FName(TEXT("Anvil")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TurretRefactor_FireRemembersTheShot, "Dojo.P20.TurretRefactor.FireRemembersTheShot", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Each shot returns its target, remembers it, and is counted, including a shot at nothing. */
bool FDojo_P20_TurretRefactor_FireRemembersTheShot::RunTest(const FString& Parameters)
{
	using namespace DojoP20TurretTest;

	FDojoTestWorld TestWorld;

	ADojoP20Turret* Turret = MakeTurret(TestWorld);
	if (!TestNotNull(TEXT("Turret made"), Turret)) return false;

	Turret->Rule = NewObject<UDojoP20NearestRule>(Turret);
	TestEqual(TEXT("The first shot goes to the barrel"), Turret->Fire(), FName(TEXT("Barrel")));
	TestEqual(TEXT("The turret remembers it"), Turret->GetLastTarget(), FName(TEXT("Barrel")));
	TestEqual(TEXT("One shot counted"), Turret->GetShotCount(), 1);

	Turret->Candidates.Reset();
	TestEqual(TEXT("A shot with nothing to aim at returns no name"), Turret->Fire(), FName(NAME_None));
	TestEqual(TEXT("It is still counted"), Turret->GetShotCount(), 2);
	TestEqual(TEXT("And it is the last target"), Turret->GetLastTarget(), FName(NAME_None));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_TurretRefactor_TheRuleDecidesTheAim, "Dojo.P20.TurretRefactor.TheRuleDecidesTheAim", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The rule the turret holds decides who it aims at, a changed rule changes the aim, and with no rule it aims at nothing. */
bool FDojo_P20_TurretRefactor_TheRuleDecidesTheAim::RunTest(const FString& Parameters)
{
	using namespace DojoP20TurretTest;

	FDojoTestWorld TestWorld;

	ADojoP20Turret* Turret = MakeTurret(TestWorld);
	if (!TestNotNull(TEXT("Turret made"), Turret)) return false;

	TestEqual(TEXT("With no rule the turret aims at nothing"), Turret->PickTarget(), FName(NAME_None));

	Turret->Rule = NewObject<UDojoP20WeakestRule>(Turret);
	TestEqual(TEXT("The weakest rule picks the crate"), Turret->PickTarget(), FName(TEXT("Crate")));

	Turret->Rule = NewObject<UDojoP20FarthestRule>(Turret);
	TestEqual(TEXT("The farthest rule picks the anvil"), Turret->PickTarget(), FName(TEXT("Anvil")));

	Turret->Candidates.Reset();
	TestEqual(TEXT("A rule with no dummies picks nothing"), Turret->PickTarget(), FName(NAME_None));

	return true;
}

#endif
```

# Hints

- `TheRuleDecidesTheAim` is the one that says the refactor is done. Read its message: who did the turret aim at, and who should it have?
- The turret already holds the rule it needs. What reads it?
- Ask the rule from the turret's own place, check the answer is a real place in the list, and read the name. Once nothing reads the number, the number goes, and so does the loop that compared dummies, since each rule skips the dummies that are down itself.

# Rubric

- PickTarget asks the turret's rule from the turret's location with the turret's dummies and returns the name at the index the rule answers with.
- With no rule, or an answer of INDEX_NONE, it returns NAME_None and does not read the list at that index.
- AimStyle, the switch, and the loop that skipped down dummies and compared them are gone from the turret, and no rule's work is copied into it.
- The turret names no rule class and tests no kind of rule.
- Fire, GetLastTarget, GetShotCount, the other members, and the names and signatures of all of them are unchanged.

# Alternative

If a project has only ever had these three aims, and no designer chooses one, the switch is the plainer code and would be fine to leave. The rule objects pay for themselves the day a fourth aim is wanted, or a designer wants to tune one aim for one turret, or the same aims are wanted by a second kind of actor. Notice also what the refactor leaves behind: a level that saved an `AimStyle` number on its turrets loses it, because the number no longer exists, and every turret now starts with the rule that was chosen, or with none. In a real project that needs a one-off fix-up that reads the old number and sets the matching rule, or a redirect of the old property.
