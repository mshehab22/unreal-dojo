#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP7Ballista.generated.h"

class UDojoP7BallistaAiming;
class UDojoP7BallistaIdle;
class UDojoP7BallistaReloading;
class UDojoP7BallistaState;
class UTextRenderComponent;

/** A ballista on the arena wall that rests, aims, and reloads; each mode is an object with its own data, and every input goes to whichever mode is current (State: the owner delegates to its current state object). */
UCLASS()
class ADojoP7Ballista : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and the three mode objects, and turns ticking on. */
	ADojoP7Ballista();

	/** Floating text that shows the current mode. */
	UPROPERTY(VisibleAnywhere, Category = "Ballista")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds a full aim takes. */
	UPROPERTY(EditAnywhere, Category = "Ballista", meta = (ClampMin = "0.1"))
	float AimSeconds = 1.f;

	/** Seconds a reload takes. */
	UPROPERTY(EditAnywhere, Category = "Ballista", meta = (ClampMin = "0.1"))
	float ReloadSeconds = 2.f;

	/** The resting mode, made once and reused. */
	UPROPERTY(VisibleAnywhere, Category = "Ballista")
	TObjectPtr<UDojoP7BallistaIdle> IdleState;

	/** The aiming mode, made once and reused. */
	UPROPERTY(VisibleAnywhere, Category = "Ballista")
	TObjectPtr<UDojoP7BallistaAiming> AimingState;

	/** The reloading mode, made once and reused. */
	UPROPERTY(VisibleAnywhere, Category = "Ballista")
	TObjectPtr<UDojoP7BallistaReloading> ReloadingState;

	/** A target comes into view; the current mode decides what that means. */
	UFUNCTION(BlueprintCallable, Category = "Ballista")
	void SpotTarget();

	/** The target goes out of view; the current mode decides what that means. */
	UFUNCTION(BlueprintCallable, Category = "Ballista")
	void LoseTarget();

	/** The crew orders a shot; the current mode decides what that means. */
	UFUNCTION(BlueprintCallable, Category = "Ballista")
	void Fire();

	/** Leaves the current mode and enters NewState, running the old mode's exit and the new one's entry; does nothing for an empty or unchanged mode. */
	void ChangeState(UDojoP7BallistaState* NewState);

	/** Counts one bolt shot. */
	void LaunchBolt();

	/** The mode the ballista is in now. */
	UDojoP7BallistaState* GetCurrentState() const;

	/** True while a target is in view. */
	UFUNCTION(BlueprintPure, Category = "Ballista")
	bool HasTarget() const;

	/** Bolts shot so far. */
	UFUNCTION(BlueprintPure, Category = "Ballista")
	int32 GetBoltsFired() const;

	/** Gives the current mode one frame. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Enters the resting mode. */
	virtual void BeginPlay() override;

private:
	/** Writes the current mode's text into the label. */
	void RefreshLabel();

	/** The mode every input goes to. */
	UPROPERTY(VisibleInstanceOnly, Category = "Ballista")
	TObjectPtr<UDojoP7BallistaState> CurrentState;

	bool bHasTarget = false;
	int32 BoltsFired = 0;
};
