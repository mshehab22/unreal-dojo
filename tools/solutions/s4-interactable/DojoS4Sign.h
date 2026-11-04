#pragma once

#include "CoreMinimal.h"
#include "DojoS4Interactable.h"
#include "GameFramework/Actor.h"
#include "DojoS4Sign.generated.h"

class UBoxComponent;

/** A sign that can be read any number of times; a second kind of interactable that shares nothing with the door but the interface. */
UCLASS()
class ADojoS4Sign : public AActor, public IDojoS4Interactable
{
	GENERATED_BODY()

public:
	/** Creates the box and turns ticking off. */
	ADojoS4Sign();

	/** The box an interactor's sphere overlaps. */
	UPROPERTY(VisibleAnywhere, Category = "Sign")
	TObjectPtr<UBoxComponent> Body;

	/** How many times the sign has been read. */
	UFUNCTION(BlueprintPure, Category = "Sign")
	int32 GetReadCount() const;

	/** Always "Read sign". */
	virtual FText GetPrompt_Implementation() const override;

	/** A sign can always be read. */
	virtual bool CanInteract_Implementation(AActor* Interactor) const override;

	/** Counts one reading and returns true. */
	virtual bool Interact_Implementation(AActor* Interactor) override;

private:
	int32 ReadCount = 0;
};
