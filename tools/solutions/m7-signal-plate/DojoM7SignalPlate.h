#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7SignalPlate.generated.h"

class ADojoM7SignalPlate;
class UBoxComponent;
class UTextRenderComponent;

/** Broadcast when a plate changes between empty and occupied, with the plate that changed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM7OnPlateChanged, ADojoM7SignalPlate*, Plate);

/** A pressure plate that counts the things standing on it and announces only the changes between empty and occupied; it knows nothing about who listens. */
UCLASS()
class ADojoM7SignalPlate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the trigger zone as the root and the label above it. */
	ADojoM7SignalPlate();

	/** The space above the plate; whatever overlaps it stands on the plate. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Signal Plate")
	TObjectPtr<UBoxComponent> Zone;

	/** Floating text that shows how many things stand on the plate. */
	UPROPERTY(VisibleAnywhere, Category = "Signal Plate")
	TObjectPtr<UTextRenderComponent> Label;

	/** Fires when the first thing arrives on an empty plate. */
	UPROPERTY(BlueprintAssignable, Category = "Signal Plate")
	FDojoM7OnPlateChanged OnPlatePressed;

	/** Fires when the last thing leaves the plate. */
	UPROPERTY(BlueprintAssignable, Category = "Signal Plate")
	FDojoM7OnPlateChanged OnPlateReleased;

	/** True while at least one thing stands on the plate. */
	UFUNCTION(BlueprintPure, Category = "Signal Plate")
	bool IsPressed() const;

	/** How many things stand on the plate now. */
	UFUNCTION(BlueprintPure, Category = "Signal Plate")
	int32 GetCount() const;

protected:
	/** Starts listening to the zone and writes the first label. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Runs when a shape stops overlapping the zone. */
	UFUNCTION()
	void HandleZoneEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex);

	/** Brings Count up to date, refreshes the label, and announces a change between empty and occupied. */
	void Recount();

	/** How many actors other than the plate overlap the zone now, each counted once. */
	int32 CountThingsOnZone();

	/** How many things stood on the plate at the last recount. */
	int32 Count = 0;
};
