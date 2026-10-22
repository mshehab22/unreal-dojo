#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF6RangeDirector.generated.h"

class ADojoF6Blaster;
class ADojoF6Showcase;
class ADojoF6Target;
class ADojoF6TargetSpawner;
class UDataTable;
class UDojoF6LevelComponent;
class UDojoF6WeaponData;
class UTextRenderComponent;

/** Runs range day from data: waves come from a table, targets from the spawner's table, weapons from data assets, and levels from an XP curve. */
UCLASS()
class ADojoF6RangeDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and the level component and turns ticking off. */
	ADojoF6RangeDirector();

	/** Shows the wave and score while running, then CLEAR with the score and shots. */
	UPROPERTY(VisibleAnywhere, Category = "Range")
	TObjectPtr<UTextRenderComponent> Label;

	/** The shooter's level; its XP curve is set in Details. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Range")
	TObjectPtr<UDojoF6LevelComponent> Progress;

	/** The waves, played in table order; every row must be an FDojoF6WaveRow. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TObjectPtr<UDataTable> Waves;

	/** Spawns each wave's targets by kind. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TObjectPtr<ADojoF6TargetSpawner> Spawner;

	/** The shooter's blaster. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TObjectPtr<ADojoF6Blaster> Blaster;

	/** Shows the current weapon's mesh. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TObjectPtr<ADojoF6Showcase> Showcase;

	/** The starting weapon, then the upgrade. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TArray<TObjectPtr<UDojoF6WeaponData>> Weapons;

	/** The level that swaps the starting weapon for the upgrade. */
	UPROPERTY(EditAnywhere, Category = "Range", meta = (ClampMin = "1"))
	int32 UpgradeLevel = 3;

	/** Distance between targets in a wave's row. */
	UPROPERTY(EditAnywhere, Category = "Range", meta = (ClampMin = "0.0"))
	float TargetSpacing = 150.f;

	/** F: reloads when the clip is empty, otherwise shoots the oldest standing target. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void PressFire();

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void RestartRound();

	/** True from the start of a round until its last wave is cleared. */
	UFUNCTION(BlueprintPure, Category = "Range")
	bool IsRunning() const;

	/** The current wave's place in the table, starting at 1. */
	UFUNCTION(BlueprintPure, Category = "Range")
	int32 GetWaveNumber() const;

	/** Points scored this round. */
	UFUNCTION(BlueprintPure, Category = "Range")
	int32 GetScore() const;

	/** Shots fired this round; reloads are not shots. */
	UFUNCTION(BlueprintPure, Category = "Range")
	int32 GetShots() const;

	/** The targets still standing, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Range")
	TArray<ADojoF6Target*> GetStandingTargets() const;

protected:
	/** Binds the keys and starts round 1. */
	virtual void BeginPlay() override;

private:
	/** Clears the range, resets the level and the weapon, and starts the first wave. */
	void StartRound();

	/** Moves to the next wave that spawns anything, skipping empty ones with a warning, or ends the round after the last. */
	void StartNextWave();

	/** Ends the round and shows the result. */
	void EndRound();

	/** Gives the blaster the weapon at Index and shows its mesh. */
	void EquipWeapon(int32 Index);

	/** Shows the wave and score on the label. */
	void ShowStatus();

	/** Routes one pressed key to its range action. */
	void HandleKey(FKey Key);

	UPROPERTY(Transient)
	TArray<TObjectPtr<ADojoF6Target>> StandingTargets;

	int32 WaveIndex = -1;

	int32 WeaponIndex = 0;

	int32 Score = 0;

	int32 Shots = 0;

	bool bRunning = false;
};
