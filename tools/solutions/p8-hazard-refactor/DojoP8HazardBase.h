#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8HazardBase.generated.h"

class UTextRenderComponent;

/** The parent of the arena's hazards: it owns setting a hazard off and the cooldown, and gives each hazard a protected toolbox, so a hazard is one override (Subclass Sandbox: OnUnleash is the sandbox method, the protected functions are the provided operations). */
UCLASS(Abstract)
class ADojoP8HazardBase : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8HazardBase();

	/** Floating text that shows the last cue the hazard played. */
	UPROPERTY(VisibleAnywhere, Category = "Hazard")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds before the hazard can be set off again. */
	UPROPERTY(EditAnywhere, Category = "Hazard", meta = (ClampMin = "0.1"))
	float CooldownSeconds = 3.f;

	/** Sets the hazard off unless it is cooling down: runs the hazard's OnUnleash, then starts the cooldown. */
	UFUNCTION(BlueprintCallable, Category = "Hazard")
	void Unleash();

	/** Ends the cooldown early; the cooldown timer calls this too. */
	UFUNCTION(BlueprintCallable, Category = "Hazard")
	void FinishCooldown();

	/** True while the hazard cannot be set off. */
	UFUNCTION(BlueprintPure, Category = "Hazard")
	bool IsCoolingDown() const;

	/** The last cue the hazard played. */
	UFUNCTION(BlueprintPure, Category = "Hazard")
	FName GetLastCue() const;

protected:
	/** What this kind of hazard does when set off; every hazard overrides it, using only the tools below. */
	virtual void OnUnleash() PURE_VIRTUAL(ADojoP8HazardBase::OnUnleash, );

	/** Hurts every standing fighter within Radius of the hazard by Amount, and returns how many were hit. */
	UFUNCTION(BlueprintCallable, Category = "Hazard", meta = (BlueprintProtected))
	int32 DamageFightersInRadius(float Radius, float Amount);

	/** Plays a named cue: remembers it and shows it on the label. */
	UFUNCTION(BlueprintCallable, Category = "Hazard", meta = (BlueprintProtected))
	void PlayCue(FName Cue);

private:
	bool bCoolingDown = false;
	FName LastCue;
	FTimerHandle CooldownTimer;
};
