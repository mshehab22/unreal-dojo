#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF1YardDirector.generated.h"

class ADojoF1PopupTarget;
class ADojoF1PracticeBell;
class ADojoF1ScoreKeeper;
class ADojoF1TrainingDummy;

/** Runs a timed training yard round: raises targets, lowers the ones nobody hit, routes keys, rings the bell once, and resets for the next round. */
UCLASS()
class ADojoF1YardDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoF1YardDirector();

	/** The pop-up targets keys 1 to 6 hit, in key order. */
	UPROPERTY(EditAnywhere, Category = "Yard")
	TArray<TObjectPtr<ADojoF1PopupTarget>> Targets;

	/** The dummies Q and E strike, in key order. */
	UPROPERTY(EditAnywhere, Category = "Yard")
	TArray<TObjectPtr<ADojoF1TrainingDummy>> Dummies;

	/** The keeper wired to every target and dummy. */
	UPROPERTY(EditAnywhere, Category = "Yard")
	TObjectPtr<ADojoF1ScoreKeeper> Keeper;

	/** The bell struck when the score first reaches BellThreshold in a round. */
	UPROPERTY(EditAnywhere, Category = "Yard")
	TObjectPtr<ADojoF1PracticeBell> Bell;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Yard|Timing", meta = (ClampMin = "1.0"))
	float RoundSeconds = 45.f;

	/** Seconds between rise attempts. */
	UPROPERTY(EditAnywhere, Category = "Yard|Timing", meta = (ClampMin = "0.1"))
	float RiseInterval = 1.f;

	/** Seconds a raised target stays up before it drops by itself. */
	UPROPERTY(EditAnywhere, Category = "Yard|Timing", meta = (ClampMin = "0.1"))
	float UpSeconds = 2.5f;

	/** Seconds between checks for targets that have been up too long. */
	UPROPERTY(EditAnywhere, Category = "Yard|Timing", meta = (ClampMin = "0.01"))
	float LowerCheckInterval = 0.1f;

	/** Most targets raised at once. */
	UPROPERTY(EditAnywhere, Category = "Yard", meta = (ClampMin = "1"))
	int32 MaxRaised = 2;

	/** Score that strikes the bell, once per round. */
	UPROPERTY(EditAnywhere, Category = "Yard", meta = (ClampMin = "0"))
	int32 BellThreshold = 150;

	/** Resets everything for a new round, then starts the round, rise, and lower timers. Does nothing while a round runs. */
	UFUNCTION(BlueprintCallable, Category = "Yard")
	void StartRound();

	/** Stops every timer, ignores keys until the next round, and shows the score. */
	UFUNCTION(BlueprintCallable, Category = "Yard")
	void EndRound();

	/** Key 1 to 6: hits the target at Index while a round runs. */
	UFUNCTION(BlueprintCallable, Category = "Yard")
	void HitTarget(int32 Index);

	/** Key Q or E: strikes the dummy at Index while a round runs. */
	UFUNCTION(BlueprintCallable, Category = "Yard")
	void StrikeDummy(int32 Index);

	/** Key R: starts the next round, only between rounds. */
	UFUNCTION(BlueprintCallable, Category = "Yard")
	void RestartRound();

	/** True between StartRound and EndRound. */
	UFUNCTION(BlueprintPure, Category = "Yard")
	bool IsRoundRunning() const;

	/** Number of targets raised right now. */
	UFUNCTION(BlueprintPure, Category = "Yard")
	int32 CountRaised() const;

protected:
	/** Binds the keys when a player controller exists, then starts round 1. */
	virtual void BeginPlay() override;

	/** Clears every timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Raises one random lowered target unless MaxRaised are already up. */
	void RiseStep();

	/** Lowers every target that has been raised for UpSeconds or longer. */
	void LowerStep();

	/** Strikes the bell when the score first reaches the threshold this round. */
	void CheckBell();

	/** Routes one pressed key to its yard action. */
	void HandleKey(FKey Key);

	/** When each raised target rose, in world seconds. */
	UPROPERTY()
	TMap<TObjectPtr<ADojoF1PopupTarget>, float> RiseTimes;

	FTimerHandle RoundTimer;

	FTimerHandle RiseTimer;

	FTimerHandle LowerTimer;

	bool bRoundRunning = false;

	bool bBellRungThisRound = false;
};
