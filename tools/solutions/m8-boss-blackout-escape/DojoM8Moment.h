#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8Moment.generated.h"

class ADojoM1Walker;
class ADojoM8AlertMeter;
class ADojoM8ExitGate;
class ADojoM8Fuse;
class ADojoM8FuseBox;
class ADojoM8MomentClock;
class ADojoM8Searchlight;
class UInputAction;
class UInputMappingContext;

/** Runs the Blackout Escape: the hero collects three fuses to power the exit while a searchlight tries to catch them, and the clock decides how the moment ends. It wires the pieces together and owns none of their rules. */
UCLASS()
class ADojoM8Moment : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8Moment();

	/** How long a round may last, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Moment", meta = (ClampMin = "1.0"))
	float TimeLimitSeconds = 120.f;

	/** The pawn the player walks. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moment")
	TObjectPtr<ADojoM1Walker> Hero;

	/** The tower light that looks for the hero. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moment")
	TObjectPtr<ADojoM8Searchlight> Light;

	/** Counts the fuses and powers the gate. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moment")
	TObjectPtr<ADojoM8FuseBox> FuseBox;

	/** The way out. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moment")
	TObjectPtr<ADojoM8ExitGate> ExitGate;

	/** Fills while the light sees the hero. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moment")
	TObjectPtr<ADojoM8AlertMeter> AlertMeter;

	/** Keeps the time and decides the ending. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moment")
	TObjectPtr<ADojoM8MomentClock> Clock;

	/** The context that holds the director's own key; added when play begins and removed when it ends. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moment")
	TObjectPtr<UInputMappingContext> DirectorContext;

	/** Clears the old round, spawns the hero, the fuses, the gate, the light, the meter, and the clock fresh, wires them, starts the clock, and gives the hero to the player. */
	UFUNCTION(BlueprintCallable, Category = "Moment")
	void StartRound();

	/** The clock's label, then the fuses collected and the alert level, such as RUNNING | fuses 2/3 | alert 0.5. */
	UFUNCTION(BlueprintPure, Category = "Moment")
	FString GetStatusLine() const;

protected:
	/** Starts listening to the player's restart key and starts the first round. */
	virtual void BeginPlay() override;

	/** Stops listening and takes the director's context off the player. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** R: start a new round, only after the moment has ended. */
	void PressRestart();

	/** Powers the exit gate when the fuse box says it is powered. */
	UFUNCTION()
	void HandlePowered();

	/** Gives the hero a solid ball that overlaps pickups and the exit, because a bare pawn has no shape. */
	void GiveHeroABody();

	/** The first local player's controller, or null. */
	APlayerController* FindPlayer() const;

	UPROPERTY()
	TObjectPtr<UInputAction> RestartAction;

	UPROPERTY()
	TArray<TObjectPtr<ADojoM8Fuse>> Fuses;
};
