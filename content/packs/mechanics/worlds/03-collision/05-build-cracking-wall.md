---
id: m3-cracking-wall
title: A wall that cracks under hits and gives way
order: 5
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [collision, delegates]
terms: [hit-event, collision-enabled, box-component, adddynamic, ufunction, sweep]
prerequisites: [m3-checkpoint, m2-bumper]
xp: 70
estimatedMinutes: 18
concepts:
  - A hit event fires on the shape that was run into, not only on the mover
  - Switching collision off is how a solid thing stops being solid
---

# Brief

When you place a cracking wall opposite a plain wall and roll World 2's bouncing ball between them, the cracking wall's label counts CRACKS 1 / 3, then 2 / 3, at each bounce off it; at the third it reads BROKEN, and on its next pass the ball rolls straight through where the wall stood.

This quest reuses `ADojoM2Bumper` and `ADojoM2Wall` from World 2's bumper quest, unchanged: the ball is what hits, and the plain wall sends it back. Most of the cracking wall is written for you. Write the bodies of `BeginPlay` and `HandleBoxHit` in `ADojoM3CrackingWall`:

1. In `BeginPlay`, listen for hits on the box.
2. In the handler, ignore hits once the wall is broken; otherwise count the crack, and at `HitsToBreak` cracks mark the wall broken and make the box stop colliding with anything. Refresh the label either way.

Dependency direction: the wall knows nothing about the ball; it only hears that something ran into its box. The ball knows nothing about the wall either; it bounces off whatever its sweep hits.

Compiles against earlier quests: m2-bumper (`Quests/m2-bumper/DojoM2Bumper.h`, `Quests/m2-bumper/DojoM2Wall.h`).

## See it in the editor

Place a `DojoM2Wall` at Y -300, a `DojoM3CrackingWall` at Y 300, and a `DojoM2Bumper` between them at the origin. Type `show Collision` in the console and press Play: the ball bounces between the walls, and the cracking wall's label counts up until it reads BROKEN and the ball leaves through the gap. Select the cracking wall and set Hits To Break to 1, then to 5, and watch the difference. Then try one A/B change: in the bumper's Ball, set Collision Presets to OverlapAllDynamic and press Play; the ball rolls through both walls and the label never changes, because an overlap is not a hit.

# Files

## DojoM3CrackingWall.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3CrackingWall.generated.h"

class UBoxComponent;
class UTextRenderComponent;

/** A solid wall that cracks each time something runs into it and gives way after a set number of hits. */
UCLASS()
class ADojoM3CrackingWall : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the blocking box as the root and the label above it. */
	ADojoM3CrackingWall();

	/** The solid shape; its extent is half the wall's size on each axis. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Cracking Wall")
	TObjectPtr<UBoxComponent> Box;

	/** Floating text: CRACKS and the count, or BROKEN. */
	UPROPERTY(VisibleAnywhere, Category = "Cracking Wall")
	TObjectPtr<UTextRenderComponent> Label;

	/** How many hits break the wall. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Cracking Wall", meta = (ClampMin = "1"))
	int32 HitsToBreak = 3;

	/** Hits taken so far, never more than HitsToBreak. */
	UFUNCTION(BlueprintPure, Category = "Cracking Wall")
	int32 GetCracks() const;

	/** True once the wall has given way. */
	UFUNCTION(BlueprintPure, Category = "Cracking Wall")
	bool IsBroken() const;

protected:
	/** Starts listening for hits on the box and writes the first label. */
	virtual void BeginPlay() override;

private:
	/** Runs when a swept move is stopped by the box. */
	UFUNCTION()
	void HandleBoxHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit);

	/** Writes the cracks so far, or BROKEN. */
	void RefreshLabel();

	int32 Cracks = 0;

	bool bBroken = false;
};
```

## DojoM3CrackingWall.cpp

```cpp
#include "DojoM3CrackingWall.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM3CrackingWall::ADojoM3CrackingWall()
{
	PrimaryActorTick.bCanEverTick = false;

	Box = CreateDefaultSubobject<UBoxComponent>(TEXT("Box"));
	Box->SetBoxExtent(FVector(300.f, 20.f, 200.f));
	Box->SetCollisionProfileName(TEXT("BlockAll"));
	RootComponent = Box;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Box);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 250.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM3CrackingWall::BeginPlay()
{
	Super::BeginPlay();

	// Your code: listen for hits on the box.

	RefreshLabel();
}

int32 ADojoM3CrackingWall::GetCracks() const
{
	return Cracks;
}

bool ADojoM3CrackingWall::IsBroken() const
{
	return bBroken;
}

void ADojoM3CrackingWall::HandleBoxHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit)
{
	// Your code: ignore the hit once the wall is broken.
	// Your code: count the crack, and at HitsToBreak mark the wall broken and make the box stop colliding with anything.
	// Your code: refresh the label.
}

void ADojoM3CrackingWall::RefreshLabel()
{
	const FString Text = bBroken ? FString(TEXT("BROKEN")) : FString::Printf(TEXT("CRACKS %d / %d"), Cracks, HitsToBreak);
	Label->SetText(FText::FromString(Text));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"
#include "Quests/m2-bumper/DojoM2Bumper.h"
#include "Quests/m2-bumper/DojoM2Wall.h"
#include "Quests/m3-cracking-wall/DojoM3CrackingWall.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM3CrackingWallTest
{
	/** Spawns a cracking wall at a spot, with the hits a designer would give it in Details. */
	ADojoM3CrackingWall* PlaceCrackingWall(FDojoTestWorld& TestWorld, const FVector& Where, int32 HitsToBreak)
	{
		const FTransform Spot(Where);
		ADojoM3CrackingWall* Wall = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM3CrackingWall>(ADojoM3CrackingWall::StaticClass(), Spot);
		Wall->HitsToBreak = HitsToBreak;
		Wall->FinishSpawning(Spot);
		return Wall;
	}

	/** Spawns a bouncing ball at the origin rolling along +Y. */
	ADojoM2Bumper* PlaceBall(FDojoTestWorld& TestWorld)
	{
		ADojoM2Bumper* Ball = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM2Bumper>(ADojoM2Bumper::StaticClass(), FTransform::Identity);
		Ball->Heading = FVector(0.0, 1.0, 0.0);
		Ball->Speed = 600.f;
		Ball->FinishSpawning(FTransform::Identity);
		return Ball;
	}

	/** Gives a bare actor a sphere with the named profile at a spot, and returns the sphere. */
	USphereComponent* MakeProp(FDojoTestWorld& TestWorld, FName Profile, const FVector& Where)
	{
		ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
		USphereComponent* Sphere = TestWorld.AddComponent<USphereComponent>(Owner);
		Sphere->SetSphereRadius(40.f);
		Sphere->SetCollisionProfileName(Profile);
		Sphere->SetWorldLocation(Where);
		return Sphere;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_CrackingWall_BallBreaksThrough, "Dojo.M3.CrackingWall.BallBreaksThrough", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Bounces World 2's ball between a plain wall and a cracking wall and checks the cracks, the break, and the ball leaving through the gap. */
bool FDojo_M3_CrackingWall_BallBreaksThrough::RunTest(const FString& Parameters)
{
	using namespace DojoM3CrackingWallTest;

	FDojoTestWorld TestWorld;

	ADojoM2Wall* Plain = TestWorld.SpawnActor<ADojoM2Wall>();
	Plain->SetActorLocation(FVector(0.0, -300.0, 0.0));
	ADojoM3CrackingWall* Wall = PlaceCrackingWall(TestWorld, FVector(0.0, 300.0, 0.0), 3);
	ADojoM2Bumper* Ball = PlaceBall(TestWorld);
	if (!TestNotNull(TEXT("Walls and ball spawned"), Ball) || !Wall) return false;

	TestEqual(TEXT("A new wall reads CRACKS 0 / 3"), Wall->Label->Text.ToString(), FString(TEXT("CRACKS 0 / 3")));

	TestWorld.Tick(60);
	TestEqual(TEXT("After 1 second the ball has hit it once"), Wall->GetCracks(), 1);
	TestEqual(TEXT("and the label counts it"), Wall->Label->Text.ToString(), FString(TEXT("CRACKS 1 / 3")));
	TestTrue(TEXT("The first hit bounced the ball back"), Ball->Heading.Y < 0.0);

	TestWorld.Tick(40);
	TestEqual(TEXT("The plain wall's bounce cracks nothing"), Wall->GetCracks(), 1);

	TestWorld.Tick(150);
	TestEqual(TEXT("A little over 4 seconds in, it has taken three hits"), Wall->GetCracks(), 3);
	TestTrue(TEXT("and has given way"), Wall->IsBroken());
	TestEqual(TEXT("The label reads BROKEN"), Wall->Label->Text.ToString(), FString(TEXT("BROKEN")));

	TestWorld.Tick(180);
	TestTrue(TEXT("On its next pass the ball rolls through where the wall stood"), Ball->GetActorLocation().Y > 1000.0);
	TestEqual(TEXT("A broken wall counts no more cracks"), Wall->GetCracks(), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_CrackingWall_OnlySolidContactCracks, "Dojo.M3.CrackingWall.OnlySolidContactCracks", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Sweeps an overlapping shape and then a blocking shape into a wall and checks only the blocking one cracks it. */
bool FDojo_M3_CrackingWall_OnlySolidContactCracks::RunTest(const FString& Parameters)
{
	using namespace DojoM3CrackingWallTest;

	FDojoTestWorld TestWorld;

	ADojoM3CrackingWall* Wall = PlaceCrackingWall(TestWorld, FVector(2000.0, 0.0, 0.0), 3);
	if (!TestNotNull(TEXT("Wall spawned"), Wall)) return false;

	USphereComponent* Ghost = MakeProp(TestWorld, TEXT("OverlapAllDynamic"), FVector(2000.0, -200.0, 0.0));
	Ghost->SetWorldLocation(FVector(2000.0, 200.0, 0.0), true);
	TestTrue(TEXT("A shape that only overlaps the wall sweeps straight through it"), Ghost->GetComponentLocation().Equals(FVector(2000.0, 200.0, 0.0), 0.5));
	TestEqual(TEXT("and cracks nothing"), Wall->GetCracks(), 0);

	USphereComponent* Rock = MakeProp(TestWorld, TEXT("BlockAllDynamic"), FVector(2000.0, -200.0, 0.0));
	Rock->SetWorldLocation(FVector(2000.0, 200.0, 0.0), true);
	TestTrue(TEXT("A blocking shape is stopped at the wall's face"), Rock->GetComponentLocation().Y < -55.0);
	TestEqual(TEXT("and cracks the wall once"), Wall->GetCracks(), 1);

	Rock->SetWorldLocation(FVector(2000.0, -300.0, 0.0));
	TestEqual(TEXT("A teleport away is not a hit"), Wall->GetCracks(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_CrackingWall_BrokenWallLetsEverythingPass, "Dojo.M3.CrackingWall.BrokenWallLetsEverythingPass", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Breaks a one-hit wall with a sweep and checks the same shape then sweeps through it untouched. */
bool FDojo_M3_CrackingWall_BrokenWallLetsEverythingPass::RunTest(const FString& Parameters)
{
	using namespace DojoM3CrackingWallTest;

	FDojoTestWorld TestWorld;

	ADojoM3CrackingWall* Wall = PlaceCrackingWall(TestWorld, FVector(0.0, 3000.0, 0.0), 1);
	if (!TestNotNull(TEXT("Wall spawned"), Wall)) return false;

	TestEqual(TEXT("A one-hit wall reads CRACKS 0 / 1"), Wall->Label->Text.ToString(), FString(TEXT("CRACKS 0 / 1")));

	USphereComponent* Rock = MakeProp(TestWorld, TEXT("BlockAllDynamic"), FVector(0.0, 2800.0, 0.0));
	Rock->SetWorldLocation(FVector(0.0, 3200.0, 0.0), true);
	TestTrue(TEXT("The first sweep is stopped"), Rock->GetComponentLocation().Y < 2945.0);
	TestTrue(TEXT("and one hit breaks a one-hit wall"), Wall->IsBroken());

	Rock->SetWorldLocation(FVector(0.0, 3200.0, 0.0), true);
	TestTrue(TEXT("The second sweep passes where the wall stood"), Rock->GetComponentLocation().Equals(FVector(0.0, 3200.0, 0.0), 0.5));
	TestEqual(TEXT("The count stops at HitsToBreak"), Wall->GetCracks(), 1);

	return true;
}

#endif
```

# Hints

- A box has an event for solid contact, just as it has events for overlaps. Bind the handler to it the same way the flag bound its overlap, in `BeginPlay`.
- Once the wall is broken, nothing should change any more. Breaking means the box stops taking part in collision at all, which is one setting on the shape rather than a response per channel.
- `OnComponentHit` and `SetCollisionEnabled` are on `UPrimitiveComponent`, in `Components/PrimitiveComponent.h`; `ECollisionEnabled::NoCollision` is the setting that takes part in nothing.

# Rubric

- The handler is bound to the box's `OnComponentHit` in `BeginPlay`, and it is the `UFUNCTION` with the hit delegate's parameters.
- Each blocking hit adds one crack, and an overlapping shape never cracks the wall.
- At `HitsToBreak` cracks the box stops colliding with anything, so the ball and every other swept shape pass through.
- A broken wall ignores further hits, and the label always matches the state.
- The wall holds no pointer to the ball; it reacts only to its own box's hits, and the ball is reused from World 2 unchanged.

# Alternative

The ball could do the counting: its sweep already fills an `FHitResult`, so it could ask whether the hit actor is a cracking wall and call a `Crack` function on it. That works, but it makes the ball depend on every kind of breakable thing in the game, and anything else that moves with a sweep, such as a runner, would have to repeat the same code. Listening on the wall's own hit event keeps the rule with the thing that breaks, and any mover breaks it for free. A wall made of physics pieces that fall apart is the next step up: it needs Simulate Physics on the pieces, and `NormalImpulse` would then say how hard each hit was, so a light tap could crack nothing while a heavy blow breaks it at once.
