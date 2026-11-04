#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "Quests/p18-lantern-grid/DojoP18Grid.h"
#include "DojoP18Meadow.generated.h"

class ADojoP18Lantern;
class ADojoP18MothSwarm;
class UTextRenderComponent;

/** Runs the moth meadow at dusk: scatters lanterns and moths, lets the keeper light the nearest lantern, and scores the moths drawn to the flames each second. Spatial Partition pattern, twice: a grid of lantern actors and the swarm's own grid of moths. */
UCLASS()
class ADojoP18Meadow : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP18Meadow();

	/** Shows the score, the lanterns burning, and the time left, then DUSK. */
	UPROPERTY(VisibleAnywhere, Category = "Meadow")
	TObjectPtr<UTextRenderComponent> Label;

	/** The actor who walks the meadow lighting lanterns; when empty, the first player's pawn. */
	UPROPERTY(EditAnywhere, Category = "Meadow")
	TObjectPtr<AActor> Keeper;

	/** Lanterns each round scatters. */
	UPROPERTY(EditAnywhere, Category = "Meadow", meta = (ClampMin = "0"))
	int32 LanternCount = 300;

	/** The seed of the lanterns' scatter. */
	UPROPERTY(EditAnywhere, Category = "Meadow")
	int32 LanternSeed = 81;

	/** Moths each round scatters. */
	UPROPERTY(EditAnywhere, Category = "Meadow", meta = (ClampMin = "0"))
	int32 MothCount = 2000;

	/** The seed of the moths' scatter. */
	UPROPERTY(EditAnywhere, Category = "Meadow")
	int32 MothSeed = 18;

	/** Half the side of the square meadow, centered on this actor. */
	UPROPERTY(EditAnywhere, Category = "Meadow", meta = (ClampMin = "100.0"))
	float HalfSize = 2000.f;

	/** A lantern this close to the keeper can be lit. */
	UPROPERTY(EditAnywhere, Category = "Meadow", meta = (ClampMin = "0.0"))
	float UseRange = 150.f;

	/** A moth this close to a burning lantern is drawn to it. */
	UPROPERTY(EditAnywhere, Category = "Meadow", meta = (ClampMin = "0.0"))
	float DrawRange = 250.f;

	/** How long a lit lantern burns. */
	UPROPERTY(EditAnywhere, Category = "Meadow", meta = (ClampMin = "0.1"))
	float BurnSeconds = 8.f;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Meadow", meta = (ClampMin = "1.0"))
	float RoundSeconds = 30.f;

	/** The side of one cell of the lantern grid. */
	UPROPERTY(EditAnywhere, Category = "Meadow", meta = (ClampMin = "1.0"))
	float LanternCellSize = 250.f;

	/** E: lights the nearest unlit lantern within UseRange of the keeper, the earlier lantern on a tie. */
	UFUNCTION(BlueprintCallable, Category = "Meadow")
	void PressLight();

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Meadow")
	void RestartRound();

	/** True from the start of a round until dusk. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	bool IsRunning() const;

	/** Moths drawn this round, summed over every whole second. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	int32 GetScore() const;

	/** Moths drawn at the last whole second. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	int32 GetLastDrawn() const;

	/** Whole seconds scored this round. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	int32 GetScoredSeconds() const;

	/** Seconds since the round started. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	float GetElapsed() const;

	/** This round's lanterns, in scatter order. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	TArray<ADojoP18Lantern*> GetLanterns() const;

	/** This round's swarm. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	ADojoP18MothSwarm* GetSwarm() const;

	/** Flies the moths, puts out burnt lanterns, and scores each whole second. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Finds the keeper, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

private:
	/** Clears the last round, scatters fresh lanterns and moths from their seeds, and zeroes the score. */
	void StartRound();

	/** Destroys every lantern and the swarm. */
	void ClearMeadow();

	/** Counts each moth near at least one burning lantern once, and adds the count to the score. */
	void ScoreSecond();

	/** Writes the score, the lanterns burning, and the time left, or DUSK, on the label. */
	void UpdateLabel();

	/** E and R from the player. */
	void HandleKey(FKey Key);

	/** This round's lanterns, in scatter order. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP18Lantern>> Lanterns;

	/** When each lantern was last lit, by lantern index. */
	TArray<float> LitAt;

	/** This round's swarm; the meadow flies it. */
	UPROPERTY()
	TObjectPtr<ADojoP18MothSwarm> Swarm;

	/** This round's lanterns, filed by cell. */
	FDojoP18Grid LanternGrid;

	/** Moths drawn this round. */
	int32 Score = 0;

	/** Moths drawn at the last whole second. */
	int32 LastDrawn = 0;

	/** Whole seconds scored this round. */
	int32 ScoredSeconds = 0;

	/** Seconds since the round started. */
	float Elapsed = 0.f;

	/** True while a round runs. */
	bool bRunning = false;
};
