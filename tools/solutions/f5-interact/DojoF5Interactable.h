#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "DojoF5Interactable.generated.h"

/** The reflected half of the interactable interface; it only exists so the engine can find the interface. */
UINTERFACE(Blueprintable)
class UDojoF5Interactable : public UInterface
{
	GENERATED_BODY()
};

/** Anything a player can interact with; callers ask for the interface instead of casting to each class. */
class IDojoF5Interactable
{
	GENERATED_BODY()

public:
	/** Reacts to Interactor interacting; returns true when something happened. */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact")
	bool Interact(AActor* Interactor);
};
