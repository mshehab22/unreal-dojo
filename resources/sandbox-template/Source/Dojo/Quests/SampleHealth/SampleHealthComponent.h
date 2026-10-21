// Quest: sample-health (template proof). Hand-written sample that shows the shape of a build quest; not part of any content pack.
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "SampleHealthComponent.generated.h"

class AController;
class UDamageType;

/** Broadcast after health changes, with the new health and the signed change. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnSampleHealthChanged, float, NewHealth, float, Delta);

/** Tracks an actor's health and listens to the owner's damage events. Component pattern; broadcasts changes (Observer) so UI never gets called directly. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class USampleHealthComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Sets defaults; this component never ticks. */
	USampleHealthComponent();

	/** Fires after every change to health, with the new value and the signed change. */
	UPROPERTY(BlueprintAssignable, Category = "Health")
	FOnSampleHealthChanged OnHealthChanged;

	/** Health right now, between 0 and MaxHealth. */
	UFUNCTION(BlueprintPure, Category = "Health")
	float GetHealth() const;

	/** True once health has reached zero. */
	UFUNCTION(BlueprintPure, Category = "Health")
	bool IsDead() const;

protected:
	/** Fills health to max and subscribes to the owner's damage events. */
	virtual void BeginPlay() override;

	/** Health at spawn. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Health", meta = (ClampMin = "1"))
	float MaxHealth = 100.f;

private:
	/** Lowers health by the damage amount, clamped at zero, and broadcasts the change. */
	UFUNCTION()
	void HandleTakeAnyDamage(AActor* DamagedActor, float Damage, const UDamageType* DamageType, AController* InstigatedBy, AActor* DamageCauser);

	float CurrentHealth = 0.f;
};
