#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/TimerHandle.h"
#include "DojoS2EnergyComponent.generated.h"

class UDojoS2EnergyComponent;

/** Broadcast after the energy changed, with the component itself so one handler can serve many users. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS2OnEnergyChanged, UDojoS2EnergyComponent*, EnergySource);

/** A pool of energy any actor can carry (the Component pattern): it is spent in whole points, comes back on a timer while it is below full, and announces every change like the sender in the Observer pattern. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS2EnergyComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off, since energy comes back on a timer, and asks for InitializeComponent. */
	UDojoS2EnergyComponent();

	/** The most energy the pool holds; it starts full. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Energy", meta = (ClampMin = "1"))
	int32 MaxEnergy = 100;

	/** Energy that comes back each time the regen timer fires. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Energy", meta = (ClampMin = "0"))
	int32 RegenAmount = 5;

	/** Seconds between two regen steps. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Energy", meta = (ClampMin = "0.05"))
	float RegenInterval = 0.5f;

	/** Fires once for every change to the energy, after the pool holds its new value. */
	UPROPERTY(BlueprintAssignable, Category = "Energy")
	FDojoS2OnEnergyChanged OnEnergyChanged;

	/** The energy in the pool now. */
	UFUNCTION(BlueprintPure, Category = "Energy")
	int32 GetEnergy() const;

	/** True when Amount is 0 or more and the pool holds at least that much. */
	UFUNCTION(BlueprintPure, Category = "Energy")
	bool CanSpend(int32 Amount) const;

	/** Takes Amount out of the pool if it can be paid, and returns whether it was. */
	UFUNCTION(BlueprintCallable, Category = "Energy")
	bool Spend(int32 Amount);

	/** Fills the pool to the top at once and stops the regen timer. */
	UFUNCTION(BlueprintCallable, Category = "Energy")
	void Refill();

	/** True while the regen timer is running. */
	UFUNCTION(BlueprintPure, Category = "Energy")
	bool IsRegenerating() const;

	/** Fills the pool before any part's BeginPlay can spend from it. */
	virtual void InitializeComponent() override;

protected:
	/** Stops the regen timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** One regen step: some energy comes back, and the timer stops once the pool is full. */
	void RegenStep();

	int32 Energy = 0;

	FTimerHandle RegenTimer;
};
