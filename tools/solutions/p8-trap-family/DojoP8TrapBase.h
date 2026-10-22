#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8TrapBase.generated.h"

class UTextRenderComponent;

/** The base every arena trap derives from: it owns springing and the cooldown, and gives subclasses a small set of protected tools so a new trap is one override that never touches fighters, cues, or timers directly (Subclass Sandbox: Trigger is the hook, the protected functions are the tools). */
UCLASS(Abstract)
class ADojoP8TrapBase : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8TrapBase();

	/** Floating text that shows the last cue the trap played. */
	UPROPERTY(VisibleAnywhere, Category = "Trap")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds after springing before the trap can spring again. */
	UPROPERTY(EditAnywhere, Category = "Trap", meta = (ClampMin = "0.1"))
	float CooldownSeconds = 2.f;

	/** Springs the trap unless it is cooling down: runs the trap's own Trigger, then starts the cooldown. */
	UFUNCTION(BlueprintCallable, Category = "Trap")
	void Spring();

	/** Ends the cooldown early; the cooldown timer calls this too. */
	UFUNCTION(BlueprintCallable, Category = "Trap")
	void FinishCooldown();

	/** True while the trap cannot spring. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	bool IsCoolingDown() const;

	/** Every cue the trap has played, oldest first. */
	const TArray<FName>& GetCueLog() const;

protected:
	/** What this kind of trap does when it springs; every trap overrides it, using only the tools below. */
	virtual void Trigger() PURE_VIRTUAL(ADojoP8TrapBase::Trigger, );

	/** Hurts every standing fighter within Radius of the trap by Amount, and returns how many were hit. */
	int32 DamageFightersInRadius(float Radius, float Amount);

	/** Moves every standing fighter within Radius of the trap Distance further away from it. */
	void PushFightersAway(float Radius, float Distance);

	/** Plays a named cue: logs it and shows it on the label. */
	void PlayCue(FName Cue);

private:
	TArray<FName> CueLog;
	bool bCoolingDown = false;
	FTimerHandle CooldownTimer;
};
