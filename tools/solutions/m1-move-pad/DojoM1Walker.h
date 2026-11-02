#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DojoM1Walker.generated.h"

class UInputAction;
class UInputMappingContext;
struct FInputActionValue;

/** A pawn that walks on the floor plane while it is controlled: W and S go forward and back, D and A go right and left. */
UCLASS()
class ADojoM1Walker : public APawn
{
	GENERATED_BODY()

public:
	/** Creates the scene root a pawn needs to have a place in the world, and turns ticking off. */
	ADojoM1Walker();

	/** How far a full push moves the pawn in one second, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Walker")
	float Speed = 300.f;

	/** The two-dimensional Move action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Walker|Input")
	TObjectPtr<UInputAction> MoveAction;

	/** The context that maps W, A, S, D to the Move action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Walker|Input")
	TObjectPtr<UInputMappingContext> MoveContext;

protected:
	/** Builds the default action and context when none were assigned, before the pawn can be possessed. */
	virtual void PreInitializeComponents() override;

	/** Takes this pawn's context off the old player and puts it on the new one. */
	virtual void NotifyControllerChanged() override;

	/** Binds the Move action to the Move function. */
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

private:
	/** Moves the pawn by the pushed direction for this frame. */
	void Move(const FInputActionValue& Value);
};
