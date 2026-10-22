#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP9HealthComponent.generated.h"

class UDojoP9HealthComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoP9HealthDepletedSignature, UDojoP9HealthComponent*, Health);

/** A health part any actor can carry: it takes damage and announces, once, when it runs out. Component pattern. */
UCLASS(ClassGroup = "Dojo", meta = (BlueprintSpawnableComponent))
class UDojoP9HealthComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; health only changes when something hits it. */
	UDojoP9HealthComponent();

	/** Health at the start of play. */
	UPROPERTY(EditAnywhere, Category = "Health", meta = (ClampMin = "1.0"))
	float MaxHealth = 100.f;

	/** Broadcast once, when health reaches zero. */
	UPROPERTY(BlueprintAssignable, Category = "Health")
	FDojoP9HealthDepletedSignature OnDepleted;

	/** Takes Amount of health away, never below zero; ignored once depleted. */
	UFUNCTION(BlueprintCallable, Category = "Health")
	void ApplyDamage(float Amount);

	/** Health left. */
	UFUNCTION(BlueprintPure, Category = "Health")
	float GetHealth() const;

	/** True once health has reached zero. */
	UFUNCTION(BlueprintPure, Category = "Health")
	bool IsDepleted() const;

protected:
	/** Fills health to MaxHealth. */
	virtual void BeginPlay() override;

private:
	float Health = 0.f;
};
