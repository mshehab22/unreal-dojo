#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Quests/s4-interactable/DojoS4Interactable.h"
#include "DojoS4Echo.generated.h"

class UBoxComponent;

/** A usable thing that always agrees to be used and writes down who asked and who used it, so tests can see what an interactor passes on. */
UCLASS()
class ADojoS4Echo : public AActor, public IDojoS4Interactable
{
	GENERATED_BODY()

public:
	/** Creates the box and turns ticking off. */
	ADojoS4Echo();

	/** The box an interactor's sphere overlaps. */
	UPROPERTY(VisibleAnywhere, Category = "Echo")
	TObjectPtr<UBoxComponent> Body;

	/** Whoever last asked whether it could be used, or null. */
	UFUNCTION(BlueprintPure, Category = "Echo")
	AActor* GetLastAsker() const;

	/** Whoever last used it, or null. */
	UFUNCTION(BlueprintPure, Category = "Echo")
	AActor* GetLastUser() const;

	/** How many times it has been used. */
	UFUNCTION(BlueprintPure, Category = "Echo")
	int32 GetUseCount() const;

	/** Always "Echo". */
	virtual FText GetPrompt_Implementation() const override;

	/** Writes down who asked and agrees. */
	virtual bool CanInteract_Implementation(AActor* Interactor) const override;

	/** Writes down who used it and counts the use. */
	virtual bool Interact_Implementation(AActor* Interactor) override;

private:
	mutable TWeakObjectPtr<AActor> LastAsker;
	TWeakObjectPtr<AActor> LastUser;
	int32 UseCount = 0;
};
