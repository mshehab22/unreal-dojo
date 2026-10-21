#pragma once

#include "CoreMinimal.h"
#include "DojoF5Interactable.h"
#include "GameFramework/Actor.h"
#include "DojoF5Crate.generated.h"

class UTextRenderComponent;

/** A crate that opens the first time anyone interacts with it. */
UCLASS()
class ADojoF5Crate : public AActor, public IDojoF5Interactable
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF5Crate();

	/** Floating text that shows SHUT or OPEN. */
	UPROPERTY(VisibleAnywhere, Category = "Crate")
	TObjectPtr<UTextRenderComponent> Label;

	/** True once opened. */
	UFUNCTION(BlueprintPure, Category = "Crate")
	bool IsOpen() const;

	/** Opens the crate and returns true; returns false once it is already open. */
	virtual bool Interact_Implementation(AActor* Instigator) override;

private:
	bool bOpen = false;
};
