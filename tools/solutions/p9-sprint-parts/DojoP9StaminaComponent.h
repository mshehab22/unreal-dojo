#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP9StaminaComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoP9StaminaExhaustedSignature);

/** A stamina part any actor can carry: other parts spend it in one go or drain it over time, and it refills while nothing drains it. Component pattern. */
UCLASS(ClassGroup = "Dojo", meta = (BlueprintSpawnableComponent))
class UDojoP9StaminaComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Ticks every frame and asks for InitializeComponent. */
	UDojoP9StaminaComponent();

	/** Stamina when full. */
	UPROPERTY(EditAnywhere, Category = "Stamina", meta = (ClampMin = "1.0"))
	float MaxStamina = 100.f;

	/** Stamina regained per second while nothing drains it. */
	UPROPERTY(EditAnywhere, Category = "Stamina", meta = (ClampMin = "0.0"))
	float RegenPerSecond = 25.f;

	/** Broadcast when a drain or a spend takes stamina to zero. */
	UPROPERTY(BlueprintAssignable, Category = "Stamina")
	FDojoP9StaminaExhaustedSignature OnExhausted;

	/** Spends Amount at once if there is that much; returns false, spending nothing, if there is not. */
	UFUNCTION(BlueprintCallable, Category = "Stamina")
	bool TrySpend(float Amount);

	/** Drains this much stamina per second until set back to zero; regeneration pauses while it drains. */
	UFUNCTION(BlueprintCallable, Category = "Stamina")
	void SetDrainPerSecond(float Rate);

	/** Fills stamina back to MaxStamina. */
	UFUNCTION(BlueprintCallable, Category = "Stamina")
	void Refill();

	/** Stamina left. */
	UFUNCTION(BlueprintPure, Category = "Stamina")
	float GetStamina() const;

	/** True while stamina is at zero. */
	UFUNCTION(BlueprintPure, Category = "Stamina")
	bool IsExhausted() const;

	/** Fills stamina before anything can spend it. */
	virtual void InitializeComponent() override;

	/** Drains or regenerates by DeltaTime. */
	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

private:
	/** Broadcasts OnExhausted when stamina has just reached zero. */
	void AfterLoss(float Before);

	float Stamina = 0.f;

	float DrainPerSecond = 0.f;
};
