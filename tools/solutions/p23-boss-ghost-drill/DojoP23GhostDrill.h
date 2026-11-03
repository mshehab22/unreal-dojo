#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "Quests/p5-drill-orders/DojoP5DrillSergeant.h"
#include "DojoP23GhostDrill.generated.h"

class ADojoP4DrumPad;
class ADojoP5DrillDummy;
class UTextRenderComponent;

/** One command of the live run as it was recorded: the fixed step it ran on and the move it was. */
struct FDojoP23RecordedCommand
{
	/** The fixed step the command ran on, counting from 1. */
	int32 Step = 0;

	/** The move the command asked for. */
	EDojoP5DrillMove Move = EDojoP5DrillMove::EDM_Block;
};

/** Runs a ghost drill: the player's moves run on a live dummy one fixed step at a time and are recorded, then the same recording runs again on a ghost dummy through the same step loop, and the two runs are compared. It steps no dummy and scores no hit itself. Command, Game Loop, and Double Buffer patterns. */
UCLASS()
class ADojoP23GhostDrill : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP23GhostDrill();

	/** Shows the round, the phase, both scores, and after the round the result. */
	UPROPERTY(VisibleAnywhere, Category = "Drill")
	TObjectPtr<UTextRenderComponent> Label;

	/** Length of one fixed step, in seconds. */
	UPROPERTY(EditAnywhere, Category = "Drill", meta = (ClampMin = "0.01"))
	float FixedStepSeconds = 0.1f;

	/** How many fixed steps the live run lasts, and the replay lasts the same. */
	UPROPERTY(EditAnywhere, Category = "Drill", meta = (ClampMin = "1"))
	int32 LiveSteps = 50;

	/** The most fixed steps one frame may run, so a long frame cannot start a spiral of catching up. */
	UPROPERTY(EditAnywhere, Category = "Drill", meta = (ClampMin = "1"))
	int32 MaxStepsPerFrame = 8;

	/** A move from the player: it runs on the next fixed step of the live run, and does nothing at any other time. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void PressMove(EDojoP5DrillMove Move);

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void PressNextRound();

	/** True from the start of a round until its result is worked out. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	bool IsRunning() const;

	/** True while the live run is going, and false during the replay and after. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	bool IsLive() const;

	/** The number of the current or last round, from 1. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	int32 GetRoundNumber() const;

	/** Fixed steps run this round. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	int32 GetStepCount() const;

	/** GHOST MATCHES or GHOST DRIFTED once the round is over, and empty before. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	FString GetResult() const;

	/** The commands of this round's live run, in the order they ran. */
	const TArray<FDojoP23RecordedCommand>& GetRecording() const;

	/** The dummy the player moves. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	ADojoP5DrillDummy* GetLiveDummy() const;

	/** The dummy the recording moves. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	ADojoP5DrillDummy* GetGhostDummy() const;

	/** The pad the live run scores on. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	ADojoP4DrumPad* GetLivePad() const;

	/** The pad the replay scores on. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	ADojoP4DrumPad* GetGhostPad() const;

	/** Collects the real time of the frame and runs as many whole fixed steps as it holds, up to the most allowed. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Binds the keys and starts round 1. */
	virtual void BeginPlay() override;

	/** Clears the round timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Replaces the dummies and pads with fresh ones, forgets the last recording, and starts the live run. */
	void StartRound();

	/** Works out whether the ghost ended where the live dummy did, and shows it. */
	void EndRound();

	/** Runs one fixed step: the live run takes the pending moves and records them, the replay runs the recorded ones. */
	void RunStep();

	/** Carries a move out on a dummy and hits the pad lane the dummy ends in. */
	void Perform(EDojoP5DrillMove Move, ADojoP5DrillDummy* Dummy, ADojoP4DrumPad* Pad);

	/** The round timer ran out. */
	void HandleTimeUp();

	/** A, D, Space, and R from the player. */
	void HandleKey(FKey Key);

	/** Writes the round, the phase, both scores, and the result on the label. */
	void UpdateLabel();

	/** Removes the dummies and pads of the last round. */
	void ClearActors();

	/** The dummy the player moves. */
	UPROPERTY()
	TObjectPtr<ADojoP5DrillDummy> LiveDummy;

	/** The dummy the recording moves. */
	UPROPERTY()
	TObjectPtr<ADojoP5DrillDummy> GhostDummy;

	/** The pad the live run scores on. */
	UPROPERTY()
	TObjectPtr<ADojoP4DrumPad> LivePad;

	/** The pad the replay scores on. */
	UPROPERTY()
	TObjectPtr<ADojoP4DrumPad> GhostPad;

	/** Moves pressed since the last fixed step. */
	TArray<EDojoP5DrillMove> Pending;

	/** The commands of the live run. */
	TArray<FDojoP23RecordedCommand> Recording;

	/** Real time collected and not yet used by a fixed step. */
	double Accumulator = 0.0;

	/** Fixed steps run this round. */
	int32 StepCount = 0;

	/** Number of the current or last round. */
	int32 RoundNumber = 0;

	/** True while a round runs. */
	bool bRunning = false;

	/** GHOST MATCHES or GHOST DRIFTED, set when a round ends. */
	FString Result;

	/** Ends the round after the replay has been scored. */
	FTimerHandle RoundTimer;
};
