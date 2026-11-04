#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "Quests/p21-launchers/DojoP21Launcher.h"
#include "Quests/p21-wave-spawner/DojoP21Critter.h"
#include "Quests/p21-wave-spawner/DojoP21SpawnEntry.h"
#include "Quests/p21-wave-spawner/DojoP21Spawner.h"
#include "DojoP21RangeMaster.generated.h"

class UTextRenderComponent;

/** Runs the Ember Range: builds the launchers and the wave from data, lets the player fire a launcher at the nearest critter ahead, and starts clean rounds. Never names a kind of launcher, bolt, or critter. Factory Method pattern. */
UCLASS()
class ADojoP21RangeMaster : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP21RangeMaster();

	/** Shows the round's progress, then WIN or TIME UP. */
	UPROPERTY(VisibleAnywhere, Category = "Range")
	TObjectPtr<UTextRenderComponent> Label;

	/** The class of each launcher a round builds, in order; key 1 fires the first and key 2 the second. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TArray<TSubclassOf<ADojoP21Launcher>> LauncherClasses;

	/** The critters a round builds, in order from the nearest. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TArray<FDojoP21SpawnEntry> Wave;

	/** How many bolts each launcher may fire in a round. */
	UPROPERTY(EditAnywhere, Category = "Range", meta = (ClampMin = "1"))
	int32 AmmoPerLauncher = 8;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Range", meta = (ClampMin = "1.0"))
	float RoundSeconds = 30.f;

	/** Keys 1 and 2: fires the launcher with this number, counting from 1, at the nearest living critter ahead of it. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void PressFire(int32 Number);

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void RestartRound();

	/** True from the start of a round until every critter is defeated or time runs out. */
	UFUNCTION(BlueprintPure, Category = "Range")
	bool IsRunning() const;

	/** The critters still alive this round, nearest first. */
	UFUNCTION(BlueprintPure, Category = "Range")
	TArray<ADojoP21Critter*> GetCritters() const;

	/** This round's launchers, in order. */
	UFUNCTION(BlueprintPure, Category = "Range")
	TArray<ADojoP21Launcher*> GetLaunchers() const;

	/** Critters defeated this round. */
	UFUNCTION(BlueprintPure, Category = "Range")
	int32 GetDefeatedCount() const;

	/** Bolts the launcher at this index, counting from 0, may still fire this round. */
	UFUNCTION(BlueprintPure, Category = "Range")
	int32 GetShotsLeft(int32 LauncherIndex) const;

	/** Seconds the last won round took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Range")
	float GetWinSeconds() const;

protected:
	/** Binds the keys and starts round 1. */
	virtual void BeginPlay() override;

	/** Clears the round timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Removes the last round's launchers and critters, builds fresh ones from the data, and starts the clock. */
	void StartRound();

	/** Ends the round as won or timed out. */
	void EndRound(bool bWon);

	/** Destroys every launcher, critter, and spawner of the last round. */
	void ClearRange();

	/** Writes the counts, or the result, on the label. */
	void UpdateLabel();

	/** The nearest living critter whose place is further along the X axis than From, or nullptr. */
	ADojoP21Critter* FindTarget(const FVector& From) const;

	/** Round timer ran out. */
	void HandleTimeUp();

	/** 1, 2, and R from the player. */
	void HandleKey(FKey Key);

	/** The spawner that made this round's wave. */
	UPROPERTY()
	TObjectPtr<ADojoP21Spawner> WaveSpawner;

	/** This round's launchers, in order. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP21Launcher>> Launchers;

	/** The critters still alive, in the order the wave made them. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP21Critter>> Critters;

	/** How many critters the round began with. */
	int32 CritterTotal = 0;

	/** Critters defeated this round. */
	int32 DefeatedCount = 0;

	/** True while a round runs. */
	bool bRunning = false;

	/** World time when the round started. */
	float RoundStartSeconds = 0.f;

	/** Seconds the last won round took. */
	float WinSeconds = 0.f;

	/** Ends the round as TIME UP. */
	FTimerHandle RoundTimer;
};
