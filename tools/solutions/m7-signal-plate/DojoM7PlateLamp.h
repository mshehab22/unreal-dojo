#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7PlateLamp.generated.h"

class ADojoM7SignalPlate;
class UTextRenderComponent;

/** A lamp that lights while its plate is pressed and counts the presses and releases it heard; it only subscribes, and the plate never knows it exists. */
UCLASS()
class ADojoM7PlateLamp : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label as the root and turns ticking off. */
	ADojoM7PlateLamp();

	/** Floating text that reads LIT or DARK. */
	UPROPERTY(VisibleAnywhere, Category = "Plate Lamp")
	TObjectPtr<UTextRenderComponent> Label;

	/** The plate this lamp follows; set it in Details. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Plate Lamp")
	TObjectPtr<ADojoM7SignalPlate> Plate;

	/** True between a press and the next release. */
	UFUNCTION(BlueprintPure, Category = "Plate Lamp")
	bool IsLit() const;

	/** How many presses the lamp has heard. */
	UFUNCTION(BlueprintPure, Category = "Plate Lamp")
	int32 GetPresses() const;

	/** How many releases the lamp has heard. */
	UFUNCTION(BlueprintPure, Category = "Plate Lamp")
	int32 GetReleases() const;

protected:
	/** Starts in the plate's current state, subscribes to its events, and writes the first label. */
	virtual void BeginPlay() override;

private:
	/** Lights the lamp and counts the press. */
	UFUNCTION()
	void HandlePlatePressed(ADojoM7SignalPlate* ChangedPlate);

	/** Darkens the lamp and counts the release. */
	UFUNCTION()
	void HandlePlateReleased(ADojoM7SignalPlate* ChangedPlate);

	/** Writes LIT or DARK. */
	void RefreshLabel();

	bool bLit = false;

	int32 Presses = 0;

	int32 Releases = 0;
};
