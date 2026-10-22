#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF5BeaconDirector.generated.h"

class ADojoF5Follower;
class ADojoF5Lever;
class ADojoF5Prodder;
class UTextRenderComponent;

/** Runs the beacon drill: the keeper lights levers through the interactable interface, lit levers go dark after a while and cool down, all lit at once rings the alarm, and a drone follows the newest light. */
UCLASS()
class ADojoF5BeaconDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF5BeaconDirector();

	/** Shows ALARM and the count while running, then WIN or TIME UP. */
	UPROPERTY(VisibleAnywhere, Category = "Drill")
	TObjectPtr<UTextRenderComponent> Label;

	/** The levers, in their designer order; each has a cooldown component. */
	UPROPERTY(EditAnywhere, Category = "Drill")
	TArray<TObjectPtr<ADojoF5Lever>> Levers;

	/** The keeper's hands: E prods the nearest lever through it. */
	UPROPERTY(EditAnywhere, Category = "Drill")
	TObjectPtr<ADojoF5Prodder> Keeper;

	/** The drone that follows the newest lit lever. */
	UPROPERTY(EditAnywhere, Category = "Drill")
	TObjectPtr<ADojoF5Follower> Drone;

	/** The actor the keeper rides with; when empty, the first player's pawn. */
	UPROPERTY(EditAnywhere, Category = "Drill")
	TObjectPtr<AActor> FollowTarget;

	/** A lever this close to the keeper can be lit. */
	UPROPERTY(EditAnywhere, Category = "Drill", meta = (ClampMin = "0.0"))
	float InteractRange = 200.f;

	/** Seconds a lit lever stays lit before it goes dark. */
	UPROPERTY(EditAnywhere, Category = "Drill|Timing", meta = (ClampMin = "0.1"))
	float LitSeconds = 6.f;

	/** Seconds a lever that went dark must cool down before it can be lit again; applied to every lever's cooldown component. */
	UPROPERTY(EditAnywhere, Category = "Drill|Timing", meta = (ClampMin = "0.1"))
	float CooldownSeconds = 4.f;

	/** Alarms needed to win. */
	UPROPERTY(EditAnywhere, Category = "Drill", meta = (ClampMin = "1"))
	int32 AlarmsToWin = 3;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Drill|Timing", meta = (ClampMin = "1.0"))
	float RoundSeconds = 60.f;

	/** Seconds between checks for levers that have been lit long enough. */
	UPROPERTY(EditAnywhere, Category = "Drill|Timing", meta = (ClampMin = "0.01"))
	float CheckInterval = 0.1f;

	/** E: lights the lever nearest the keeper within range, lowest index on a tie, through the interactable interface. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void PressInteract();

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void RestartRound();

	/** True from the start of a round until it is won or time runs out. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	bool IsRunning() const;

	/** Alarms rung this round. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	int32 GetAlarms() const;

	/** Seconds the last won round took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	float GetWinSeconds() const;

protected:
	/** Attaches the keeper to the player's pawn, binds to every lever and the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Unbinds from every lever and clears every timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Resets levers, cooldowns, the drone, and the counts, then starts the clocks. */
	void StartRound();

	/** Ends the round with a result shown on the label. */
	void EndRound(bool bWon);

	/** Called on every pull of any lever; compares each lever with its last known position. */
	UFUNCTION()
	void HandleAnyLeverPulled(bool bIsOn);

	/** Turns off every lever that has been lit for LitSeconds. */
	void CheckStep();

	/** Round timer ran out. */
	void HandleTimeUp();

	/** Routes one pressed key to its drill action. */
	void HandleKey(FKey Key);

	/** Each lever's position as of the last comparison, by index. */
	TArray<bool> WasOn;

	/** When each lever was last lit, in world seconds, by index. */
	TArray<float> LitAt;

	FTimerHandle RoundTimer;

	FTimerHandle CheckTimer;

	float StartedAt = 0.f;

	float WinSeconds = 0.f;

	int32 Alarms = 0;

	bool bRunning = false;
};
