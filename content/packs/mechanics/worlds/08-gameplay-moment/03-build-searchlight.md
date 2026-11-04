---
id: m8-searchlight
title: A searchlight that sees through a trace
order: 3
kind: build
scaffold: worked
difficulty: 3
patterns: [observer]
skills: [tracing, transforms, delegates]
terms: [line-trace, dot-product, collision-query-params, fvector, deltatime, tick, dynamic-multicast-delegate, tweakobjectptr]
prerequisites: [m8-inventory-and-gaps, m3-checkpoint]
xp: 70
estimatedMinutes: 20
concepts:
  - "A sight check is three questions in order: in range, inside the beam, and nothing solid in between"
  - A sensor announces a change of what it sees, not what it sees every frame
---

# Brief

When you put a searchlight at the origin with its beam held still and place a runner 500 units ahead, the light can see the runner; at 900 ahead, 300 to the side, or behind it, it cannot; and a wall between the two hides the runner until the wall moves away.

Most of `ADojoM8Searchlight` is written for you. Explain the marked lines, then fill the two gaps:

1. `ADojoM8Searchlight::IsInsideCone`: say whether a point is within `ViewRange` and within `ViewHalfAngleDegrees` of the beam's middle, measured on the floor plane.
2. `ADojoM8Searchlight::HasClearLine`: trace a line on the Visibility channel from the light to the candidate and say whether it hit nothing. The light and the candidate themselves must not count as something in the way.

Dependency direction: the light knows only the one actor it was told to watch and holds no pointer to whoever listens; listeners subscribe to `OnSightChanged`. `DojoM8SightLog` is a listener provided for the tests.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`, the runner that stands in for the hero).

This light is the first piece of the Blackout Escape boss. Tracing is taken as known from the tracing world: a line trace and a hit result are used here, not taught.

## See it in the editor

Place a `DojoM8Searchlight` at the origin, a `DojoM8SightLog`, and a `DojoM3Runner` (the ball from the checkpoint quest; it has no mesh, so switch on Show, then Collision in the viewport to see it) about 500 units from the light, and name it Hero in the Outliner. With the three selected, right-click the level Blueprint's graph to add a reference to each. On BeginPlay call Watch on the light with the runner and Listen on the log with the light, then print the log's Get Seen Count and Get Lost Count on a looping one second timer. Press Play: the counts change when the beam sweeps across the runner and away again, not every frame. To test the wall, place a cube with the BlockAll collision preset between the light and the runner before pressing Play; with the cube there the seen count never rises.

# Files

## DojoM8Searchlight.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8Searchlight.generated.h"

class ADojoM8Searchlight;

/** Broadcast when the light starts or stops seeing the actor it watches. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM8OnSightChanged, ADojoM8Searchlight*, Light, bool, bSeen);

/** A tower light that turns on the spot and reports when it can see the one actor it watches: inside its cone, within range, and with nothing solid in the way. */
UCLASS()
class ADojoM8Searchlight : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking on. */
	ADojoM8Searchlight();

	/** How fast the beam turns, in degrees per second; zero holds it still. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Searchlight")
	float SweepDegreesPerSecond = 45.f;

	/** How far the beam reaches, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Searchlight")
	float ViewRange = 800.f;

	/** Half the width of the beam, in degrees: an actor this far off the beam's middle is still lit. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Searchlight")
	float ViewHalfAngleDegrees = 20.f;

	/** Fires when the watched actor goes in or out of sight, and only then. */
	UPROPERTY(BlueprintAssignable, Category = "Searchlight")
	FDojoM8OnSightChanged OnSightChanged;

	/** Chooses the one actor this light looks for. */
	UFUNCTION(BlueprintCallable, Category = "Searchlight")
	void Watch(AActor* NewTarget);

	/** True while the watched actor is in sight. */
	UFUNCTION(BlueprintPure, Category = "Searchlight")
	bool IsSeeing() const;

	/** True when the candidate is inside the cone and range and no solid shape is between it and the light. */
	bool CanSee(const AActor* Candidate) const;

	/** Turns the beam, then checks the watched actor and announces a change. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** True when a point is within range and within the beam's half angle, measured on the floor plane. */
	bool IsInsideCone(const FVector& TargetLocation) const;

	/** True when a line from the light to the candidate hits nothing solid on the way. */
	bool HasClearLine(const AActor* Candidate) const;

	TWeakObjectPtr<AActor> Watched;

	bool bSeeing = false;
};
```

## DojoM8Searchlight.cpp

```cpp
#include "DojoM8Searchlight.h"

#include "CollisionQueryParams.h"
#include "Components/SceneComponent.h"
#include "Engine/World.h"

ADojoM8Searchlight::ADojoM8Searchlight()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM8Searchlight::Watch(AActor* NewTarget)
{
	Watched = NewTarget;
	bSeeing = false;
}

bool ADojoM8Searchlight::IsSeeing() const
{
	return bSeeing;
}

bool ADojoM8Searchlight::CanSee(const AActor* Candidate) const
{
	return IsValid(Candidate) && IsInsideCone(Candidate->GetActorLocation()) && HasClearLine(Candidate);
}

void ADojoM8Searchlight::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	AddActorWorldRotation(FRotator(0.f, SweepDegreesPerSecond * DeltaSeconds, 0.f)); // @explain: Rotation is scaled by the frame's time, so the beam turns at the same speed whatever the frame rate.

	const bool bNowSeeing = CanSee(Watched.Get()); // @explain: Watched is a weak pointer, so a watched actor that was destroyed simply reads as null and cannot be seen.
	if (bNowSeeing == bSeeing) return; // @explain: Only a change is announced; listeners are not told again every frame the actor stays in view.

	bSeeing = bNowSeeing;
	OnSightChanged.Broadcast(this, bSeeing);
}

bool ADojoM8Searchlight::IsInsideCone(const FVector& TargetLocation) const
{
	// Your code: false when the point is farther than ViewRange from the light.
	// Your code: compare the beam's forward direction with the direction to the point on the floor plane, and say whether the angle between them is within ViewHalfAngleDegrees.
	return false;
}

bool ADojoM8Searchlight::HasClearLine(const AActor* Candidate) const
{
	// Your code: trace a line on the Visibility channel from the light to the candidate, ignoring the light itself and the candidate, and say whether it hit nothing.
	return false;
}
```

## DojoM8SightLog.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8SightLog.generated.h"

class ADojoM8Searchlight;

/** A listener for tests and Blueprints: counts how often a searchlight started and stopped seeing its target. */
UCLASS()
class ADojoM8SightLog : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8SightLog();

	/** Starts counting the light's sight changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Sight Log")
	void Listen(ADojoM8Searchlight* Light);

	/** How many times the light started to see its target. */
	UFUNCTION(BlueprintPure, Category = "Sight Log")
	int32 GetSeenCount() const;

	/** How many times the light stopped seeing its target. */
	UFUNCTION(BlueprintPure, Category = "Sight Log")
	int32 GetLostCount() const;

private:
	/** Adds one to the seen or the lost count. */
	UFUNCTION()
	void HandleSightChanged(ADojoM8Searchlight* Light, bool bSeen);

	int32 SeenCount = 0;

	int32 LostCount = 0;
};
```

## DojoM8SightLog.cpp

```cpp
#include "DojoM8SightLog.h"

#include "DojoM8Searchlight.h"

ADojoM8SightLog::ADojoM8SightLog()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM8SightLog::Listen(ADojoM8Searchlight* Light)
{
	if (!IsValid(Light)) return;

	Light->OnSightChanged.AddUniqueDynamic(this, &ADojoM8SightLog::HandleSightChanged);
}

int32 ADojoM8SightLog::GetSeenCount() const
{
	return SeenCount;
}

int32 ADojoM8SightLog::GetLostCount() const
{
	return LostCount;
}

void ADojoM8SightLog::HandleSightChanged(ADojoM8Searchlight* Light, bool bSeen)
{
	if (bSeen) SeenCount++;
	else LostCount++;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Components/SphereComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m8-searchlight/DojoM8Searchlight.h"
#include "Quests/m8-searchlight/DojoM8SightLog.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM8SearchlightTest
{
	/** Spawns a light at the origin facing along X with its beam held still. */
	ADojoM8Searchlight* SpawnStillLight(FDojoTestWorld& TestWorld)
	{
		ADojoM8Searchlight* Light = TestWorld.SpawnActor<ADojoM8Searchlight>();
		Light->SweepDegreesPerSecond = 0.f;
		return Light;
	}

	/** Spawns a runner, the stand-in for the hero, at a spot. */
	ADojoM3Runner* SpawnRunnerAt(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<ADojoM3Runner>(Where, FRotator::ZeroRotator);
	}

	/** Makes a tall solid wall that blocks lines of sight, and returns its shape. */
	UBoxComponent* MakeWall(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		ADojoTestActor* Holder = TestWorld.SpawnActor<ADojoTestActor>();
		UBoxComponent* Wall = TestWorld.AddComponent<UBoxComponent>(Holder);
		Wall->SetBoxExtent(FVector(20.0, 300.0, 300.0));
		Wall->SetCollisionProfileName(TEXT("BlockAll"));
		Wall->SetWorldLocation(Where);
		return Wall;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_Searchlight_SweepsAtItsSpeed, "Dojo.M8.Searchlight.SweepsAtItsSpeed", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lets the beam turn for one second and checks it turned by its speed. */
bool FDojo_M8_Searchlight_SweepsAtItsSpeed::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoM8Searchlight* Light = TestWorld.SpawnActor<ADojoM8Searchlight>();
	if (!TestNotNull(TEXT("Light spawned"), Light)) return false;

	TestWorld.Tick(60);
	TestNearlyEqual(TEXT("45 degrees a second for one second turns the beam 45 degrees"), Light->GetActorRotation().Yaw, 45.0, 2.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_Searchlight_SeesWhatIsInTheBeam, "Dojo.M8.Searchlight.SeesWhatIsInTheBeam", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts a runner ahead, far, beside, slightly off, and behind the still light, and checks only the lit spots are seen. */
bool FDojo_M8_Searchlight_SeesWhatIsInTheBeam::RunTest(const FString& Parameters)
{
	using namespace DojoM8SearchlightTest;

	FDojoTestWorld TestWorld;

	ADojoM8Searchlight* Light = SpawnStillLight(TestWorld);
	ADojoM3Runner* Runner = SpawnRunnerAt(TestWorld, FVector(500.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Light and runner spawned"), Runner) || !Light) return false;

	TestTrue(TEXT("Straight ahead and in range is seen"), Light->CanSee(Runner));
	TestFalse(TEXT("Nothing is seen when nothing is asked about"), Light->CanSee(nullptr));

	Runner->SetActorLocation(FVector(900.0, 0.0, 0.0));
	TestFalse(TEXT("Straight ahead but past the 800 range is not seen"), Light->CanSee(Runner));

	Runner->SetActorLocation(FVector(500.0, 300.0, 0.0));
	TestFalse(TEXT("About 31 degrees off the beam is outside the 20 degree half angle"), Light->CanSee(Runner));

	Runner->SetActorLocation(FVector(500.0, 100.0, 0.0));
	TestTrue(TEXT("About 11 degrees off the beam is still lit"), Light->CanSee(Runner));

	Runner->SetActorLocation(FVector(-500.0, 0.0, 0.0));
	TestFalse(TEXT("Behind the light is not seen"), Light->CanSee(Runner));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_Searchlight_HeightDoesNotMatter, "Dojo.M8.Searchlight.HeightDoesNotMatter", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Raises the runner above the floor and checks it is still lit, because the beam is measured on the floor plane. */
bool FDojo_M8_Searchlight_HeightDoesNotMatter::RunTest(const FString& Parameters)
{
	using namespace DojoM8SearchlightTest;

	FDojoTestWorld TestWorld;

	ADojoM8Searchlight* Light = SpawnStillLight(TestWorld);
	ADojoM3Runner* Runner = SpawnRunnerAt(TestWorld, FVector(500.0, 0.0, 200.0));
	if (!TestNotNull(TEXT("Light and runner spawned"), Runner) || !Light) return false;

	TestTrue(TEXT("A runner 200 above the floor, straight ahead, is still seen"), Light->CanSee(Runner));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_Searchlight_ItsOwnShapeDoesNotHideIt, "Dojo.M8.Searchlight.ItsOwnShapeDoesNotHideIt", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Makes the runner's own shape block everything and checks the light still sees it with nothing in between. */
bool FDojo_M8_Searchlight_ItsOwnShapeDoesNotHideIt::RunTest(const FString& Parameters)
{
	using namespace DojoM8SearchlightTest;

	FDojoTestWorld TestWorld;

	ADojoM8Searchlight* Light = SpawnStillLight(TestWorld);
	ADojoM3Runner* Runner = SpawnRunnerAt(TestWorld, FVector(500.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Light and runner spawned"), Runner) || !Light) return false;

	Runner->Body->SetCollisionProfileName(TEXT("BlockAll"));
	TestTrue(TEXT("A solid runner with nothing between it and the light is seen"), Light->CanSee(Runner));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_Searchlight_SolidShapesBlockTheView, "Dojo.M8.Searchlight.SolidShapesBlockTheView", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts a wall between the light and the runner, then beside the line, then behind the runner, and checks the view follows. */
bool FDojo_M8_Searchlight_SolidShapesBlockTheView::RunTest(const FString& Parameters)
{
	using namespace DojoM8SearchlightTest;

	FDojoTestWorld TestWorld;

	ADojoM8Searchlight* Light = SpawnStillLight(TestWorld);
	ADojoM3Runner* Runner = SpawnRunnerAt(TestWorld, FVector(500.0, 0.0, 0.0));
	UBoxComponent* Wall = MakeWall(TestWorld, FVector(250.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Light, runner, and wall made"), Wall) || !Light || !Runner) return false;

	TestFalse(TEXT("A wall between the light and the runner hides the runner"), Light->CanSee(Runner));

	Wall->SetWorldLocation(FVector(250.0, 2000.0, 0.0));
	TestTrue(TEXT("A wall off to the side hides nothing"), Light->CanSee(Runner));

	Wall->SetWorldLocation(FVector(700.0, 0.0, 0.0));
	TestTrue(TEXT("A wall behind the runner hides nothing"), Light->CanSee(Runner));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_Searchlight_AnnouncesOnlyChanges, "Dojo.M8.Searchlight.AnnouncesOnlyChanges", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lets the beam sweep a full circle past a runner and counts the announcements. */
bool FDojo_M8_Searchlight_AnnouncesOnlyChanges::RunTest(const FString& Parameters)
{
	using namespace DojoM8SearchlightTest;

	FDojoTestWorld TestWorld;

	ADojoM8Searchlight* Light = TestWorld.SpawnActor<ADojoM8Searchlight>();
	ADojoM3Runner* Runner = SpawnRunnerAt(TestWorld, FVector(500.0, 0.0, 0.0));
	ADojoM8SightLog* Log = TestWorld.SpawnActor<ADojoM8SightLog>();
	if (!TestNotNull(TEXT("Light, runner, and log spawned"), Log) || !Light || !Runner) return false;

	Light->Watch(Runner);
	Log->Listen(Light);
	Log->Listen(Light);

	TestWorld.Tick(1);
	TestEqual(TEXT("The runner starts in the beam, so the light announces it once"), Log->GetSeenCount(), 1);
	TestTrue(TEXT("The light reports seeing"), Light->IsSeeing());

	TestWorld.Tick(59);
	TestEqual(TEXT("After a second the beam has turned past the runner, so it is lost once"), Log->GetLostCount(), 1);
	TestFalse(TEXT("The light no longer reports seeing"), Light->IsSeeing());

	TestWorld.Tick(420);
	TestEqual(TEXT("After a full circle the beam is back on the runner, and only that is announced"), Log->GetSeenCount(), 2);
	TestEqual(TEXT("Nothing more was lost"), Log->GetLostCount(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_Searchlight_ForgetsADestroyedTarget, "Dojo.M8.Searchlight.ForgetsADestroyedTarget", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys the watched runner and checks the light just stops seeing it. */
bool FDojo_M8_Searchlight_ForgetsADestroyedTarget::RunTest(const FString& Parameters)
{
	using namespace DojoM8SearchlightTest;

	FDojoTestWorld TestWorld;

	ADojoM8Searchlight* Light = SpawnStillLight(TestWorld);
	ADojoM3Runner* Runner = SpawnRunnerAt(TestWorld, FVector(500.0, 0.0, 0.0));
	ADojoM8SightLog* Log = TestWorld.SpawnActor<ADojoM8SightLog>();
	if (!TestNotNull(TEXT("Light, runner, and log spawned"), Log) || !Light || !Runner) return false;

	Light->Watch(Runner);
	Log->Listen(Light);
	TestWorld.Tick(2);
	TestTrue(TEXT("The runner is seen"), Light->IsSeeing());

	Runner->Destroy();
	TestWorld.Tick(2);
	TestFalse(TEXT("A destroyed runner is not seen"), Light->IsSeeing());
	TestEqual(TEXT("and the loss is announced"), Log->GetLostCount(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_Searchlight_DesignersCanTuneIt, "Dojo.M8.Searchlight.DesignersCanTuneIt", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the speed, range, and angle are editable and that Blueprints can listen. */
bool FDojo_M8_Searchlight_DesignersCanTuneIt::RunTest(const FString& Parameters)
{
	const UClass* LightClass = ADojoM8Searchlight::StaticClass();

	for (const TCHAR* Name : { TEXT("SweepDegreesPerSecond"), TEXT("ViewRange"), TEXT("ViewHalfAngleDegrees") })
	{
		const FProperty* Property = LightClass->FindPropertyByName(Name);

		if (!TestNotNull(FString::Printf(TEXT("%s is a UPROPERTY"), Name), Property)) continue;
		TestTrue(FString::Printf(TEXT("%s is editable in Details"), Name), Property->HasAnyPropertyFlags(CPF_Edit));
	}

	const FProperty* OnSightChanged = LightClass->FindPropertyByName(TEXT("OnSightChanged"));
	if (!TestNotNull(TEXT("OnSightChanged is a UPROPERTY"), OnSightChanged)) return false;
	TestTrue(TEXT("Blueprints can bind to it"), OnSightChanged->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	return true;
}

#endif
```

# Hints

- Check how far the point is first, then how far off the middle of the beam it is, and flatten both directions onto the floor so height does not matter.
- For unit directions the dot product is the cosine of the angle between them, and a smaller angle means a larger cosine, so compare it with the cosine of the half angle instead of computing an angle.
- For the trace, the query parameters can list actors to skip, so skip both ends of the line, and the line is blocked if the trace reports any hit at all.

# Rubric

- IsInsideCone rejects a point beyond `ViewRange` and accepts one inside the half angle, measured on the floor plane, by comparing a dot product with a cosine.
- HasClearLine traces one line on the Visibility channel from the light to the candidate and ignores both the light and the candidate.
- CanSee needs all three: in range, inside the beam, and a clear line.
- OnSightChanged is announced when the light starts or stops seeing, and not on every frame.
- The light turns by a rate times the frame's time, and holds no pointer to any listener.
- The speed, range, and angle are properties a designer can set in Details.

# Alternative

The light could ask the hero directly for its position every frame and tell the HUD itself. That is shorter, but the light then knows about the hero and the HUD, and nothing else can learn what the light sees without editing it. A sensor that only answers a question and announces changes can be reused by a camera, a turret, or a drone, and each decides for itself what a change means. This shape, a sender that announces and listeners that subscribe, is the Observer pattern, as in Pack 2's first world.

# Parsons

```yaml
- id: searchlight-tick
  prompt: Put the end of Tick in order.
  lines:
    - "	const bool bNowSeeing = CanSee(Watched.Get());"
    - "	if (bNowSeeing == bSeeing) return;"
    - "	bSeeing = bNowSeeing;"
    - "	OnSightChanged.Broadcast(this, bSeeing);"
  distractors:
    - line: "	OnSightChanged.Broadcast(bSeeing);"
      mistake: The delegate was declared with the light and the new state, so Broadcast must pass both; this line does not match its signature.
- id: searchlight-can-see
  prompt: Put CanSee in order.
  lines:
    - "bool ADojoM8Searchlight::CanSee(const AActor* Candidate) const"
    - "{"
    - "	return IsValid(Candidate) && IsInsideCone(Candidate->GetActorLocation()) && HasClearLine(Candidate);"
    - "}"
  distractors:
    - line: "	return IsInsideCone(Candidate->GetActorLocation()) && HasClearLine(Candidate);"
      mistake: Without the validity check a destroyed or missing actor would be dereferenced.
```
