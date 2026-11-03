#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Plate.generated.h"

class UBoxComponent;
class UTextRenderComponent;

/** Announces a plate's new count after something steps on or off. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM3PlateCountChanged, int32, NewCount);

/** A plate that counts the things standing on it and is pressed while at least RequiredCount of them are there. */
UCLASS()
class ADojoM3Plate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the trigger zone as the root and the label above it. */
	ADojoM3Plate();

	/** The space above the plate; whatever overlaps it stands on the plate. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Plate")
	TObjectPtr<UBoxComponent> Zone;

	/** Floating text: the count, a slash, and RequiredCount. */
	UPROPERTY(VisibleAnywhere, Category = "Plate")
	TObjectPtr<UTextRenderComponent> Label;

	/** How many things must stand on the plate for it to be pressed. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Plate", meta = (ClampMin = "1"))
	int32 RequiredCount = 2;

	/** How many things stand on the plate now. */
	UFUNCTION(BlueprintPure, Category = "Plate")
	int32 GetCount() const;

	/** True while at least RequiredCount things stand on the plate. */
	UFUNCTION(BlueprintPure, Category = "Plate")
	bool IsPressed() const;

	/** Broadcast whenever the count changes, with the new count; the Vault Room boss adds it so a room can drive a gate. */
	UPROPERTY(BlueprintAssignable, Category = "Plate")
	FDojoM3PlateCountChanged OnCountChanged;

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

	/** Sets Count to the number of actors overlapping the zone now, refreshes the label, and announces a change. */
	void Recount();

	/** Writes the count and the required count. */
	void RefreshLabel();

	int32 Count = 0;
};
