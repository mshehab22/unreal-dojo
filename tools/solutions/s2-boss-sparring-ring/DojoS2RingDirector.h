#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS2RingDirector.generated.h"

class UDojoS2AbilityComponent;
class UDojoS2AbilityData;
class UDojoS2EnergyComponent;
class UTextRenderComponent;

/** Runs the sparring ring: grants the hero's abilities, routes keys to them, runs each started ability's effects, keeps the board by listening, and calls the finale. It owns no ability rule. */
UCLASS()
class ADojoS2RingDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the board and turns ticking off. */
	ADojoS2RingDirector();

	/** The board: energy, each ability's state, how many dummies are out, and the finale. */
	UPROPERTY(VisibleAnywhere, Category = "Sparring Ring")
	TObjectPtr<UTextRenderComponent> Board;

	/** The hero, who carries an ability component and an energy component. */
	UPROPERTY(EditAnywhere, Category = "Sparring Ring")
	TObjectPtr<AActor> Hero;

	/** The hero's abilities, on keys 1, 2, and 3 in this order. */
	UPROPERTY(EditAnywhere, Category = "Sparring Ring")
	TArray<TObjectPtr<UDojoS2AbilityData>> Loadout;

	/** The dummies to push out; each must carry the actor tag the effects look for. */
	UPROPERTY(EditAnywhere, Category = "Sparring Ring")
	TArray<TObjectPtr<AActor>> Dummies;

	/** The middle of the ring, in world space. */
	UPROPERTY(EditAnywhere, Category = "Sparring Ring")
	FVector RingCenter = FVector::ZeroVector;

	/** A dummy further than this from the middle, measured flat, is out. */
	UPROPERTY(EditAnywhere, Category = "Sparring Ring", meta = (ClampMin = "0.0"))
	float RingRadius = 600.f;

	/** How far one press of a turn key turns the hero, in degrees. */
	UPROPERTY(EditAnywhere, Category = "Sparring Ring")
	float TurnDegrees = 90.f;

	/** 1, 2, 3: tries to start the ability in that place of the loadout (counted from 0). */
	UFUNCTION(BlueprintCallable, Category = "Sparring Ring")
	void PressAbility(int32 LoadoutIndex);

	/** Left arrow: turns the hero to its left. */
	UFUNCTION(BlueprintCallable, Category = "Sparring Ring")
	void PressTurnLeft();

	/** Right arrow: turns the hero to its right. */
	UFUNCTION(BlueprintCallable, Category = "Sparring Ring")
	void PressTurnRight();

	/** R: starts the next round, only after the finale. */
	UFUNCTION(BlueprintCallable, Category = "Sparring Ring")
	void RestartRound();

	/** True from the start of a round until the finale. */
	UFUNCTION(BlueprintPure, Category = "Sparring Ring")
	bool IsRunning() const;

	/** Seconds the last finished round took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Sparring Ring")
	float GetFinishSeconds() const;

	/** How many dummies are outside the ring now. */
	UFUNCTION(BlueprintPure, Category = "Sparring Ring")
	int32 CountOut() const;

protected:
	/** Finds the hero's parts, grants the loadout, listens, remembers where everyone starts, and starts round 1. */
	virtual void BeginPlay() override;

	/** Stops listening to the hero's parts. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** An ability started, so its effects run on the hero and the board is rewritten. */
	UFUNCTION()
	void HandleAbilityActivated(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability);

	/** A cooldown started or ended, so the board is rewritten. */
	UFUNCTION()
	void HandleCooldownChanged(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability);

	/** The energy changed, so the board is rewritten. */
	UFUNCTION()
	void HandleEnergyChanged(UDojoS2EnergyComponent* EnergySource);

	/** Routes one pressed key to its action. */
	void HandleKey(FKey Key);

	/** Turns the hero by a signed number of degrees while a round runs. */
	void TurnHero(float Degrees);

	/** Puts the hero and the dummies back, refills the energy, clears every cooldown, and starts the clock. */
	void StartRound();

	/** Ends the round when every dummy is out, then rewrites the board. */
	void RefreshBoard();

	UPROPERTY()
	TObjectPtr<UDojoS2AbilityComponent> HeroAbilities;

	UPROPERTY()
	TObjectPtr<UDojoS2EnergyComponent> HeroEnergy;

	FTransform HeroStart;
	TArray<FVector> DummyStarts;
	bool bRunning = false;
	bool bFinished = false;
	float StartSeconds = 0.f;
	float FinishSeconds = 0.f;
};
