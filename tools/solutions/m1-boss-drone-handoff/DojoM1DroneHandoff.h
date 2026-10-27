#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM1DroneHandoff.generated.h"

class ADojoM1Charger;
class ADojoM1Turntable;
class ADojoM1Walker;
class UDojoM1PauseSwitch;
class UInputAction;
class UInputMappingContext;

/** Runs a handoff drill: the hero walks to a drone, takes it over, hands control back, and the round ends when both drones have done their job. */
UCLASS()
class ADojoM1DroneHandoff : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the pause switch and turns ticking off. */
	ADojoM1DroneHandoff();

	/** How far from the hero each drone waits, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Handoff")
	float DroneDistance = 500.f;

	/** How close the hero must stand to take a drone over, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Handoff")
	float ReachDistance = 250.f;

	/** How far the scanner drone must have turned, in degrees, for the drill to count. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Handoff")
	float TurnGoalDegrees = 90.f;

	/** The pawn the player walks. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Handoff")
	TObjectPtr<ADojoM1Walker> Hero;

	/** The drone that turns on the spot. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Handoff")
	TObjectPtr<ADojoM1Turntable> Scanner;

	/** The drone that charges and fires. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Handoff")
	TObjectPtr<ADojoM1Charger> Cannon;

	/** Blocks the movement keys, Space, and the handoff key while it is open. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Handoff")
	TObjectPtr<UDojoM1PauseSwitch> Pause;

	/** Clears the old round, spawns the hero and both drones fresh, and gives the hero to the player. */
	UFUNCTION(BlueprintCallable, Category = "Handoff")
	void StartRound();

	/** HERO, SCANNER, or CANNON for the pawn the player controls, with PAUSED added while the pause is open. */
	UFUNCTION(BlueprintPure, Category = "Handoff")
	FString GetModeLabel() const;

	/** The mode label, or DRILL DONE with the round's time once the drill is finished. */
	UFUNCTION(BlueprintPure, Category = "Handoff")
	FString GetStatusLine() const;

	/** True once the drill is finished. */
	UFUNCTION(BlueprintPure, Category = "Handoff")
	bool IsRoundDone() const;

protected:
	/** Starts listening to the player's keys and starts the first round. */
	virtual void BeginPlay() override;

	/** Stops listening and takes the director's context off the player. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** F: take over the nearest drone in reach, or hand control back to the hero. */
	void PressHandoff();

	/** Tab: open the pause if it is closed, close it if it is open. */
	void PressPause();

	/** R: start a new round, only after the drill is finished. */
	void PressRestart();

	/** The drone nearest the hero within reach; the scanner wins a tie; null when none is in reach. */
	APawn* FindDroneInReach() const;

	/** Gives the player the pawn, if there is a player. */
	void GiveControlTo(APawn* Target);

	/** Hands control back to the hero and finishes the drill if both drones have done their job. */
	void ReturnToHero();

	/** The first local player's controller, or null. */
	APlayerController* FindPlayer() const;

	UPROPERTY()
	TObjectPtr<UInputAction> HandoffAction;

	UPROPERTY()
	TObjectPtr<UInputAction> PauseAction;

	UPROPERTY()
	TObjectPtr<UInputAction> RestartAction;

	UPROPERTY()
	TObjectPtr<UInputMappingContext> DirectorContext;

	bool bRoundDone = false;

	double RoundStartSeconds = 0.0;

	double RoundSeconds = 0.0;
};
