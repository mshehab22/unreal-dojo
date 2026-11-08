#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS5WaveDirector.generated.h"

class ADojoS5Beetle;
class ADojoS5Hatch;
class UDojoS5PoolComponent;
class UDojoS5WavePlan;

/** What the director is doing right now; exactly one at a time. */
UENUM(BlueprintType)
enum class EDojoS5DirectorState : uint8
{
	EDS_Idle UMETA(DisplayName = "Idle"),
	EDS_Wave UMETA(DisplayName = "Wave"),
	EDS_Rest UMETA(DisplayName = "Rest"),
	EDS_Done UMETA(DisplayName = "Done")
};

/** Broadcast when a wave begins, with its number and how many beetles it will send. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS5OnWaveStarted, int32, Wave, int32, BeetleCount);

/** Broadcast when the last beetle of a wave has been swatted. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS5OnWaveCleared, int32, Wave);

/** Broadcast when a rest begins, with the wave that follows it and how long it lasts. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS5OnRestStarted, int32, NextWave, float, Seconds);

/** Paces a night in the pit: sends each wave's beetles out of hatches nobody watches, keeps a live limit, rests between waves, and announces every change; it knows nothing about who listens. */
UCLASS()
class ADojoS5WaveDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the director runs on timers. */
	ADojoS5WaveDirector();

	/** Fires after a wave has begun, before its first beetle comes out. */
	UPROPERTY(BlueprintAssignable, Category = "Director")
	FDojoS5OnWaveStarted OnWaveStarted;

	/** Fires after a wave is cleared, once the director has moved on to its rest or to the end of the night. */
	UPROPERTY(BlueprintAssignable, Category = "Director")
	FDojoS5OnWaveCleared OnWaveCleared;

	/** Fires after a rest has begun. */
	UPROPERTY(BlueprintAssignable, Category = "Director")
	FDojoS5OnRestStarted OnRestStarted;

	/** Chooses the plan, the pool beetles come from, the viewer to hide spawns from, and the hatches, in the order they are tried. */
	UFUNCTION(BlueprintCallable, Category = "Director")
	void Setup(UDojoS5WavePlan* NewPlan, UDojoS5PoolComponent* NewPool, AActor* NewViewer, const TArray<ADojoS5Hatch*>& NewHatches);

	/** Starts wave 1 when the director is idle or done and has a plan and a pool; returns whether it started. */
	UFUNCTION(BlueprintCallable, Category = "Director")
	bool StartNight();

	/** Stops everything, puts every beetle back to sleep, and goes back to idle. */
	UFUNCTION(BlueprintCallable, Category = "Director")
	void StopNight();

	/** What the director is doing right now. */
	UFUNCTION(BlueprintPure, Category = "Director")
	EDojoS5DirectorState GetState() const;

	/** The wave running or just finished; 0 before the first. */
	UFUNCTION(BlueprintPure, Category = "Director")
	int32 GetWave() const;

	/** How many beetles of this wave are loose right now. */
	UFUNCTION(BlueprintPure, Category = "Director")
	int32 GetAlive() const;

	/** How many beetles of this wave have not come out yet. */
	UFUNCTION(BlueprintPure, Category = "Director")
	int32 GetLeftToSpawn() const;

protected:
	/** Stops the timers when the director leaves play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Begins a wave: sets its numbers, announces it, starts the spawn timer, and sends the first beetle at once. */
	void StartWave(int32 NewWave);

	/** One spawn attempt: sends a beetle out of a hidden hatch if any are left and the live limit allows. */
	void TrySpawn();

	/** The rest is over, so the next wave begins. */
	void EndRest();

	/** A beetle of this wave was swatted: it goes back to the pool, and the wave may be cleared. */
	UFUNCTION()
	void HandleBeetleDefeated(ADojoS5Beetle* Beetle);

	/** The next hatch, in turn after the last one used, that is out of the viewer's sight; null when every hatch is watched. */
	ADojoS5Hatch* PickHatch();

	UPROPERTY()
	TObjectPtr<UDojoS5WavePlan> Plan;

	UPROPERTY()
	TObjectPtr<UDojoS5PoolComponent> Pool;

	UPROPERTY()
	TObjectPtr<AActor> Viewer;

	UPROPERTY()
	TArray<TObjectPtr<ADojoS5Hatch>> Hatches;

	EDojoS5DirectorState State = EDojoS5DirectorState::EDS_Idle;
	int32 Wave = 0;
	int32 Alive = 0;
	int32 LeftToSpawn = 0;
	int32 NextHatch = 0;
	FTimerHandle SpawnTimer;
	FTimerHandle RestTimer;
};
