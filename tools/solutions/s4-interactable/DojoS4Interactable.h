#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "DojoS4Interactable.generated.h"

/** The reflected half of the interactable interface; it only exists so the engine can find the interface. */
UINTERFACE(Blueprintable)
class UDojoS4Interactable : public UInterface
{
	GENERATED_BODY()
};

/** Anything a player can walk up to and use; the interactor asks for the interface instead of casting to each class. */
class IDojoS4Interactable
{
	GENERATED_BODY()

public:
	/** The short verb phrase shown to the player, such as "Open door". */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact")
	FText GetPrompt() const;

	/** True when this interactor may use it right now; a thing that cannot be used is never offered. */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact")
	bool CanInteract(AActor* Interactor) const;

	/** Reacts to the interactor using it; returns true when something happened. */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact")
	bool Interact(AActor* Interactor);
};
