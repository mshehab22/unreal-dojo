#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "DojoP9Gladiator.generated.h"

class UDojoP9HealthComponent;
class UDojoP9SprintComponent;
class UDojoP9StaminaComponent;

/** An arena gladiator assembled from health, stamina, and sprint parts; it only wires the parts together and keeps its old functions for the rest of the game. Component pattern. */
UCLASS()
class ADojoP9Gladiator : public ACharacter
{
	GENERATED_BODY()

public:
	/** Creates the three parts as default subobjects and turns the gladiator's own ticking off. */
	ADojoP9Gladiator();

	/** The gladiator's health. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Gladiator")
	TObjectPtr<UDojoP9HealthComponent> HealthComponent;

	/** The gladiator's stamina. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Gladiator")
	TObjectPtr<UDojoP9StaminaComponent> StaminaComponent;

	/** The gladiator's sprint. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Gladiator")
	TObjectPtr<UDojoP9SprintComponent> SprintComponent;

	/** Takes Amount of health away; a gladiator who goes down stops sprinting. */
	UFUNCTION(BlueprintCallable, Category = "Gladiator")
	void ApplyDamage(float Amount);

	/** Health left. */
	UFUNCTION(BlueprintPure, Category = "Gladiator")
	float GetHealth() const;

	/** True once health has run out. */
	UFUNCTION(BlueprintPure, Category = "Gladiator")
	bool IsDown() const;

	/** Starts sprinting unless down or out of stamina; returns whether the gladiator is now sprinting. */
	UFUNCTION(BlueprintCallable, Category = "Gladiator")
	bool StartSprint();

	/** Stops sprinting. */
	UFUNCTION(BlueprintCallable, Category = "Gladiator")
	void StopSprint();

	/** True while sprinting. */
	UFUNCTION(BlueprintPure, Category = "Gladiator")
	bool IsSprinting() const;

	/** Stamina left. */
	UFUNCTION(BlueprintPure, Category = "Gladiator")
	float GetStamina() const;

protected:
	/** Listens to the health part, so going down stops the sprint part. */
	virtual void BeginPlay() override;

	/** Stops listening to the health part. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Called by the health part when it runs out. */
	UFUNCTION()
	void HandleHealthDepleted(UDojoP9HealthComponent* Health);
};
