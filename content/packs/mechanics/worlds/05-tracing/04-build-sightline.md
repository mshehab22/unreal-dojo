---
id: m5-sightline
title: A lookout that sees only what it can really see
order: 4
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [collision, math]
terms: [line-trace, fhitresult, collision-query-params, dot-product, debug-draw]
prerequisites: [m5-rangefinder]
xp: 70
estimatedMinutes: 20
concepts:
  - Seeing is an angle test first and a trace second
  - A line of sight is clear when the first thing the ray meets is the thing you were looking for
---

# Brief

When you place an eye facing along X, with a hero 600 units ahead, the eye sees the hero; slide a pillar between them and it no longer does, and it can name the pillar; move the hero 60 degrees off to the side, or directly behind, or out past the eye's range, and it does not see the hero even with nothing in the way. Each trace the eye makes is drawn as a line, green when the hero is seen and red when not; a look that stops at the range or the cone makes no trace and draws nothing.

Most of the code is written for you, including the range check and the line. Write two gaps in `ADojoM5Eye::CanSee`:

1. Return false when the candidate lies outside the cone: compare the dot product of the eye's forward and the unit direction toward the candidate with the cosine of the half angle.
2. Trace from the eye to the candidate on the Visibility channel, as the rangefinder did, leaving the eye itself out. Set `bBlocked` from the trace, and set `bSeen` when the first thing the ray met is the candidate.

Dependency direction: the eye holds nothing and decides on request; whoever asks it, such as a sentry or a tower, holds the eye.

This eye is the first piece of the Watchtower boss, where each of the two sentries is one.

## See it in the editor

Place a `DojoM5Eye` and, in the level Blueprint, on the 1 key, call Can See with Get Player Pawn as the candidate and print the result. Press Play and stand in front of the eye: a green line from the eye to you, and true. Walk behind it, or out past its range: false and no line, because the look stops before any trace. Place a cube between you and the eye and press 1 again: the line stops at the cube. Select the eye and change Half Angle Degrees to 20 to narrow its cone, or Range to 300 to shorten it. Use `show Collision` to see the shapes the ray meets.

# Files

## DojoM5Eye.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Eye.generated.h"

/** A sentry's eye: says whether a candidate is inside its cone and range with nothing solid in the way. */
UCLASS()
class ADojoM5Eye : public AActor
{
	GENERATED_BODY()

public:
	/** Creates a solid body as the root, so the eye has a shape of its own, and an arrow that shows where it looks. */
	ADojoM5Eye();

	/** How far it can see, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Eye", meta = (ClampMin = "1"))
	float Range = 1500.f;

	/** Half the width of the cone it sees in, in degrees, measured from straight ahead. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Eye", meta = (ClampMin = "1", ClampMax = "180"))
	float HalfAngleDegrees = 45.f;

	/** Looks at the candidate once and draws the line it looked along. True when the first thing in the way is the candidate itself. */
	UFUNCTION(BlueprintCallable, Category = "Eye")
	bool CanSee(const AActor* Candidate);

	/** What stood in the way at the last look, or nullptr when nothing did or the candidate was seen. */
	UFUNCTION(BlueprintPure, Category = "Eye")
	AActor* GetBlocker() const;

private:
	TWeakObjectPtr<AActor> Blocker;
};
```

## DojoM5Eye.cpp

```cpp
#include "DojoM5Eye.h"

#include "CollisionQueryParams.h"
#include "Components/ArrowComponent.h"
#include "Components/BoxComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/EngineTypes.h"
#include "Engine/HitResult.h"
#include "Engine/World.h"

ADojoM5Eye::ADojoM5Eye()
{
	PrimaryActorTick.bCanEverTick = false;

	UBoxComponent* Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	Body->SetBoxExtent(FVector(30.f, 30.f, 30.f));
	Body->SetCollisionProfileName(TEXT("BlockAll"));
	RootComponent = Body;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Body);
}

bool ADojoM5Eye::CanSee(const AActor* Candidate)
{
	Blocker = nullptr;

	if (!IsValid(Candidate)) return false;

	const FVector Start = GetActorLocation();
	const FVector Goal = Candidate->GetActorLocation();
	const FVector Toward = Goal - Start;
	if (Toward.Size() > Range) return false;

	// Your code: return false when the candidate lies outside the cone. Compare the dot product of the eye's forward and the unit direction toward the candidate with the cosine of HalfAngleDegrees.

	FHitResult Hit;
	bool bBlocked = false;
	bool bSeen = false;

	// Your code: trace from Start to Goal, leaving the eye itself out. Set bBlocked from the trace, and set bSeen when the first thing the ray met is the Candidate.

	if (bBlocked && !bSeen) Blocker = Hit.GetActor();

	DrawDebugLine(GetWorld(), Start, bBlocked ? Hit.ImpactPoint : Goal, bSeen ? FColor::Green : FColor::Red, false, 0.5f);
	return bSeen;
}

AActor* ADojoM5Eye::GetBlocker() const
{
	return Blocker.Get();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Components/CapsuleComponent.h"
#include "Quests/m5-sightline/DojoM5Eye.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM5SightlineTest
{
	/** Spawns a hero: a capsule with the collision settings a game character's capsule has. */
	ADojoTestActor* SpawnHero(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		ADojoTestActor* Hero = TestWorld.GetWorld()->SpawnActor<ADojoTestActor>(Where, FRotator::ZeroRotator);
		if (!Hero) return nullptr;

		UCapsuleComponent* Capsule = TestWorld.AddComponent<UCapsuleComponent>(Hero);
		Capsule->SetCapsuleSize(34.f, 88.f);
		Capsule->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
		Capsule->SetCollisionObjectType(ECC_Pawn);
		Capsule->SetCollisionResponseToAllChannels(ECR_Block);
		Capsule->SetCollisionResponseToChannel(ECC_Visibility, ECR_Ignore);
		Capsule->AttachToComponent(Hero->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
		return Hero;
	}

	/** Spawns a solid pillar, a static box that blocks everything, centred at Where. */
	ADojoTestActor* SpawnPillar(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		ADojoTestActor* Pillar = TestWorld.GetWorld()->SpawnActor<ADojoTestActor>(Where, FRotator::ZeroRotator);
		if (!Pillar) return nullptr;

		UBoxComponent* Box = TestWorld.AddComponent<UBoxComponent>(Pillar);
		Box->SetBoxExtent(FVector(20.f, 150.f, 200.f));
		Box->SetCollisionProfileName(TEXT("BlockAll"));
		Box->SetCollisionObjectType(ECC_WorldStatic);
		Box->AttachToComponent(Pillar->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
		return Pillar;
	}

	/** Spawns an eye at the origin facing along X with the given range and half angle. */
	ADojoM5Eye* SpawnEye(FDojoTestWorld& TestWorld, float Range, float HalfAngleDegrees)
	{
		ADojoM5Eye* Eye = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM5Eye>(ADojoM5Eye::StaticClass(), FTransform::Identity);
		Eye->Range = Range;
		Eye->HalfAngleDegrees = HalfAngleDegrees;
		Eye->FinishSpawning(FTransform::Identity);
		return Eye;
	}

	/** A point Distance units from the origin, turned AngleDegrees away from straight ahead toward Y. */
	FVector PointAt(float Distance, float AngleDegrees)
	{
		const float Radians = FMath::DegreesToRadians(AngleDegrees);
		return FVector(Distance * FMath::Cos(Radians), Distance * FMath::Sin(Radians), 0.f);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Sightline_SeesAHeroInTheOpen, "Dojo.M5.Sightline.SeesAHeroInTheOpen", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts a hero straight ahead of the eye with nothing between and checks that it is seen and nothing is reported in the way. */
bool FDojo_M5_Sightline_SeesAHeroInTheOpen::RunTest(const FString& Parameters)
{
	using namespace DojoM5SightlineTest;

	FDojoTestWorld TestWorld;

	ADojoM5Eye* Eye = SpawnEye(TestWorld, 1500.f, 45.f);
	ADojoTestActor* Hero = SpawnHero(TestWorld, FVector(600.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Eye spawned"), Eye) || !TestNotNull(TEXT("Hero spawned"), Hero)) return false;

	TestWorld.Tick(1);
	TestTrue(TEXT("The eye sees a hero straight ahead in the open"), Eye->CanSee(Hero));
	TestNull(TEXT("Nothing stood in the way"), Eye->GetBlocker());
	TestFalse(TEXT("It does not see a missing candidate"), Eye->CanSee(nullptr));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Sightline_SolidThingsHideTheHero, "Dojo.M5.Sightline.SolidThingsHideTheHero", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts a pillar and then a second hero between the eye and the first hero and checks that each hides it and is named as the blocker. */
bool FDojo_M5_Sightline_SolidThingsHideTheHero::RunTest(const FString& Parameters)
{
	using namespace DojoM5SightlineTest;

	FDojoTestWorld TestWorld;

	ADojoM5Eye* Eye = SpawnEye(TestWorld, 1500.f, 45.f);
	ADojoTestActor* Hero = SpawnHero(TestWorld, FVector(900.0, 0.0, 0.0));
	ADojoTestActor* Pillar = SpawnPillar(TestWorld, FVector(400.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Eye spawned"), Eye) || !TestNotNull(TEXT("Hero spawned"), Hero) || !TestNotNull(TEXT("Pillar spawned"), Pillar)) return false;

	TestWorld.Tick(1);
	TestFalse(TEXT("A pillar between them hides the hero"), Eye->CanSee(Hero));
	TestTrue(TEXT("and the eye names the pillar as what stood in the way"), Eye->GetBlocker() == Pillar);

	Pillar->Destroy();
	TestWorld.Tick(1);
	TestTrue(TEXT("With the pillar gone the hero is seen again"), Eye->CanSee(Hero));
	TestNull(TEXT("and nothing is named"), Eye->GetBlocker());

	ADojoTestActor* Decoy = SpawnHero(TestWorld, FVector(500.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Decoy spawned"), Decoy)) return false;

	TestWorld.Tick(1);
	TestFalse(TEXT("Another character standing in the line also hides the hero"), Eye->CanSee(Hero));
	TestTrue(TEXT("and it is the one named"), Eye->GetBlocker() == Decoy);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Sightline_TheConeAndRangeHaveEdges, "Dojo.M5.Sightline.TheConeAndRangeHaveEdges", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moves the hero around the eye and checks the cone's angle, the area behind it, and the range, and that changing the settings changes the answer. */
bool FDojo_M5_Sightline_TheConeAndRangeHaveEdges::RunTest(const FString& Parameters)
{
	using namespace DojoM5SightlineTest;

	FDojoTestWorld TestWorld;

	ADojoM5Eye* Eye = SpawnEye(TestWorld, 1500.f, 45.f);
	ADojoTestActor* Hero = SpawnHero(TestWorld, PointAt(500.f, 30.f));
	if (!TestNotNull(TEXT("Eye spawned"), Eye) || !TestNotNull(TEXT("Hero spawned"), Hero)) return false;

	TestWorld.Tick(1);
	TestTrue(TEXT("30 degrees off the nose is inside a 45 degree cone"), Eye->CanSee(Hero));

	Hero->SetActorLocation(PointAt(500.f, 60.f));
	TestWorld.Tick(1);
	TestFalse(TEXT("60 degrees off the nose is outside it"), Eye->CanSee(Hero));

	Eye->HalfAngleDegrees = 75.f;
	TestTrue(TEXT("A wider cone takes in the same spot"), Eye->CanSee(Hero));

	Eye->HalfAngleDegrees = 45.f;
	Hero->SetActorLocation(PointAt(500.f, 180.f));
	TestWorld.Tick(1);
	TestFalse(TEXT("A hero directly behind is not seen even with nothing in the way"), Eye->CanSee(Hero));

	Hero->SetActorLocation(PointAt(1400.f, 0.f));
	TestWorld.Tick(1);
	TestTrue(TEXT("1400 units ahead is within a range of 1500"), Eye->CanSee(Hero));

	Hero->SetActorLocation(PointAt(1600.f, 0.f));
	TestWorld.Tick(1);
	TestFalse(TEXT("1600 units ahead is out of range"), Eye->CanSee(Hero));

	Eye->Range = 2000.f;
	TestTrue(TEXT("A longer range takes in the same spot"), Eye->CanSee(Hero));

	return true;
}

#endif
```

# Hints

- If the hero is never seen even in the open, read what the trace returned and compare it with how the hero's capsule answers the question the trace asked.
- A trace can ask by channel, how things answer one kind of look, or by object type, what things are, which does not depend on a shape's response to any channel.
- `UWorld::LineTraceSingleByObjectType` takes an `FCollisionObjectQueryParams` filled with `AddObjectTypesToQuery` (the types are `ECC_WorldStatic`, `ECC_WorldDynamic` and `ECC_Pawn`), while `FVector::DotProduct` with `GetSafeNormal` does the cone.

# Rubric

- The cone is a dot product of the eye's forward and the unit direction toward the candidate, compared with the cosine of the half angle.
- The trace runs from the eye to the candidate and leaves the eye itself out of the answer.
- The candidate is seen only when the first thing the ray meets is the candidate, and the thing that was met instead is named.
- A pillar or another character in the line hides the hero, and a hero in the open is seen.
- Each trace is drawn as a line, green when seen and red when not, and the eye holds no reference to whoever asked it.
- Range and half angle are properties a designer can tune, and the eye looks when asked rather than every frame.

# Alternative

Tracing by a custom channel is the other usual answer: add a channel in Project Settings, say Sight, set its default response to Block for walls and pillars, and set the hero's capsule to block it too. The trace then follows the designer's settings and a prop can be made see-through by flipping one response, which an object-type query cannot do. The cost is a project setting that every new shape has to get right; forget it on a new wall and the eye sees through the wall. This quest asks by object type because it needs no project setup.

# Parsons

```yaml
- id: eye-trace
  prompt: Put the object-type look in order. The object types come first, then the trace and its verdict; the hit result and the query params that leave the eye out are already declared.
  lines:
    - "FCollisionObjectQueryParams Objects(ECC_WorldStatic);"
    - "Objects.AddObjectTypesToQuery(ECC_Pawn);"
    - "const bool bBlocked = GetWorld()->LineTraceSingleByObjectType(Hit, Start, Goal, Objects, Params);"
    - "const bool bSeen = bBlocked && Hit.GetActor() == Candidate;"
  distractors:
    - line: "const bool bSeen = bBlocked;"
      mistake: Any blocker would count as seeing the hero, so a pillar in the way would not hide it.
    - line: "FCollisionObjectQueryParams Objects(ECC_Visibility);"
      mistake: Visibility is a trace channel, not an object type, so a by-object-type look built on it matches nothing.
```
