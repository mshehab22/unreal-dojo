#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Lift.generated.h"

class UTextRenderComponent;

/** A lift that rises and falls between floor heights on request, slowing as it arrives, and ignores calls while it is moving. */
UCLASS()
class ADojoM2Lift : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label as the root and keeps ticking off until the lift has somewhere to go. */
	ADojoM2Lift();

	/** Floating text that reads FLOOR and the floor number at rest, or GOING TO and the floor number on the way. */
	UPROPERTY(VisibleAnywhere, Category = "Lift")
	TObjectPtr<UTextRenderComponent> Label;

	/** The world height of each floor. The lift starts at floor 0, so place it at the first height. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lift")
	TArray<float> FloorHeights = { 0.f, 400.f, 800.f };

	/** How eagerly the lift closes the gap to its floor; higher arrives sooner. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lift", meta = (ClampMin = "0.1"))
	float InterpSpeed = 4.f;

	/** The lift lands exactly on the floor once it is this close, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lift", meta = (ClampMin = "0.01"))
	float ArriveTolerance = 1.f;

	/** Sends the lift to a floor; false when it is already moving, already there, or the floor does not exist. */
	UFUNCTION(BlueprintCallable, Category = "Lift")
	bool CallTo(int32 FloorIndex);

	/** True while the lift is on its way. */
	UFUNCTION(BlueprintPure, Category = "Lift")
	bool IsMoving() const;

	/** The floor the lift last stopped at. */
	UFUNCTION(BlueprintPure, Category = "Lift")
	int32 GetCurrentFloor() const;

	/** The floor the lift is heading for, or the current floor when it is at rest. */
	UFUNCTION(BlueprintPure, Category = "Lift")
	int32 GetTargetFloor() const;

	/** Closes in on the target height, slowing as it nears, and stops exactly on it. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Shows the starting floor. */
	virtual void BeginPlay() override;

private:
	/** Writes the label for the current state. */
	void RefreshLabel();

	int32 CurrentFloor = 0;

	int32 TargetFloor = 0;

	bool bMoving = false;
};
