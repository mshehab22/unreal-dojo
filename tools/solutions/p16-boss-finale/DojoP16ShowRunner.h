#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "DojoP16ShowRunner.generated.h"

class ADojoP16Rocket;
class ADojoP16RocketRack;
class ADojoP16Shell;
class ADojoP16ShellPool;
class UTextRenderComponent;

/** Runs the harbor finale: a list of cues fired from a rocket rack and a shell pool it sets up when play begins, every burst taken back, and nothing spawned once the show has begun. It owns no rule of the rack or the pool: the Object Pool pattern, used twice. */
UCLASS()
class ADojoP16ShowRunner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and lets the runner tick. */
	ADojoP16ShowRunner();

	/** Shows the show's progress, then SHOW OVER or ABORTED with the bursts and duds. */
	UPROPERTY(VisibleAnywhere, Category = "Show")
	TObjectPtr<UTextRenderComponent> Label;

	/** Rockets the runner's rack holds. */
	UPROPERTY(EditAnywhere, Category = "Show", meta = (ClampMin = "1"))
	int32 RocketsInRack = 4;

	/** Shells the runner's pool holds. */
	UPROPERTY(EditAnywhere, Category = "Show", meta = (ClampMin = "1"))
	int32 ShellsInPool = 4;

	/** Cues in one show; even cues fire a rocket and odd cues a shell, counting from 0. */
	UPROPERTY(EditAnywhere, Category = "Show", meta = (ClampMin = "1"))
	int32 CueCount = 12;

	/** Seconds from one cue to the next. */
	UPROPERTY(EditAnywhere, Category = "Show", meta = (ClampMin = "0.05"))
	float SecondsBetweenCues = 0.5f;

	/** How each rocket is launched. */
	UPROPERTY(EditAnywhere, Category = "Show")
	FVector LaunchVelocity = FVector(0.f, 0.f, 1500.f);

	/** Each rocket's fuse. */
	UPROPERTY(EditAnywhere, Category = "Show", meta = (ClampMin = "0.1"))
	float RocketFuseSeconds = 1.2f;

	/** Each shell's fuse. */
	UPROPERTY(EditAnywhere, Category = "Show", meta = (ClampMin = "0.1"))
	float ShellFuseSeconds = 2.f;

	/** R: starts the show from its first cue with zeroed counts. False, changing nothing, while a show runs. */
	UFUNCTION(BlueprintCallable, Category = "Show")
	bool StartShow();

	/** X: stops the running show and takes back every rocket and shell still out at once. False while no show runs. */
	UFUNCTION(BlueprintCallable, Category = "Show")
	bool AbortShow();

	/** True from the start of a show until it is over or aborted. */
	UFUNCTION(BlueprintPure, Category = "Show")
	bool IsRunning() const;

	/** Rockets and shells that burst in this show. */
	UFUNCTION(BlueprintPure, Category = "Show")
	int32 GetBurstCount() const;

	/** Cues in this show that found their rack or pool empty. */
	UFUNCTION(BlueprintPure, Category = "Show")
	int32 GetDudCount() const;

	/** The rack the runner set up. */
	UFUNCTION(BlueprintPure, Category = "Show")
	ADojoP16RocketRack* GetRack() const;

	/** The shell pool the runner set up. */
	UFUNCTION(BlueprintPure, Category = "Show")
	ADojoP16ShellPool* GetShellPool() const;

	/** Takes back whatever burst, and ends the show once every cue is fired and nothing is out. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Sets up the rack and the pool, binds the keys, and starts the first show. */
	virtual void BeginPlay() override;

	/** Stops the cues and removes the rack and the pool the runner set up. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Fires the next cue: a rocket on even cues, a shell on odd ones, or a dud when none is free. */
	void FireCue();

	/** Hands every rocket and shell that burst back to its rack or pool, counting each burst. */
	void TakeBackBursts();

	/** Hands every rocket and shell still out back at once, counting nothing. */
	void TakeBackEverything();

	/** Writes the running show's progress on the label. */
	void UpdateLabel();

	/** Routes the R and X keys. */
	void HandleKey(FKey Key);

	/** The rack the runner spawned when play began. */
	UPROPERTY()
	TObjectPtr<ADojoP16RocketRack> Rack;

	/** The shell pool the runner spawned when play began. */
	UPROPERTY()
	TObjectPtr<ADojoP16ShellPool> ShellPool;

	/** Rockets lent to this show and not yet taken back. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Rocket>> RocketsOut;

	/** Shells lent to this show and not yet taken back. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Shell>> ShellsOut;

	/** Fires the cues after the first. */
	FTimerHandle CueTimer;

	/** The cue fired next, counting from 0. */
	int32 NextCue = 0;

	/** Bursts in this show. */
	int32 Bursts = 0;

	/** Duds in this show. */
	int32 Duds = 0;

	/** True from the start of a show until it is over or aborted. */
	bool bRunning = false;
};
