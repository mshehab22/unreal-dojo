#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7KeyPickup.generated.h"

class USphereComponent;
class UTextRenderComponent;

/** A key waiting in the level: the first visitor whose key ring accepts its key id takes it, and it disappears until reset. */
UCLASS()
class ADojoM7KeyPickup : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the touch zone as the root and the label above it. */
	ADojoM7KeyPickup();

	/** The touch zone, 60 cm in radius; it overlaps everything and blocks nothing. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Key")
	TObjectPtr<USphereComponent> Zone;

	/** Floating text showing the key id. */
	UPROPERTY(VisibleAnywhere, Category = "Key")
	TObjectPtr<UTextRenderComponent> Label;

	/** The key id this pickup gives. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Key")
	FName KeyId = TEXT("ShrineKey");

	/** True from the moment a visitor takes the key until ResetPickup. */
	UFUNCTION(BlueprintPure, Category = "Key")
	bool IsTaken() const;

	/** Shows the pickup again and turns its zone back on, so the next visitor can take it. */
	UFUNCTION(BlueprintCallable, Category = "Key")
	void ResetPickup();

protected:
	/** Starts listening to the zone and shows the key id. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	bool bTaken = false;
};
