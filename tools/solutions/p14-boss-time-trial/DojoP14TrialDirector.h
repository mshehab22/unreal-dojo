#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "DojoP14TrialDirector.generated.h"

class ADojoP14FinishLine;
class ADojoP14StartLights;
class UDojoP14LapLog;
class UTextRenderComponent;

/** Runs time trial rounds on one track. Owns the ranked and the practice log, hands each round's finish line the one that round writes into, and starts every round on the track's one set of start lights. Reaches nothing through a global: the Singleton pattern, avoided. */
UCLASS()
class ADojoP14TrialDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and lets the director tick. */
	ADojoP14TrialDirector();

	/** Shows the round's progress, then FINISH or TIME UP. */
	UPROPERTY(VisibleAnywhere, Category = "Trial")
	TObjectPtr<UTextRenderComponent> Label;

	/** The actor that drives the track; when empty, the first player's pawn. */
	UPROPERTY(EditAnywhere, Category = "Trial")
	TObjectPtr<AActor> Champion;

	/** The name the champion's laps are written under. */
	UPROPERTY(EditAnywhere, Category = "Trial")
	FName DriverName = TEXT("Champion");

	/** Where each round's finish line stands; the champion crosses it moving toward greater X. */
	UPROPERTY(EditAnywhere, Category = "Trial")
	FVector LineSpot = FVector::ZeroVector;

	/** Where the director puts start lights when the track has none running. */
	UPROPERTY(EditAnywhere, Category = "Trial")
	FVector LightsSpot = FVector(-300.f, 0.f, 200.f);

	/** Laps that finish a round. */
	UPROPERTY(EditAnywhere, Category = "Trial", meta = (ClampMin = "1"))
	int32 LapsPerRound = 3;

	/** Length of a round, counted from the moment it starts, countdown included. */
	UPROPERTY(EditAnywhere, Category = "Trial", meta = (ClampMin = "1.0"))
	float RoundSeconds = 120.f;

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Trial")
	void RestartRound();

	/** P: switches the next round between ranked and practice, only between rounds. */
	UFUNCTION(BlueprintCallable, Category = "Trial")
	void TogglePractice();

	/** True from the start of a round until it finishes or time runs out. */
	UFUNCTION(BlueprintPure, Category = "Trial")
	bool IsRunning() const;

	/** True when laps go into the practice log. */
	UFUNCTION(BlueprintPure, Category = "Trial")
	bool IsPractice() const;

	/** Laps finished this round. */
	UFUNCTION(BlueprintPure, Category = "Trial")
	int32 GetLapsThisRound() const;

	/** Crossings of the line before the lights turned green this round. */
	UFUNCTION(BlueprintPure, Category = "Trial")
	int32 GetFalseStarts() const;

	/** Seconds from green to the last lap of the last finished round, or 0. */
	UFUNCTION(BlueprintPure, Category = "Trial")
	float GetFinishSeconds() const;

	/** The log ranked rounds write into; kept for every round. */
	UFUNCTION(BlueprintPure, Category = "Trial")
	UDojoP14LapLog* GetRankedLog() const;

	/** The log practice rounds write into; kept for every round. */
	UFUNCTION(BlueprintPure, Category = "Trial")
	UDojoP14LapLog* GetPracticeLog() const;

	/** The start lights this director counts down on. */
	UFUNCTION(BlueprintPure, Category = "Trial")
	ADojoP14StartLights* GetLights() const;

	/** This round's finish line. */
	UFUNCTION(BlueprintPure, Category = "Trial")
	ADojoP14FinishLine* GetFinishLine() const;

	/** Turns green into the start of lap 1 and watches the champion cross the line. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Finds the champion, makes both logs, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Clears the round timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Replaces the finish line, hands it this round's log, and starts the countdown. */
	void StartRound();

	/** Ends the round as finished or timed out. */
	void EndRound(bool bFinished);

	/** The set of start lights already running in this world, or a new set at LightsSpot when none runs. */
	ADojoP14StartLights* FindOrSpawnLights();

	/** The champion crossed the line: a false start before green, a finished lap after. */
	void HandleCrossing();

	/** Writes the mode, laps, false starts, and best ranked lap on the label. */
	void UpdateLabel();

	/** Round timer ran out. */
	void HandleTimeUp();

	/** R and P from the player. */
	void HandleKey(FKey Key);

	/** The log ranked rounds write into. */
	UPROPERTY()
	TObjectPtr<UDojoP14LapLog> RankedLog;

	/** The log practice rounds write into. */
	UPROPERTY()
	TObjectPtr<UDojoP14LapLog> PracticeLog;

	/** This round's finish line. */
	UPROPERTY()
	TObjectPtr<ADojoP14FinishLine> Line;

	/** The start lights this director uses. */
	UPROPERTY()
	TObjectPtr<ADojoP14StartLights> Lights;

	/** True while a round runs. */
	bool bRunning = false;

	/** True when laps go into the practice log. */
	bool bPractice = false;

	/** True once this round's lights have turned green. */
	bool bRacing = false;

	/** Laps finished this round. */
	int32 LapsThisRound = 0;

	/** Crossings before green this round. */
	int32 FalseStarts = 0;

	/** World time when this round's lights turned green. */
	float GreenSeconds = 0.f;

	/** Seconds from green to the last lap of the last finished round. */
	float FinishSeconds = 0.f;

	/** The champion's X on the last tick. */
	float LastChampionX = 0.f;

	/** False until the champion has been seen once this round. */
	bool bHasLastChampionX = false;

	/** Ends the round as TIME UP. */
	FTimerHandle RoundTimer;
};
