#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS5PitKeeper.generated.h"

class ADojoS5Hatch;
class ADojoS5WaveBanner;
class ADojoS5WaveDirector;
class UDojoS5PoolComponent;
class UDojoS5WavePlan;
class UTextRenderComponent;

/** Runs a night in the beetle pit: builds the hatches, the director, and the banner around a pool it carries, turns the hero's keys into calls, and keeps the board and the gate by listening. */
UCLASS()
class ADojoS5PitKeeper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the board and the pool and turns ticking off. */
	ADojoS5PitKeeper();

	/** The board: swats, the gate, and the finale. */
	UPROPERTY(VisibleAnywhere, Category = "Pit")
	TObjectPtr<UTextRenderComponent> Board;

	/** The beetles of the pit, reused all night and from night to night. */
	UPROPERTY(VisibleAnywhere, Category = "Pit")
	TObjectPtr<UDojoS5PoolComponent> Pool;

	/** The hero, who watches the hatches and swats beetles. */
	UPROPERTY(EditAnywhere, Category = "Pit")
	TObjectPtr<AActor> Hero;

	/** The shape of the night. */
	UPROPERTY(EditAnywhere, Category = "Pit")
	TObjectPtr<UDojoS5WavePlan> Plan;

	/** How far each of the four hatches is from the keeper. */
	UPROPERTY(EditAnywhere, Category = "Pit", meta = (ClampMin = "0.0"))
	float HatchDistance = 800.f;

	/** A beetle within this many degrees of where the hero faces can be swatted. */
	UPROPERTY(EditAnywhere, Category = "Pit", meta = (ClampMin = "0.0", ClampMax = "180.0"))
	float SwatHalfAngle = 45.f;

	/** Where the banner hangs, relative to the keeper. */
	UPROPERTY(EditAnywhere, Category = "Pit")
	FVector BannerOffset = FVector(0.f, 0.f, 300.f);

	/** Space: swats the nearest loose beetle the hero faces. */
	UFUNCTION(BlueprintCallable, Category = "Pit")
	void PressSwat();

	/** Q and E: turns the hero 90 degrees left or right. */
	UFUNCTION(BlueprintCallable, Category = "Pit")
	void PressTurn(bool bRight);

	/** R: starts the next night, only after the finale. */
	UFUNCTION(BlueprintCallable, Category = "Pit")
	void RestartNight();

	/** True from the start of a night until its finale. */
	UFUNCTION(BlueprintPure, Category = "Pit")
	bool IsRunning() const;

	/** True while the director rests and after the night is over. */
	UFUNCTION(BlueprintPure, Category = "Pit")
	bool IsGateOpen() const;

	/** Beetles swatted this night. */
	UFUNCTION(BlueprintPure, Category = "Pit")
	int32 GetSwats() const;

	/** Seconds the last finished night took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Pit")
	float GetFinishSeconds() const;

	/** The director the keeper spawned. */
	UFUNCTION(BlueprintPure, Category = "Pit")
	ADojoS5WaveDirector* GetDirector() const;

	/** The banner the keeper spawned. */
	UFUNCTION(BlueprintPure, Category = "Pit")
	ADojoS5WaveBanner* GetBanner() const;

	/** The four hatches, in the order the director tries them: ahead of the keeper, right, behind, left. */
	UFUNCTION(BlueprintPure, Category = "Pit")
	TArray<ADojoS5Hatch*> GetHatches() const;

protected:
	/** Builds the pit, listens to the director, takes the hero's keys, and starts night 1. */
	virtual void BeginPlay() override;

	/** Stops listening, and removes everything the keeper spawned when the keeper itself is removed. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** A wave began, so the gate shuts. */
	UFUNCTION()
	void HandleWaveStarted(int32 Wave, int32 BeetleCount);

	/** A wave was cleared; after the last one the night is over. */
	UFUNCTION()
	void HandleWaveCleared(int32 Wave);

	/** A rest began, so the gate opens. */
	UFUNCTION()
	void HandleRestStarted(int32 NextWave, float Seconds);

	/** Routes one pressed key to its action. */
	void HandleKey(FKey Key);

	/** Resets the hero, the swats, and the clock, and starts the director from wave 1. */
	void StartNight();

	/** Rewrites the board from the keeper's own numbers. */
	void RefreshBoard();

	UPROPERTY()
	TObjectPtr<ADojoS5WaveDirector> Director;

	UPROPERTY()
	TObjectPtr<ADojoS5WaveBanner> Banner;

	UPROPERTY()
	TArray<TObjectPtr<ADojoS5Hatch>> Hatches;

	FRotator HeroStartRotation = FRotator::ZeroRotator;
	int32 Swats = 0;
	bool bRunning = false;
	bool bFinished = false;
	bool bGateOpen = false;
	float StartSeconds = 0.f;
	float FinishSeconds = 0.f;
};
