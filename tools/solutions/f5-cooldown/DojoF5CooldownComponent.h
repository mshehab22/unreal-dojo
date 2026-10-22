#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoF5CooldownComponent.generated.h"

/** Broadcast when a cooldown finishes. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoF5OnCooldownReady);

/** A reusable cooldown on a timer: start it, ask whether it is ready, and hear when it is. Any ability or device can wear one. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoF5CooldownComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the timer does the waiting. */
	UDojoF5CooldownComponent();

	/** Seconds from a start until ready again. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Cooldown", meta = (ClampMin = "0.1"))
	float CooldownSeconds = 1.2f;

	/** Fires each time a cooldown finishes. */
	UPROPERTY(BlueprintAssignable, Category = "Cooldown")
	FDojoF5OnCooldownReady OnReady;

	/** Starts the cooldown and returns true when ready; returns false and changes nothing while cooling. */
	UFUNCTION(BlueprintCallable, Category = "Cooldown")
	bool TryStart();

	/** True when no cooldown is running. */
	UFUNCTION(BlueprintPure, Category = "Cooldown")
	bool IsReady() const;

	/** Seconds until ready, or 0 when ready. */
	UFUNCTION(BlueprintPure, Category = "Cooldown")
	float GetRemaining() const;

	/** How many cooldowns have finished. */
	UFUNCTION(BlueprintPure, Category = "Cooldown")
	int32 GetReadyCount() const;

protected:
	/** Clears the timer so it never fires for a component that has left play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Counts the finished cooldown and broadcasts OnReady. */
	void HandleReady();

	FTimerHandle CooldownTimer;

	int32 ReadyCount = 0;
};
