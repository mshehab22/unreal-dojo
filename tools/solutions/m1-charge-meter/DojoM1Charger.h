#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DojoM1Charger.generated.h"

class UInputAction;
class UInputMappingContext;
struct FInputActionInstance;

/** How hard a charged shot was. */
UENUM(BlueprintType)
enum class EDojoM1ShotTier : uint8
{
	EST_None UMETA(DisplayName = "None"),
	EST_Light UMETA(DisplayName = "Light"),
	EST_Medium UMETA(DisplayName = "Medium"),
	EST_Heavy UMETA(DisplayName = "Heavy")
};

/** A pawn that charges while Space is held and fires when it is let go: a short hold is a light shot, half a charge is medium, a full charge is heavy. */
UCLASS()
class ADojoM1Charger : public APawn
{
	GENERATED_BODY()

public:
	/** Creates the scene root a pawn needs to have a place in the world, and turns ticking off. */
	ADojoM1Charger();

	/** How long Space must be held for a full charge, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Charger", meta = (ClampMin = "0.01"))
	float FullChargeSeconds = 1.f;

	/** The yes or no Charge action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Charger|Input")
	TObjectPtr<UInputAction> ChargeAction;

	/** The context that maps Space to the Charge action with a Hold trigger; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Charger|Input")
	TObjectPtr<UInputMappingContext> ChargeContext;

	/** How full the charge is, from 0 to 1. */
	UFUNCTION(BlueprintPure, Category = "Charger")
	float GetMeter() const;

	/** True from the moment Space goes down until it is let go. */
	UFUNCTION(BlueprintPure, Category = "Charger")
	bool IsCharging() const;

	/** The tier of the last shot, or None before the first. */
	UFUNCTION(BlueprintPure, Category = "Charger")
	EDojoM1ShotTier GetLastShot() const;

	/** How many shots have been fired. */
	UFUNCTION(BlueprintPure, Category = "Charger")
	int32 GetShotsFired() const;

	/** The tier a meter value earns: below one half is Light, below full is Medium, full is Heavy. */
	static EDojoM1ShotTier TierForMeter(float MeterValue);

protected:
	/** Builds the default action and context, with the Hold trigger, when none were assigned, before the pawn can be possessed. */
	virtual void PreInitializeComponents() override;

	/** Takes this pawn's context off the old player and puts it on the new one. */
	virtual void NotifyControllerChanged() override;

	/** Binds the five stages of the charge to their functions. */
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

private:
	/** The key just went down: start from an empty meter. */
	void BeginCharge();

	/** Still holding, below full: set the meter from how long the action has been going. */
	void ContinueCharge(const FInputActionInstance& Instance);

	/** The hold reached its threshold: the meter is full. */
	void ReachFullCharge();

	/** The key was let go early: fire the tier the meter had reached. */
	void ReleaseEarly();

	/** The key was let go after a full charge: fire a heavy shot. */
	void ReleaseFull();

	/** Records a shot of this tier and empties the meter. */
	void Fire(EDojoM1ShotTier Tier);

	float Meter = 0.f;

	bool bCharging = false;

	EDojoM1ShotTier LastShot = EDojoM1ShotTier::EST_None;

	int32 ShotsFired = 0;
};
