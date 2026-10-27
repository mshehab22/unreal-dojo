#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP9SprintComponent.generated.h"

class UDojoP9StaminaComponent;

/** A sprint part: it drains its owner's stamina part while sprinting, speeds up the owner's character movement if there is one, and stops when stamina runs out. Component pattern. */
UCLASS(ClassGroup = "Dojo", meta = (BlueprintSpawnableComponent))
class UDojoP9SprintComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the stamina part does the per-frame work. */
	UDojoP9SprintComponent();

	/** Stamina drained per second while sprinting. */
	UPROPERTY(EditAnywhere, Category = "Sprint", meta = (ClampMin = "0.0"))
	float CostPerSecond = 30.f;

	/** Walk speed is multiplied by this while sprinting. */
	UPROPERTY(EditAnywhere, Category = "Sprint", meta = (ClampMin = "1.0"))
	float SpeedMultiplier = 1.5f;

	/** Starts sprinting if the owner has a stamina part with stamina left; returns whether the owner is now sprinting. */
	UFUNCTION(BlueprintCallable, Category = "Sprint")
	bool StartSprint();

	/** Stops sprinting and gives back the normal speed. */
	UFUNCTION(BlueprintCallable, Category = "Sprint")
	void StopSprint();

	/** True while sprinting. */
	UFUNCTION(BlueprintPure, Category = "Sprint")
	bool IsSprinting() const;

protected:
	/** Gets the sprint ready when play begins; the stamina part is found later, in StartSprint. */
	virtual void BeginPlay() override;

	/** Stops listening to the stamina part. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Called by the stamina part when it runs out. */
	UFUNCTION()
	void HandleExhausted();

	/** The owner's stamina part, found when first needed. */
	UPROPERTY()
	TObjectPtr<UDojoP9StaminaComponent> Stamina;

	/** Walk speed before the sprint began. */
	float NormalWalkSpeed = 0.f;

	bool bSprinting = false;
};
