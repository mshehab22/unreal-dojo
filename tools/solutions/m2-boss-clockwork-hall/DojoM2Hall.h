#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM2Hall.generated.h"

class ADojoM2Bumper;
class ADojoM2Dart;
class ADojoM2Patrol;
class ADojoM2Sled;
class UTextRenderComponent;

/** Runs the clockwork hall: builds the four hazards each round, counts hits on the hero, and calls the finish when the hero reaches the exit. */
UCLASS()
class ADojoM2Hall : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the board and keeps ticking off; the hall runs on timers. */
	ADojoM2Hall();

	/** Floating text with the round's score, or the finish line. */
	UPROPERTY(VisibleAnywhere, Category = "Hall")
	TObjectPtr<UTextRenderComponent> Board;

	/** The runner the hall watches; any actor will do. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hall")
	TObjectPtr<AActor> Hero;

	/** The R key: starts a fresh round, only once the last one is finished; false while a round is running. */
	UFUNCTION(BlueprintCallable, Category = "Hall")
	bool PressRestart();

	/** True from the start of a round until the hero reaches the exit. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	bool IsRunning() const;

	/** Hits taken this round. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	int32 GetHits() const;

	/** Seconds since the round began, frozen at the finish. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	float GetRoundSeconds() const;

	/** The patrolling crusher. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	AActor* GetCrusher() const;

	/** The rolling boulder alive right now, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	AActor* GetBoulder() const;

	/** The bouncing ball. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	AActor* GetBouncer() const;

	/** The homing dart alive right now, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	AActor* GetDart() const;

protected:
	/** Starts the first round. */
	virtual void BeginPlay() override;

	/** Stops the hall's timers. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Clears the last round, puts the hero at the start, builds every hazard, and starts the timers. */
	void StartRound();

	/** Ends the round: freezes the time, stops the timers, and shows the finish line. */
	void EndRound();

	/** The hit check, run on a timer: a hazard close to the hero costs a hit and sends the hero back; the exit ends the round. */
	void CheckHall();

	/** Replaces the rolling boulder with a new one at its start. */
	void ReleaseBoulder();

	/** Replaces the dart with a new one at its launcher, chasing the hero. */
	void FireDart();

	/** Writes the board for the current state. */
	void RefreshBoard();

	/** Destroys every hazard and wall the hall built. */
	void ClearHazards();

	UPROPERTY()
	TObjectPtr<ADojoM2Patrol> Crusher;

	UPROPERTY()
	TObjectPtr<ADojoM2Sled> Boulder;

	UPROPERTY()
	TObjectPtr<ADojoM2Bumper> Bouncer;

	UPROPERTY()
	TObjectPtr<ADojoM2Dart> Dart;

	UPROPERTY()
	TArray<TObjectPtr<AActor>> Walls;

	FTimerHandle CheckTimer;

	FTimerHandle BoulderTimer;

	FTimerHandle DartTimer;

	int32 Hits = 0;

	bool bRunning = false;

	double RoundStartSeconds = 0.0;

	float FinishSeconds = 0.f;
};
