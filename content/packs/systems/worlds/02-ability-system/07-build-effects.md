---
id: s2-effects
title: A family of effects with one toolbox
order: 7
kind: build
scaffold: blank
difficulty: 4
patterns: [subclass-sandbox]
skills: [inheritance, reflection]
terms: [abstract-specifier, instanced-subobjects, tactoriterator, add-actor-offset, uproperty]
prerequisites: [s2-instanced-effects, s2-ability-component]
xp: 100
estimatedMinutes: 35
concepts:
  - One public entry that checks the user, one hook each kind fills in, and protected tools the hooks share
  - Effects that hold settings and no state, because they live inside shared assets
  - A push that moves each target straight away from the user, flat along the ground
---

# Brief

When a hero facing +Y applies a dash effect of 300, it lands 300 units further along +Y; when it applies a push effect of radius 400 and distance 300, every actor tagged `Target` within 400 units moves 300 units straight away from the hero, and the hero, untagged actors, and targets further away stay put.

Write the effect family from nothing: an abstract base and two kinds. The tests use this public interface, so keep these names:

- `UDojoS2Effect`, a `UObject` marked `Abstract`, `EditInlineNew`, and `BlueprintType`, so designers can create its children inside an asset and in a Blueprint graph, and never the base itself.
  - `UPROPERTY(EditAnywhere) FName TargetTag`, defaulting to `Target`: only actors whose actor tags include it are targets.
  - `UFUNCTION(BlueprintCallable) bool Apply(AActor* User)`: the one public entry. It does nothing and returns false when `User` is null or not a live actor in a world; otherwise it runs the kind's hook and returns true.
  - `virtual void OnApply(AActor* User)`, protected: the hook each kind overrides, which runs only with a live user. The base's version does nothing.
  - Protected tools for the hooks: `void MoveActor(AActor* Target, const FVector& Offset) const` moves an actor by an offset in world space, and `TArray<AActor*> FindTargetsNear(const FVector& Center, float Radius, const AActor* Ignore) const` finds every live actor carrying `TargetTag` within `Radius` of `Center`, leaving out `Ignore` (the user).
- `UDojoS2DashEffect` with `UPROPERTY(EditAnywhere) float Distance = 300.f`: moves the user `Distance` along the way it faces.
- `UDojoS2PushEffect` with `UPROPERTY(EditAnywhere) float Radius = 400.f` and `float Distance = 300.f`: every target within `Radius` of the user moves `Distance` straight away from the user, measured flat (ignore height when choosing the direction). A target standing exactly on the user goes the way the user faces.

The kinds use only the base's tools: neither one searches the world or moves an actor on its own. An effect keeps nothing between uses.

Dependency direction: an effect is handed its user and finds its targets by their actor tag. Neither the user nor the targets know that effects exist, and an effect holds no pointer to either after `Apply` returns.

Each class gets its own header and `.cpp`, named after the class: `DojoS2Effect`, `DojoS2DashEffect`, `DojoS2PushEffect`.

This is the last piece of the Sparring Ring boss.

## See it in the editor

Place a `BP_Sparrer` with a cube mesh added to it, so you can see it, and three cubes. Set each cube's Mobility to Movable in Details, because a Static actor cannot be moved. Add the actor tag `Target` to two of them in Details under Actor, Tags, and put them about 200 units from the sparrer. In the level Blueprint, on the 1 key, Construct Object from Class with `DojoS2PushEffect` and call Apply with the sparrer; on the 2 key do the same with `DojoS2DashEffect`. Press Play: 1 shoves the two tagged cubes 300 away and leaves the untagged one, and 2 moves the sparrer 300 ahead. Then open `DA_Dash` and look for an Effects field: there is none yet, because the boss adds it.

# Files

## DojoS2Effect.h

```cpp
// Declare UDojoS2Effect here.
```

## DojoS2Effect.cpp

```cpp
// Define UDojoS2Effect here.
```

## DojoS2DashEffect.h

```cpp
// Declare UDojoS2DashEffect here.
```

## DojoS2DashEffect.cpp

```cpp
// Define UDojoS2DashEffect here.
```

## DojoS2PushEffect.h

```cpp
// Declare UDojoS2PushEffect here.
```

## DojoS2PushEffect.cpp

```cpp
// Define UDojoS2PushEffect here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s2-effects/DojoS2DashEffect.h"
#include "Quests/s2-effects/DojoS2Effect.h"
#include "Quests/s2-effects/DojoS2PushEffect.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS2EffectsTest
{
	/** A bare actor at a place, tagged as a target when asked. */
	ADojoTestActor* Place(FDojoTestWorld& TestWorld, const FVector& Where, bool bTarget)
	{
		ADojoTestActor* Actor = TestWorld.SpawnActor<ADojoTestActor>();
		Actor->SetActorLocation(Where);

		if (bTarget)
		{
			Actor->Tags.Add(TEXT("Target"));
		}

		return Actor;
	}

	/** True when two points are within one unit of each other. */
	bool Near(const FVector& Actual, const FVector& Expected)
	{
		return FVector::Dist(Actual, Expected) <= 1.f;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_Effects_DashMovesAhead, "Dojo.S2.Effects.DashMovesAhead", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A dash moves its user along the way it faces, and refuses a missing user. */
bool FDojo_S2_Effects_DashMovesAhead::RunTest(const FString& Parameters)
{
	using namespace DojoS2EffectsTest;

	FDojoTestWorld TestWorld;
	ADojoTestActor* Hero = Place(TestWorld, FVector(100.f, 0.f, 50.f), false);
	Hero->SetActorRotation(FRotator(0.f, 90.f, 0.f));

	UDojoS2DashEffect* Dash = NewObject<UDojoS2DashEffect>();
	TestEqual(TEXT("A dash defaults to 300"), Dash->Distance, 300.f);

	TestTrue(TEXT("A dash with a hero runs"), Dash->Apply(Hero));
	TestTrue(TEXT("The hero facing +Y moved 300 along +Y"), Near(Hero->GetActorLocation(), FVector(100.f, 300.f, 50.f)));

	Dash->Distance = 120.f;
	Dash->Apply(Hero);
	TestTrue(TEXT("The distance is a setting"), Near(Hero->GetActorLocation(), FVector(100.f, 420.f, 50.f)));

	TestFalse(TEXT("A dash with no user does nothing"), Dash->Apply(nullptr));

	Hero->Destroy();
	TestFalse(TEXT("A dash with a destroyed user does nothing"), Dash->Apply(Hero));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_Effects_PushReachesOnlyTargets, "Dojo.S2.Effects.PushReachesOnlyTargets", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A push moves tagged targets within its radius straight away from the user, flat, and leaves everything else. */
bool FDojo_S2_Effects_PushReachesOnlyTargets::RunTest(const FString& Parameters)
{
	using namespace DojoS2EffectsTest;

	FDojoTestWorld TestWorld;
	ADojoTestActor* Hero = Place(TestWorld, FVector::ZeroVector, true);
	ADojoTestActor* Ahead = Place(TestWorld, FVector(200.f, 0.f, 0.f), true);
	ADojoTestActor* Behind = Place(TestWorld, FVector(0.f, -399.f, 0.f), true);
	ADojoTestActor* Corner = Place(TestWorld, FVector(100.f, 100.f, 0.f), true);
	ADojoTestActor* Raised = Place(TestWorld, FVector(-200.f, 0.f, 150.f), true);
	ADojoTestActor* TooFar = Place(TestWorld, FVector(401.f, 0.f, 0.f), true);
	ADojoTestActor* Untagged = Place(TestWorld, FVector(0.f, 150.f, 0.f), false);
	ADojoTestActor* OnTop = Place(TestWorld, FVector::ZeroVector, true);

	UDojoS2PushEffect* Push = NewObject<UDojoS2PushEffect>();
	TestEqual(TEXT("A push reaches 400 by default"), Push->Radius, 400.f);
	TestEqual(TEXT("A push moves 300 by default"), Push->Distance, 300.f);
	TestTrue(TEXT("Targets carry the Target tag by default"), Push->TargetTag == FName(TEXT("Target")));

	TestTrue(TEXT("A push with a hero runs"), Push->Apply(Hero));

	TestTrue(TEXT("The hero, though tagged, does not push itself"), Near(Hero->GetActorLocation(), FVector::ZeroVector));
	TestTrue(TEXT("A target ahead moves 300 further ahead"), Near(Ahead->GetActorLocation(), FVector(500.f, 0.f, 0.f)));
	TestTrue(TEXT("A target at 399 is in reach"), Near(Behind->GetActorLocation(), FVector(0.f, -699.f, 0.f)));
	TestTrue(TEXT("A target on the diagonal moves along the diagonal"), Near(Corner->GetActorLocation(), FVector(312.13f, 312.13f, 0.f)));
	TestTrue(TEXT("A raised target moves flat, keeping its height"), Near(Raised->GetActorLocation(), FVector(-500.f, 0.f, 150.f)));
	TestTrue(TEXT("A target at 401 is out of reach"), Near(TooFar->GetActorLocation(), FVector(401.f, 0.f, 0.f)));
	TestTrue(TEXT("An untagged actor is not a target"), Near(Untagged->GetActorLocation(), FVector(0.f, 150.f, 0.f)));
	TestTrue(TEXT("A target on the hero goes the way the hero faces"), Near(OnTop->GetActorLocation(), FVector(300.f, 0.f, 0.f)));

	Push->Apply(Hero);
	TestTrue(TEXT("A second push reaches the target now at 300 and moves it again"), Near(OnTop->GetActorLocation(), FVector(600.f, 0.f, 0.f)));
	TestTrue(TEXT("The target already at 500 stays"), Near(Ahead->GetActorLocation(), FVector(500.f, 0.f, 0.f)));

	Push->TargetTag = TEXT("Crate");
	Untagged->Tags.Add(TEXT("Crate"));
	Push->Apply(Hero);
	TestTrue(TEXT("The target tag is a setting"), Near(Untagged->GetActorLocation(), FVector(0.f, 450.f, 0.f)));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_Effects_FamilyShape, "Dojo.S2.Effects.FamilyShape", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the base is abstract and creatable inline, and that the kinds are real children with editable settings. */
bool FDojo_S2_Effects_FamilyShape::RunTest(const FString& Parameters)
{
	UClass* Base = UDojoS2Effect::StaticClass();
	TestTrue(TEXT("The base is abstract"), Base->HasAnyClassFlags(CLASS_Abstract));
	TestTrue(TEXT("The base can be created inside an asset"), Base->HasAnyClassFlags(CLASS_EditInlineNew));
#if WITH_METADATA
	TestTrue(TEXT("The family can be used in Blueprint graphs"), Base->GetBoolMetaDataHierarchical(TEXT("BlueprintType")));
#endif

	const UFunction* ApplyFunction = Base->FindFunctionByName(TEXT("Apply"));
	if (TestNotNull(TEXT("Apply is a UFUNCTION"), ApplyFunction))
	{
		TestTrue(TEXT("Apply can be called from Blueprint"), ApplyFunction->HasAnyFunctionFlags(FUNC_BlueprintCallable));
	}

	for (UClass* Kind : { UDojoS2DashEffect::StaticClass(), UDojoS2PushEffect::StaticClass() })
	{
		TestTrue(FString::Printf(TEXT("%s is an effect"), *Kind->GetName()), Kind->IsChildOf(Base));
		TestFalse(FString::Printf(TEXT("%s is not abstract"), *Kind->GetName()), Kind->HasAnyClassFlags(CLASS_Abstract));
		TestTrue(FString::Printf(TEXT("%s can be created inside an asset"), *Kind->GetName()), Kind->HasAnyClassFlags(CLASS_EditInlineNew));
	}

	struct FSetting
	{
		UClass* Owner;
		const TCHAR* Name;
	};

	const FSetting Settings[] = {
		{ Base, TEXT("TargetTag") },
		{ UDojoS2DashEffect::StaticClass(), TEXT("Distance") },
		{ UDojoS2PushEffect::StaticClass(), TEXT("Radius") },
		{ UDojoS2PushEffect::StaticClass(), TEXT("Distance") },
	};

	for (const FSetting& Setting : Settings)
	{
		const FProperty* Property = Setting.Owner->FindPropertyByName(Setting.Name);
		if (!TestNotNull(FString::Printf(TEXT("%s is a UPROPERTY"), Setting.Name), Property)) continue;

		TestTrue(FString::Printf(TEXT("%s is editable in Details"), Setting.Name), Property->HasAnyPropertyFlags(CPF_Edit));
	}

	return true;
}

#endif
```

# Hints

- Start with the base: one public function that refuses a missing or destroyed user and otherwise calls the hook, a hook with an empty body, and the two tools. Then each kind is a few lines that only call tools.
- `TActorIterator<AActor>` from `EngineUtils.h` walks every actor in a world, and an effect has no world of its own, so take the world from the actor you were handed; `ActorHasTag` checks an actor tag, `AddActorWorldOffset` moves an actor by an offset, and `GetActorForwardVector` is the way an actor faces.
- For the push, take the vector from the user to the target, set its Z to 0, and normalize it with `GetSafeNormal`; `IsNearlyZero` tells you when there is no direction to normalize.

# Rubric

- The base is abstract and `EditInlineNew`, with one public entry that refuses a missing user, one protected hook, and protected tools.
- Each kind overrides only the hook and uses only the base's tools; neither kind searches the world or moves an actor by itself.
- The dash moves the user along its facing by its distance.
- The push moves each tagged target within its radius straight away from the user, flat, leaves the user and everything else alone, and handles a target standing on the user.
- The effects keep no state between uses and hold no pointer to the user or the targets, which know nothing about effects; every setting is editable.

# Alternative

Each effect could be a function in the ability component behind a switch on an enum, `EDojoS2EffectKind::EEK_Dash` and `EEK_Push`. That keeps everything in one file, but every new kind edits that switch and its settings pile up in one struct whether a kind uses them or not. A family of classes lets a new kind arrive as one new file, and the base keeps the one place where effects touch the world: if pushes should later sweep against walls, only `MoveActor` changes. The price is that the base must stay small; a tool used by only one kind belongs in that kind. This is the Subclass Sandbox pattern from Pack 2's "Many kinds, one toolbox" world: `Apply` is the entry that enforces the rules, `OnApply` is the hook, and the protected tools are the sandbox.

# Parsons

```yaml
- id: effect-apply
  prompt: Put the base's public entry in order.
  lines:
    - "bool UDojoS2Effect::Apply(AActor* User)"
    - "{"
    - "	if (!IsValid(User) || User->GetWorld() == nullptr)"
    - "	{"
    - "		return false;"
    - "	}"
    - "	OnApply(User);"
    - "	return true;"
    - "}"
  distractors:
    - line: "	if (User == nullptr)"
      mistake: A pointer to an actor that was destroyed is not null until garbage collection runs; IsValid also checks that the actor is not being destroyed.
    - line: "	Super::Apply(User);"
      mistake: Apply is declared first in this class, so there is no parent version to call; the kinds extend the hook, not the entry.
- id: push-on-apply
  prompt: Put the push's hook in order.
  lines:
    - "void UDojoS2PushEffect::OnApply(AActor* User)"
    - "{"
    - "	const FVector Center = User->GetActorLocation();"
    - "	for (AActor* Target : FindTargetsNear(Center, Radius, User))"
    - "	{"
    - "		FVector Away = Target->GetActorLocation() - Center;"
    - "		Away.Z = 0.f;"
    - "		const FVector Direction = Away.IsNearlyZero() ? User->GetActorForwardVector() : Away.GetSafeNormal();"
    - "		MoveActor(Target, Direction * Distance);"
    - "	}"
    - "}"
  distractors:
    - line: "		FVector Away = Center - Target->GetActorLocation();"
      mistake: That vector points from the target back to the user, so the push would pull every target in.
    - line: "		Target->SetActorLocation(Direction * Distance);"
      mistake: That places the target at a spot near the world origin instead of moving it from where it stands, and it skips the base's tool.
```
