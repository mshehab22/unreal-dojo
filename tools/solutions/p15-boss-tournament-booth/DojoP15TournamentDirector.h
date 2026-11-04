#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "DojoP15TournamentDirector.generated.h"

class ADojoP15Crier;
class UDojoP15TracingAnnouncer;
class UTextRenderComponent;

/** Runs the tournament booth: timed rounds between the player and a rival, with every line announced and every result scored through whatever announcer and scoreboard are provided at that moment. Service Locator pattern. */
UCLASS()
class ADojoP15TournamentDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP15TournamentDirector();

	/** Shows the round, the hits, and after the round the result and the points. */
	UPROPERTY(VisibleAnywhere, Category = "Tournament")
	TObjectPtr<UTextRenderComponent> Label;

	/** The announcer class to provide when play begins; empty provides nothing. */
	UPROPERTY(EditAnywhere, Category = "Tournament")
	TSubclassOf<UObject> AnnouncerClass;

	/** The scoreboard class to provide when play begins; empty provides nothing. */
	UPROPERTY(EditAnywhere, Category = "Tournament")
	TSubclassOf<UObject> ScoreboardClass;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Tournament", meta = (ClampMin = "1.0"))
	float RoundSeconds = 30.f;

	/** Seconds between the rival's hits. */
	UPROPERTY(EditAnywhere, Category = "Tournament", meta = (ClampMin = "0.5"))
	float RivalInterval = 4.f;

	/** The player's fighter. */
	UPROPERTY(EditAnywhere, Category = "Tournament")
	FName PlayerName = TEXT("Ayla");

	/** The rival. */
	UPROPERTY(EditAnywhere, Category = "Tournament")
	FName RivalName = TEXT("Brom");

	/** Points for winning a round. */
	UPROPERTY(EditAnywhere, Category = "Tournament", meta = (ClampMin = "0"))
	int32 WinPoints = 3;

	/** Points each fighter gets for a drawn round. */
	UPROPERTY(EditAnywhere, Category = "Tournament", meta = (ClampMin = "0"))
	int32 DrawPoints = 1;

	/** H: the player lands a hit, only while a round runs. */
	UFUNCTION(BlueprintCallable, Category = "Tournament")
	void PressHit();

	/** T: wraps the announcer now in place in a tracer, or takes the tracer out and puts back what it wrapped. */
	UFUNCTION(BlueprintCallable, Category = "Tournament")
	void PressTrace();

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Tournament")
	void PressNextRound();

	/** True from the start of a round until its time is up. */
	UFUNCTION(BlueprintPure, Category = "Tournament")
	bool IsRunning() const;

	/** The number of the current or last round, from 1. */
	UFUNCTION(BlueprintPure, Category = "Tournament")
	int32 GetRoundNumber() const;

	/** The player's hits this round. */
	UFUNCTION(BlueprintPure, Category = "Tournament")
	int32 GetPlayerHits() const;

	/** The rival's hits this round. */
	UFUNCTION(BlueprintPure, Category = "Tournament")
	int32 GetRivalHits() const;

	/** True while the tracer is in place. */
	UFUNCTION(BlueprintPure, Category = "Tournament")
	bool IsTracing() const;

	/** The tracer now in place, or nullptr. */
	UDojoP15TracingAnnouncer* GetTracer() const;

protected:
	/** Provides the chosen classes, makes the crier, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Clears the round timers. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Provides an announcer and a scoreboard made from the chosen classes, when there are any. */
	void ProvideChosenServices();

	/** Resets the hits, starts both timers, and announces the round. */
	void StartRound();

	/** Stops the timers, announces the end, and scores the round. */
	void EndRound();

	/** Has the crier call Line out. */
	void Say(const FString& Line);

	/** Writes the round, the hits, and the result on the label. */
	void UpdateLabel();

	/** The round timer ran out. */
	void HandleTimeUp();

	/** The rival lands a hit. */
	void HandleRivalHit();

	/** H, T, and R from the player. */
	void HandleKey(FKey Key);

	/** The crier that calls out every line. */
	UPROPERTY()
	TObjectPtr<ADojoP15Crier> Crier;

	/** The tracer in place while tracing, or nullptr. */
	UPROPERTY()
	TObjectPtr<UDojoP15TracingAnnouncer> Tracer;

	/** The announcer the tracer wraps, put back when tracing stops. */
	UPROPERTY()
	TObjectPtr<UObject> Wrapped;

	/** Number of the current or last round. */
	int32 RoundNumber = 0;

	/** The player's hits this round. */
	int32 PlayerHits = 0;

	/** The rival's hits this round. */
	int32 RivalHits = 0;

	/** True while a round runs. */
	bool bRunning = false;

	/** The result line of the last round, shown on the label. */
	FString Result;

	/** Ends the round. */
	FTimerHandle RoundTimer;

	/** Fires the rival's hits. */
	FTimerHandle RivalTimer;
};
