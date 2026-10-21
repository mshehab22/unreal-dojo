#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF2ClayDisc.generated.h"

class UTextRenderComponent;

/** How a clay disc's flight ended. */
UENUM(BlueprintType)
enum class EDojoF2DiscFate : uint8
{
	EDF_Flying UMETA(DisplayName = "Flying"),
	EDF_Shattered UMETA(DisplayName = "Shattered"),
	EDF_Fell UMETA(DisplayName = "Fell")
};

/** A clay disc that removes itself after its flight time, or at once when shattered. */
UCLASS()
class ADojoF2ClayDisc : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF2ClayDisc();

	/** Floating text that marks the disc. */
	UPROPERTY(VisibleAnywhere, Category = "Disc")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds the disc stays in play before it falls out of it. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Disc", meta = (ClampMin = "0.1"))
	float FlightSeconds = 3.f;

	/** Breaks the disc now and removes it from play. */
	UFUNCTION(BlueprintCallable, Category = "Disc")
	void Shatter();

	/** Flying while in play; Shattered or Fell once its play has ended. */
	UFUNCTION(BlueprintPure, Category = "Disc")
	EDojoF2DiscFate GetFate() const;

protected:
	/** Starts the flight clock. */
	virtual void BeginPlay() override;

	/** Records and logs how the flight ended. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	EDojoF2DiscFate Fate = EDojoF2DiscFate::EDF_Flying;

	bool bWasShattered = false;
};
