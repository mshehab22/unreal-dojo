---
id: m4-chain
title: A chain that spreads a blast to nearby bombs
order: 8
kind: build
scaffold: stub
difficulty: 3
patterns: []
skills: [spawning, delegates, time]
terms: [on-destroyed, adddynamic, ufunction, endplay, timer-manager]
prerequisites: [m4-hearing-it-go, m4-fuse]
xp: 90
estimatedMinutes: 22
concepts:
  - Listening to every watched bomb's OnDestroyed, the chain hears each blast as it happens
  - A blast lights the watched bombs in reach after a short spark, and the bomb's own rule keeps a nearer blast from being delayed
---

# Brief

When you place four bombs in a row, 250 units apart with the last one far off, watch them all with a chain whose reach is 300, and light the first, the first blows, half a second later the second, half a second after that the third, and the fourth never lights; the chain's blast count reads 3 and it watches only the fourth.

Write the bodies of `Watch`, `GetWatched`, `GetBlasts`, `HandleBombDestroyed`, and `EndPlay` in `ADojoM4Chain`. Rules:

- `Watch` ignores nullptr and a bomb it already watches; otherwise it remembers the bomb and listens for it leaving play.
- When a watched bomb leaves play, the chain counts a blast, stops watching it, and lights every other watched bomb within `Reach` of where it stood with a fuse of `SparkDelay`. Lighting goes through the bomb's own `Light`, so a bomb already burning toward a sooner blast is never delayed.
- `GetWatched` is how many watched bombs are still in play; `GetBlasts` is how many have left it.
- In `EndPlay` the chain stops listening to the bombs it still watches.

Dependency direction: the chain holds its bombs and listens to them; the bombs know nothing about the chain.

This chain is the third piece of the Fuse Yard boss. It reuses the bomb from the fuse quest unchanged.

Compiles against earlier quests: m4-fuse (`Quests/m4-fuse/DojoM4Bomb.h`).

## See it in the editor

Place four `DojoM4Bomb` actors along X at 0, 250, 500, and 1200 and a `DojoM4Chain` anywhere. In the level Blueprint on BeginPlay, call Watch on the chain for each bomb; on the 1 key, call Light on the first bomb with 0.2. Press Play and press 1: the blast walks along the row and stops before the far bomb. Raise Reach to 800 and play again: now all four go. Print Get Blasts on the 2 key.

# Files

## DojoM4Chain.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM4Chain.generated.h"

class ADojoM4Bomb;

/** Watches bombs and, when one leaves play, lights every watched bomb within reach after a short spark. */
UCLASS()
class ADojoM4Chain : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root; the chain never ticks. */
	ADojoM4Chain();

	/** How far a blast reaches, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chain", meta = (ClampMin = "0"))
	float Reach = 300.f;

	/** The fuse a blast lights its neighbors with, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chain", meta = (ClampMin = "0.05"))
	float SparkDelay = 0.5f;

	/** Starts watching a bomb; nullptr and bombs already watched are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Chain")
	void Watch(ADojoM4Bomb* Bomb);

	/** How many watched bombs are still in play. */
	UFUNCTION(BlueprintPure, Category = "Chain")
	int32 GetWatched() const;

	/** How many watched bombs have left play. */
	UFUNCTION(BlueprintPure, Category = "Chain")
	int32 GetBlasts() const;

protected:
	/** Stops listening to the bombs still watched. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Runs when a watched bomb leaves play: counts the blast and sparks the bombs within reach. */
	UFUNCTION()
	void HandleBombDestroyed(AActor* DestroyedActor);

	UPROPERTY()
	TArray<TObjectPtr<ADojoM4Bomb>> Bombs;

	int32 Blasts = 0;
};
```

## DojoM4Chain.cpp

```cpp
#include "DojoM4Chain.h"

#include "Components/SceneComponent.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"

ADojoM4Chain::ADojoM4Chain()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM4Chain::Watch(ADojoM4Bomb* Bomb)
{
}

int32 ADojoM4Chain::GetWatched() const
{
	return 0;
}

int32 ADojoM4Chain::GetBlasts() const
{
	return 0;
}

void ADojoM4Chain::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);
}

void ADojoM4Chain::HandleBombDestroyed(AActor* DestroyedActor)
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m4-chain/DojoM4Chain.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"
#include "Support/DojoTestWorld.h"

namespace DojoM4ChainTest
{
	/** Spawns an unlit bomb at a spot. */
	ADojoM4Bomb* PlaceBomb(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<ADojoM4Bomb>(Where, FRotator::ZeroRotator);
	}

	/** Spawns a chain with the reach and spark a designer would give it in Details. */
	ADojoM4Chain* PlaceChain(FDojoTestWorld& TestWorld, float Reach, float SparkDelay)
	{
		ADojoM4Chain* Chain = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM4Chain>(ADojoM4Chain::StaticClass(), FTransform::Identity);
		Chain->Reach = Reach;
		Chain->SparkDelay = SparkDelay;
		Chain->FinishSpawning(FTransform::Identity);
		return Chain;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Chain_BlastWalksTheRow, "Dojo.M4.Chain.BlastWalksTheRow", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lights the first of four watched bombs and checks the blast spreads to the two in reach, one spark at a time, and stops before the far one. */
bool FDojo_M4_Chain_BlastWalksTheRow::RunTest(const FString& Parameters)
{
	using namespace DojoM4ChainTest;

	FDojoTestWorld TestWorld;

	ADojoM4Chain* Chain = PlaceChain(TestWorld, 300.f, 0.5f);
	TArray<ADojoM4Bomb*> Bombs;
	for (const double X : { 0.0, 250.0, 500.0, 1200.0 }) Bombs.Add(PlaceBomb(TestWorld, FVector(X, 2000.0, 0.0)));
	if (!TestNotNull(TEXT("Chain spawned"), Chain) || Bombs.Contains(nullptr)) return false;

	TArray<TWeakObjectPtr<ADojoM4Bomb>> Watched;
	for (ADojoM4Bomb* Bomb : Bombs)
	{
		Chain->Watch(Bomb);
		Watched.Add(Bomb);
	}

	TestEqual(TEXT("The chain watches four bombs"), Chain->GetWatched(), 4);
	TestEqual(TEXT("and no blast yet"), Chain->GetBlasts(), 0);

	Bombs[0]->Light(0.2f);
	TestWorld.Tick(30);
	TestFalse(TEXT("Half a second in, the first bomb has blown"), Watched[0].IsValid());
	TestEqual(TEXT("and the chain counted it"), Chain->GetBlasts(), 1);
	TestTrue(TEXT("The second bomb, 250 away, was lit by the spark"), Watched[1].IsValid() && Watched[1]->IsLit());
	TestEqual(TEXT("with the spark's half second, of which a little is gone"), Watched[1].IsValid() ? Watched[1]->GetFuseRemaining() : -1.f, 0.2f, 0.03f);
	TestFalse(TEXT("The third bomb, 500 from the first, is out of reach and still unlit"), Watched[2].IsValid() && Watched[2]->IsLit());

	TestWorld.Tick(90);
	TestFalse(TEXT("The second bomb blew"), Watched[1].IsValid());
	TestFalse(TEXT("and its spark blew the third, 250 further on"), Watched[2].IsValid());
	TestTrue(TEXT("The far bomb, 700 from the third, is still there"), Watched[3].IsValid());
	TestFalse(TEXT("and was never lit"), Watched[3].IsValid() && Watched[3]->IsLit());
	TestEqual(TEXT("The chain counts three blasts"), Chain->GetBlasts(), 3);
	TestEqual(TEXT("and watches only the far bomb"), Chain->GetWatched(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Chain_SparkNeverDelays, "Dojo.M4.Chain.SparkNeverDelays", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Blasts next to a bomb that is already about to blow and checks the spark does not hold it back. */
bool FDojo_M4_Chain_SparkNeverDelays::RunTest(const FString& Parameters)
{
	using namespace DojoM4ChainTest;

	FDojoTestWorld TestWorld;

	ADojoM4Chain* Chain = PlaceChain(TestWorld, 300.f, 1.f);
	ADojoM4Bomb* Near = PlaceBomb(TestWorld, FVector(0.0, 4000.0, 0.0));
	ADojoM4Bomb* Burning = PlaceBomb(TestWorld, FVector(200.0, 4000.0, 0.0));
	if (!TestNotNull(TEXT("Chain spawned"), Chain) || !Near || !Burning) return false;

	const TWeakObjectPtr<ADojoM4Bomb> WatchedBurning(Burning);
	Chain->Watch(Near);
	Chain->Watch(Burning);

	Burning->Light(0.4f);
	Near->Light(0.1f);
	TestWorld.Tick(12);
	TestEqual(TEXT("The near bomb blew first"), Chain->GetBlasts(), 1);
	TestTrue(TEXT("Its 1 second spark did not delay the burning bomb, which has under a quarter second left"), WatchedBurning.IsValid() && WatchedBurning->GetFuseRemaining() < 0.25f);

	TestWorld.Tick(15);
	TestFalse(TEXT("The burning bomb blew on its own time"), WatchedBurning.IsValid());
	TestEqual(TEXT("Two blasts"), Chain->GetBlasts(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Chain_WatchRules, "Dojo.M4.Chain.WatchRules", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks Watch ignores nullptr and repeats, that an unwatched blast lights nothing, and that any watched bomb leaving play counts. */
bool FDojo_M4_Chain_WatchRules::RunTest(const FString& Parameters)
{
	using namespace DojoM4ChainTest;

	FDojoTestWorld TestWorld;

	ADojoM4Chain* Chain = PlaceChain(TestWorld, 300.f, 0.5f);
	ADojoM4Bomb* Kept = PlaceBomb(TestWorld, FVector(0.0, 6000.0, 0.0));
	ADojoM4Bomb* Stranger = PlaceBomb(TestWorld, FVector(100.0, 6000.0, 0.0));
	ADojoM4Bomb* Pulled = PlaceBomb(TestWorld, FVector(5000.0, 6000.0, 0.0));
	if (!TestNotNull(TEXT("Chain spawned"), Chain) || !Kept || !Stranger || !Pulled) return false;

	Chain->Watch(nullptr);
	Chain->Watch(Kept);
	Chain->Watch(Kept);
	Chain->Watch(Pulled);
	TestEqual(TEXT("nullptr and a repeat are ignored"), Chain->GetWatched(), 2);

	Stranger->Light(0.f);
	TestEqual(TEXT("A bomb the chain does not watch is not its blast"), Chain->GetBlasts(), 0);
	TestFalse(TEXT("and lights nothing, even 100 away"), Kept->IsLit());

	Pulled->Destroy();
	TestEqual(TEXT("A watched bomb that leaves play by any means counts"), Chain->GetBlasts(), 1);
	TestEqual(TEXT("and is no longer watched"), Chain->GetWatched(), 1);
	TestFalse(TEXT("A bomb 5000 away lights nothing"), Kept->IsLit());

	return true;
}

#endif
```

# Hints

- Every actor announces when it leaves play, so the chain binds to that event for each bomb the moment it starts watching it.
- The handler is given the actor that left, which still stands where it blew, so the other bombs can be measured from it once it is off the list.
- The event is `OnDestroyed` on `AActor`, which calls a `UFUNCTION` taking one `AActor*`, and the unbinding in `EndPlay` mirrors the binding.

# Rubric

- `Watch` ignores nullptr and repeats, and binds the bomb's `OnDestroyed` once per bomb.
- A watched bomb leaving play is counted once and stops being watched.
- Every other watched bomb within `Reach` of where it stood is lit with `SparkDelay` through its own `Light`, so a bomb about to blow sooner is never delayed.
- Bombs the chain does not watch neither count nor spark.
- The chain unbinds from the bombs it still watches in `EndPlay`; it never ticks.
- The chain holds and listens to its bombs; the bombs know nothing about the chain.

# Alternative

Each bomb could find its own neighbors when it blows, with an overlap query in a sphere of the blast's reach, and light them itself. That needs no chain actor and works for bombs nobody registered, but every bomb then has to know the reach and the spark, and a bomb that should not spread, such as a dud in a tutorial, needs a flag of its own. Keeping the rule in a chain lets one designer setting change the whole yard, and the bombs stay simple; the cost is that a bomb spawned later has to be watched to take part.
