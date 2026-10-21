#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF2ClayRange.generated.h"

class ADojoF1PopupTarget;
class ADojoF1TrainingDummy;
class ADojoF2ClayDisc;
class ADojoF2DummySpawner;
class ADojoF2Spotter;
class ADojoF2TargetRack;
class UTextRenderComponent;

/** Runs a clay range round: throws discs, shoots what the spotter watches, punishes fallen discs with penalty dummies, and lends bonus targets for streaks. */
UCLASS()
class ADojoF2ClayRange : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the score label and turns ticking off. */
	ADojoF2ClayRange();

	/** Floating text that shows the score at the start and end of each round. */
	UPROPERTY(VisibleAnywhere, Category = "Range")
	TObjectPtr<UTextRenderComponent> Label;

	/** The disc class to throw. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TSubclassOf<ADojoF2ClayDisc> DiscClass;

	/** Watches the newest disc in play; Space shoots what it watches. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TObjectPtr<ADojoF2Spotter> Spotter;

	/** Makes a penalty dummy for every fallen disc. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TObjectPtr<ADojoF2DummySpawner> PenaltySpawner;

	/** Lends the bonus targets. */
	UPROPERTY(EditAnywhere, Category = "Range")
	TObjectPtr<ADojoF2TargetRack> BonusRack;

	/** Discs thrown in one round. */
	UPROPERTY(EditAnywhere, Category = "Range", meta = (ClampMin = "1"))
	int32 DiscsPerRound = 10;

	/** Seconds between throws. */
	UPROPERTY(EditAnywhere, Category = "Range|Timing", meta = (ClampMin = "0.1"))
	float ThrowInterval = 2.f;

	/** Seconds a disc stays in play before it falls. */
	UPROPERTY(EditAnywhere, Category = "Range|Timing", meta = (ClampMin = "0.1"))
	float DiscSeconds = 3.f;

	/** Seconds a bonus target stays lent out. */
	UPROPERTY(EditAnywhere, Category = "Range|Timing", meta = (ClampMin = "0.1"))
	float BonusSeconds = 4.f;

	/** Seconds between checks for discs that have fallen. */
	UPROPERTY(EditAnywhere, Category = "Range|Timing", meta = (ClampMin = "0.01"))
	float CheckInterval = 0.1f;

	/** Points for a shattered disc. */
	UPROPERTY(EditAnywhere, Category = "Range", meta = (ClampMin = "0"))
	int32 PointsPerDisc = 10;

	/** Shattered discs in a row that earn a bonus target. */
	UPROPERTY(EditAnywhere, Category = "Range", meta = (ClampMin = "1"))
	int32 BonusStreak = 3;

	/** Points for breaking a bonus target. */
	UPROPERTY(EditAnywhere, Category = "Range", meta = (ClampMin = "0"))
	int32 PointsPerBonus = 25;

	/** Resets the range and starts throwing. Does nothing while a round runs. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void StartRound();

	/** Stops throwing, removes penalty dummies, recalls the bonus target, and shows the score. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void EndRound();

	/** Space: shatters the disc the spotter watches and scores it. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void ShootSpotted();

	/** F: strikes the oldest penalty dummy still standing. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void StrikePenalty();

	/** T: hits the lent bonus target, raising it again if the hit did not break it. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void HitBonus();

	/** R: starts the next round, only between rounds. */
	UFUNCTION(BlueprintCallable, Category = "Range")
	void RestartRound();

	/** True between StartRound and EndRound. */
	UFUNCTION(BlueprintPure, Category = "Range")
	bool IsRoundRunning() const;

	/** Points this round. */
	UFUNCTION(BlueprintPure, Category = "Range")
	int32 GetScore() const;

	/** Discs thrown this round. */
	UFUNCTION(BlueprintPure, Category = "Range")
	int32 GetThrownCount() const;

	/** The bonus target lent out now, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Range")
	ADojoF1PopupTarget* GetActiveBonus() const;

	/** Penalty dummies still standing. */
	UFUNCTION(BlueprintPure, Category = "Range")
	int32 CountStandingPenalties() const;

protected:
	/** Binds the keys when a player controller exists, then starts round 1. */
	virtual void BeginPlay() override;

	/** Clears every timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Throws one disc, unless the round's discs are all out or a penalty dummy stands. */
	void ThrowStep();

	/** Finds discs that fell, spawns their penalty dummies, points the spotter, and ends the round after the last disc. */
	void CheckStep();

	/** Recalls the bonus target when its time is up. */
	void EndBonus();

	/** Shows the score on the label. */
	void ShowScore();

	/** Routes one pressed key to its range action. */
	void HandleKey(FKey Key);

	/** Discs thrown and not yet shattered; a destroyed entry is nulled by the next garbage collection, so each one is checked with IsValid. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoF2ClayDisc>> DiscsInPlay;

	/** Penalty dummies this round, oldest first. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoF1TrainingDummy>> Penalties;

	UPROPERTY()
	TObjectPtr<ADojoF1PopupTarget> ActiveBonus;

	FTimerHandle ThrowTimer;

	FTimerHandle CheckTimer;

	FTimerHandle BonusTimer;

	int32 Score = 0;

	int32 Thrown = 0;

	int32 Streak = 0;

	bool bBonusScored = false;

	bool bRoundRunning = false;
};
