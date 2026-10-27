#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DojoM1Turntable.generated.h"

class UInputAction;
class UInputMappingContext;
struct FInputActionValue;

/** A pawn that spins on the spot while it is controlled: D turns it right, A turns it left, and it brings its own controls with it. */
UCLASS()
class ADojoM1Turntable : public APawn
{
	GENERATED_BODY()

public:
	/** Creates the scene root a pawn needs to have a place in the world, and turns ticking off. */
	ADojoM1Turntable();

	/** How fast a full push turns the pawn, in degrees per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turntable")
	float DegreesPerSecond = 90.f;

	/** The one-dimensional Turn action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turntable|Input")
	TObjectPtr<UInputAction> TurnAction;

	/** The context that maps D and A to the Turn action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turntable|Input")
	TObjectPtr<UInputMappingContext> TurnContext;

protected:
	/** Builds the default action and context when none were assigned. */
	virtual void PostInitializeComponents() override;

	/** Takes this pawn's context off the old player and puts it on the new one. */
	virtual void NotifyControllerChanged() override;

	/** Binds the Turn action to the Turn function. */
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

private:
	/** Turns the pawn by the pushed amount for this frame. */
	void Turn(const FInputActionValue& Value);
};
