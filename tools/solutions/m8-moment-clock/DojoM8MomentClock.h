#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM8MomentClock.generated.h"

class ADojoM8AlertMeter;
class ADojoM8ExitGate;

/** How a moment is going: not started, running, or ended one of three ways. */
UENUM(BlueprintType)
enum class EDojoM8Outcome : uint8
{
	EMO_Waiting UMETA(DisplayName = "Waiting"),
	EMO_Running UMETA(DisplayName = "Running"),
	EMO_Escaped UMETA(DisplayName = "Escaped"),
	EMO_Caught UMETA(DisplayName = "Caught"),
	EMO_TimeUp UMETA(DisplayName = "Time Up")
};

/** Keeps the time of a moment and decides how it ends: the first of an escape, a catch, or the time limit wins, and the answer then never changes. */
UCLASS()
class ADojoM8MomentClock : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8MomentClock();

	/** How long the moment may last, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Moment Clock", meta = (ClampMin = "1.0"))
	float TimeLimitSeconds = 120.f;

	/** Ends the moment as an escape when the gate announces one; binds only once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Moment Clock")
	void WatchExit(ADojoM8ExitGate* Gate);

	/** Ends the moment as a catch when the meter announces one; binds only once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Moment Clock")
	void WatchAlert(ADojoM8AlertMeter* Meter);

	/** Starts the moment now, or starts it over: the time and the limit begin again and no earlier limit is left pending. */
	UFUNCTION(BlueprintCallable, Category = "Moment Clock")
	void Start();

	/** How the moment stands. */
	UFUNCTION(BlueprintPure, Category = "Moment Clock")
	EDojoM8Outcome GetOutcome() const;

	/** Seconds since the moment started; frozen at the instant it ended; zero before it starts. */
	UFUNCTION(BlueprintPure, Category = "Moment Clock")
	float GetElapsedSeconds() const;

	/** WAITING, RUNNING, ESCAPED in 41.2 s, CAUGHT after 12.0 s, or TIME UP. */
	UFUNCTION(BlueprintPure, Category = "Moment Clock")
	FString GetLabel() const;

private:
	/** Ends the moment as an escape. */
	UFUNCTION()
	void HandleEscaped(AActor* Escapee);

	/** Ends the moment as a catch. */
	UFUNCTION()
	void HandleCaught();

	/** Ends the moment when the time limit runs out. */
	void HandleTimeUp();

	/** Records how the moment ended, if it is still running, and stops the limit. */
	void Finish(EDojoM8Outcome Result);

	FTimerHandle LimitHandle;

	EDojoM8Outcome Outcome = EDojoM8Outcome::EMO_Waiting;

	double StartSeconds = 0.0;

	double EndSeconds = 0.0;
};
