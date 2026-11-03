#pragma once

#include "CoreMinimal.h"
#include "Components/SphereComponent.h"
#include "DojoS4Interactor.generated.h"

/** Broadcast when the thing the interactor would use changes, or its prompt does; Focus is null when nothing can be used. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS4OnFocusChanged, AActor*, Focus, FText, Prompt);

/** A sphere on the hero that finds the interactables around it by overlap, picks the nearest one that can be used, and announces it; it never polls. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS4Interactor : public USphereComponent
{
	GENERATED_BODY()

public:
	/** Sets the reach, the overlap profile, and turns ticking off. */
	UDojoS4Interactor();

	/** Fires when the focus or its prompt changes. */
	UPROPERTY(BlueprintAssignable, Category = "Interactor")
	FDojoS4OnFocusChanged OnFocusChanged;

	/** The interactable that Interact would use now, or null. */
	UFUNCTION(BlueprintPure, Category = "Interactor")
	AActor* GetFocus() const;

	/** The focus's prompt, or empty text. */
	UFUNCTION(BlueprintPure, Category = "Interactor")
	FText GetFocusPrompt() const;

	/** Works the focus out again; call it after something nearby changes whether it can be used. */
	UFUNCTION(BlueprintCallable, Category = "Interactor")
	void Refresh();

	/** Uses the focus on behalf of the owner; false when there is no focus. */
	UFUNCTION(BlueprintCallable, Category = "Interactor")
	bool TryInteract();

protected:
	/** Starts listening to the sphere's own overlaps. */
	virtual void BeginPlay() override;

	/** Stops listening. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Something entered the sphere. */
	UFUNCTION()
	void HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Something left the sphere. */
	UFUNCTION()
	void HandleEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex);

	/** The interactables inside the sphere, in the order they arrived. */
	UPROPERTY()
	TArray<TObjectPtr<AActor>> Nearby;

	UPROPERTY()
	TObjectPtr<AActor> CurrentFocus;

	FText CurrentPrompt;
};
