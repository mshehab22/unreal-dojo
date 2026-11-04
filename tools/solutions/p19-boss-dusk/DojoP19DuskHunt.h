#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "Math/RandomStream.h"
#include "Quests/p19-firefly-meadow/DojoP19MeadowFly.h"
#include "DojoP19DuskHunt.generated.h"

class ADojoP19Meadow;
class ADojoP19Swarm;
class UTextRenderComponent;

/** Runs the dusk hunt: catchable fireflies released into a meadow and named by handles, caught near the champion, and let go into the ambient swarm. Every firefly is a record; no firefly is an actor: the Data Locality pattern. */
UCLASS()
class ADojoP19DuskHunt : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and lets the hunt tick. */
	ADojoP19DuskHunt();

	/** Shows the round's progress, then JAR FULL or DUSK. */
	UPROPERTY(VisibleAnywhere, Category = "Hunt")
	TObjectPtr<UTextRenderComponent> Label;

	/** The actor that carries the jar; when empty, the first player's pawn. */
	UPROPERTY(EditAnywhere, Category = "Hunt")
	TObjectPtr<AActor> Champion;

	/** How many fireflies drift in the ambient swarm when play begins. */
	UPROPERTY(EditAnywhere, Category = "Hunt", meta = (ClampMin = "0"))
	int32 AmbientFireflies = 2000;

	/** The seed for where the catchable fireflies appear; every round uses it from the start. */
	UPROPERTY(EditAnywhere, Category = "Hunt")
	int32 Seed = 19;

	/** How close the champion must come to catch a firefly. */
	UPROPERTY(EditAnywhere, Category = "Hunt", meta = (ClampMin = "1.0"))
	float CatchRadius = 100.f;

	/** Fireflies that fill the jar. */
	UPROPERTY(EditAnywhere, Category = "Hunt", meta = (ClampMin = "1"))
	int32 JarSize = 10;

	/** Seconds from the start of a round to dusk. */
	UPROPERTY(EditAnywhere, Category = "Hunt", meta = (ClampMin = "1.0"))
	float RoundSeconds = 60.f;

	/** Seconds from the start of a round to the first release. */
	UPROPERTY(EditAnywhere, Category = "Hunt", meta = (ClampMin = "0.0"))
	float FirstReleaseSeconds = 1.f;

	/** Seconds between releases. */
	UPROPERTY(EditAnywhere, Category = "Hunt", meta = (ClampMin = "0.1"))
	float ReleaseEverySeconds = 2.f;

	/** How long a released firefly lives before it fades. */
	UPROPERTY(EditAnywhere, Category = "Hunt", meta = (ClampMin = "0.1"))
	float FireflyLifeSeconds = 6.5f;

	/** R: starts a new round with zeroed counts. False, changing nothing, while a round runs. */
	UFUNCTION(BlueprintCallable, Category = "Hunt")
	bool StartRound();

	/** True from the start of a round until the jar is full or dusk falls. */
	UFUNCTION(BlueprintPure, Category = "Hunt")
	bool IsRunning() const;

	/** Fireflies caught this round. */
	UFUNCTION(BlueprintPure, Category = "Hunt")
	int32 GetCaughtCount() const;

	/** Fireflies that faded uncaught this round. */
	UFUNCTION(BlueprintPure, Category = "Hunt")
	int32 GetMissedCount() const;

	/** The handles of this round's released fireflies still in the meadow, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Hunt")
	TArray<FDojoP19FlyHandle> GetReleased() const;

	/** The meadow the hunt set up. */
	UFUNCTION(BlueprintPure, Category = "Hunt")
	ADojoP19Meadow* GetMeadow() const;

	/** The ambient swarm the hunt set up. */
	UFUNCTION(BlueprintPure, Category = "Hunt")
	ADojoP19Swarm* GetSwarm() const;

	/** Catches fireflies near the champion, counts the faded ones, and fills the label. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Sets up the swarm and the meadow, binds R, and starts round 1. */
	virtual void BeginPlay() override;

	/** Stops the timers and removes the swarm and the meadow. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Puts one catchable firefly in the meadow at the next spot from the seed. */
	void ReleaseFirefly();

	/** Ends the round as dusk. */
	void HandleDusk();

	/** Ends the round, as JAR FULL when bJarFull, otherwise as DUSK. */
	void EndRound(bool bJarFull);

	/** Writes the running round's progress on the label. */
	void UpdateLabel();

	/** Routes the R key. */
	void HandleKey(FKey Key);

	/** The ambient swarm, spawned when play began. */
	UPROPERTY()
	TObjectPtr<ADojoP19Swarm> Swarm;

	/** The meadow of catchable fireflies, spawned when play began. */
	UPROPERTY()
	TObjectPtr<ADojoP19Meadow> Meadow;

	/** Handles of this round's released fireflies still in the meadow, oldest first. */
	TArray<FDojoP19FlyHandle> Released;

	/** Where the catchable fireflies appear, restarted from Seed every round. */
	FRandomStream Spots;

	/** Releases the catchable fireflies. */
	FTimerHandle ReleaseTimer;

	/** Ends the round at dusk. */
	FTimerHandle DuskTimer;

	/** World seconds when the round started. */
	double RoundStartSeconds = 0.0;

	/** Fireflies caught this round. */
	int32 Caught = 0;

	/** Fireflies that faded uncaught this round. */
	int32 Missed = 0;

	/** True from the start of a round until it ends. */
	bool bRunning = false;
};
