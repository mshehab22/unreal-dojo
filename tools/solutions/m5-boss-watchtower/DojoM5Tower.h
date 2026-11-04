#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM5Tower.generated.h"

class ADojoM5Eye;
class ADojoM5Laser;
class ADojoM5Pillar;
class UTextRenderComponent;

/** Runs the watchtower yard: builds two sentries, a pillar, and a laser fence each round, fills an awareness meter while the hero is seen, and counts alarms and zaps. */
UCLASS()
class ADojoM5Tower : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the board and keeps ticking off; the tower runs on a timer. */
	ADojoM5Tower();

	/** Floating text with the round's alarms and zaps, or the finish line. */
	UPROPERTY(VisibleAnywhere, Category = "Tower")
	TObjectPtr<UTextRenderComponent> Board;

	/** The runner the tower watches; any actor will do. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tower")
	TObjectPtr<AActor> Hero;

	/** The hero finishes the round by reaching this far along the yard. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tower")
	float ExitX = 2000.f;

	/** How far each sentry sees, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tower", meta = (ClampMin = "1"))
	float SightRange = 1200.f;

	/** Half the width of each sentry's cone, in degrees. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tower", meta = (ClampMin = "1", ClampMax = "180"))
	float SightHalfAngle = 45.f;

	/** How much awareness fills each second while any sentry sees the hero, out of 1. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tower", meta = (ClampMin = "0.01"))
	float FillPerSecond = 1.f;

	/** How much awareness drains each second while no sentry sees the hero, out of 1. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tower", meta = (ClampMin = "0"))
	float DrainPerSecond = 0.5f;

	/** A hero this close to the laser beam is zapped, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tower", meta = (ClampMin = "1"))
	float ZapRadius = 60.f;

	/** Seconds between checks. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tower", meta = (ClampMin = "0.02"))
	float CheckSeconds = 0.1f;

	/** The R key: starts a fresh round, only once the last one is finished; false while a round is running. */
	UFUNCTION(BlueprintCallable, Category = "Tower")
	bool PressRestart();

	/** True from the start of a round until the hero reaches the exit. */
	UFUNCTION(BlueprintPure, Category = "Tower")
	bool IsRunning() const;

	/** Alarms raised this round. */
	UFUNCTION(BlueprintPure, Category = "Tower")
	int32 GetAlarms() const;

	/** Laser zaps taken this round. */
	UFUNCTION(BlueprintPure, Category = "Tower")
	int32 GetZaps() const;

	/** How aware the sentries are of the hero, from 0 to 1. */
	UFUNCTION(BlueprintPure, Category = "Tower")
	float GetMeter() const;

	/** Seconds since the round began, frozen at the finish. */
	UFUNCTION(BlueprintPure, Category = "Tower")
	float GetRoundSeconds() const;

	/** The sentry at Index, 0 or 1, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Tower")
	ADojoM5Eye* GetSentry(int32 Index) const;

	/** The laser fence. */
	UFUNCTION(BlueprintPure, Category = "Tower")
	ADojoM5Laser* GetLaser() const;

protected:
	/** Starts the first round. */
	virtual void BeginPlay() override;

	/** Stops the tower's timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Clears the last round, puts the hero at the start, builds the yard, and starts the timer. */
	void StartRound();

	/** Ends the round: freezes the time, stops the timer, and shows the finish line. */
	void EndRound();

	/** The check, run on a timer: updates the awareness, raises an alarm or a zap if one is due, and finishes the round at the exit. */
	void CheckYard();

	/** Sends the hero back to the start. */
	void SendHeroBack();

	/** True when the laser's last beam passes within the zap radius of the hero. */
	bool BeamTouchesHero() const;

	/** Writes the board for the current state. */
	void RefreshBoard();

	/** Destroys everything the tower built. */
	void ClearYard();

	UPROPERTY()
	TArray<TObjectPtr<ADojoM5Eye>> Sentries;

	UPROPERTY()
	TObjectPtr<ADojoM5Laser> Laser;

	UPROPERTY()
	TObjectPtr<ADojoM5Pillar> Pillar;

	FTimerHandle CheckTimer;

	float Meter = 0.f;

	int32 Alarms = 0;

	int32 Zaps = 0;

	bool bRunning = false;

	double RoundStartSeconds = 0.0;

	float FinishSeconds = 0.f;
};
