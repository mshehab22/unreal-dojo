#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "DojoP22Gauntlet.generated.h"

class UTextRenderComponent;

/**
 * Runs the gauntlet: three gates, each held by three training dummies, a runner who strikes them, and a pit that sends the runner back to the last gate.
 * Every hit and miss goes through the hit feedback facade and every checkpoint through the checkpoint desk; the gauntlet never touches the sound desk, the spark pool, the HUD ticker, or a save object.
 * Facade pattern, twice.
 */
UCLASS()
class ADojoP22Gauntlet : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP22Gauntlet();

	/** Shows the gate, the health, and the seconds left, then CLEAR, TIME UP, or DOWN. */
	UPROPERTY(VisibleAnywhere, Category = "Gauntlet")
	TObjectPtr<UTextRenderComponent> Label;

	/** The actor who runs the gauntlet; when empty, the first player's pawn. */
	UPROPERTY(EditAnywhere, Category = "Gauntlet")
	TObjectPtr<AActor> Runner;

	/** How many gates there are. */
	static constexpr int32 GateCount = 3;

	/** How many dummies hold each gate. */
	static constexpr int32 DummiesPerGate = 3;

	/** E: strikes the nearest standing dummy of the gate ahead within reach of the runner, the earlier dummy on a tie, or misses. */
	UFUNCTION(BlueprintCallable, Category = "Gauntlet")
	void PressStrike();

	/** The pit: the runner loses health and goes back to the newest checkpoint, or to the start before the first gate opens. */
	UFUNCTION(BlueprintCallable, Category = "Gauntlet")
	void RunnerFell();

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Gauntlet")
	void RestartRound();

	/** True from the start of a round until it is clear, out of time, or the runner is down. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	bool IsRunning() const;

	/** The runner's health. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	int32 GetHealth() const;

	/** Gates opened this round. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	int32 GetGatesOpen() const;

	/** Seconds since the round started. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	float GetElapsed() const;

	/** Where dummy Index stands: gate Index / 3, place Index % 3. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	FVector GetDummySpot(int32 Index) const;

	/** Dummy Index's health; 0 or less once broken. */
	UFUNCTION(BlueprintPure, Category = "Gauntlet")
	int32 GetDummyHealth(int32 Index) const;

	/** Counts down the round. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Finds the runner, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

private:
	/** Stands every dummy up, restores the runner's health and spot, forgets the checkpoints, and starts the clock. */
	void StartRound();

	/** Opens the gate ahead and saves a checkpoint there. */
	void OpenGate();

	/** Ends the round and shows ResultText. */
	void EndRound(const FString& ResultText);

	/** Writes the gate, the health, and the seconds left on the label. */
	void UpdateLabel();

	/** E and R from the player. */
	void HandleKey(FKey Key);

	/** Each dummy's health, gate by gate. */
	TArray<int32> DummyHealth;

	/** The runner's health. */
	int32 Health = 0;

	/** Gates opened this round. */
	int32 GatesOpen = 0;

	/** Seconds since the round started. */
	float Elapsed = 0.f;

	/** True while a round runs. */
	bool bRunning = false;
};
