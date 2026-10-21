#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF4Carrier.generated.h"

class USceneComponent;

/** Carries one actor at a time on a mount point above itself, so the cargo moves wherever the carrier goes. */
UCLASS()
class ADojoF4Carrier : public AActor
{
	GENERATED_BODY()

public:
	/** Builds the root and the mount 150 units above it, and turns ticking off. */
	ADojoF4Carrier();

	/** Where cargo rides, relative to the carrier. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Carrier")
	TObjectPtr<USceneComponent> Mount;

	/** Attaches Cargo to the mount, snapped to it; refuses when already carrying, when Cargo is invalid, or when it is the carrier itself. */
	UFUNCTION(BlueprintCallable, Category = "Carrier")
	bool Carry(AActor* NewCargo);

	/** Detaches the cargo where it is now and returns it; nullptr when carrying nothing. */
	UFUNCTION(BlueprintCallable, Category = "Carrier")
	AActor* Drop();

	/** True while an actor rides on the mount. */
	UFUNCTION(BlueprintPure, Category = "Carrier")
	bool IsCarrying() const;

	/** The actor on the mount, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Carrier")
	AActor* GetCargo() const;

private:
	UPROPERTY(VisibleInstanceOnly, Category = "Carrier")
	TObjectPtr<AActor> Cargo;
};
