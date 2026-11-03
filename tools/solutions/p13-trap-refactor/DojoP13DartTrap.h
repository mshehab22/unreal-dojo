#pragma once

#include "CoreMinimal.h"
#include "DojoP13TrapRoutine.h"
#include "GameFramework/Actor.h"
#include "DojoP13DartTrap.generated.h"

/** A dart trap that runs a designer's routine a few steps each frame, keeping its own place in the routine. Bytecode pattern. */
UCLASS()
class ADojoP13DartTrap : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking on. */
	ADojoP13DartTrap();

	/** The most steps the trap runs in one frame; a routine that needs more is jammed. */
	static constexpr int32 StepsPerFrame = 16;

	/** The routine this trap runs; other traps may run the same one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trap")
	TObjectPtr<UDojoP13TrapRoutine> Routine;

	/** Runs the routine from where it stopped last frame until it waits, ends, or runs out of steps for this frame. */
	virtual void Tick(float DeltaSeconds) override;

	/** Darts shot so far. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	int32 GetShotsFired() const;

	/** True once the routine needed more than StepsPerFrame steps in one frame or jumped to a step that does not exist; a jammed trap does nothing more. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	bool IsJammed() const;

	/** True once the routine has run past its last step. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	bool IsFinished() const;

protected:
	/** Darts shot so far, shown in Details while playing. */
	UPROPERTY(VisibleInstanceOnly, Category = "Trap")
	int32 ShotsFired = 0;

private:
	/** The step this trap runs next. */
	int32 StepIndex = 0;

	/** How long the current Wait step has waited. */
	float WaitedSeconds = 0.f;

	/** True once the routine went wrong. */
	bool bJammed = false;
};
