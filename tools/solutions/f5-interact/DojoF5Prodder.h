#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF5Prodder.generated.h"

/** Interacts with any actor that implements the interactable interface, without knowing its class. */
UCLASS()
class ADojoF5Prodder : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoF5Prodder();

	/** Interacts with Target through the interface; false when Target is invalid, does not implement it, or nothing happened. */
	UFUNCTION(BlueprintCallable, Category = "Prodder")
	bool Prod(AActor* Target);

	/** How many prods reached an interactable actor, whatever it answered. */
	UFUNCTION(BlueprintPure, Category = "Prodder")
	int32 GetReachedCount() const;

private:
	int32 ReachedCount = 0;
};
