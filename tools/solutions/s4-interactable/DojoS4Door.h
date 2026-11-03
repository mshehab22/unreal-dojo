#pragma once

#include "CoreMinimal.h"
#include "DojoS4Interactable.h"
#include "GameFramework/Actor.h"
#include "DojoS4Door.generated.h"

class UBoxComponent;
class UTextRenderComponent;

/** A door that opens and closes when used and can be locked; its box lets interactors find it by overlap. */
UCLASS()
class ADojoS4Door : public AActor, public IDojoS4Interactable
{
	GENERATED_BODY()

public:
	/** Creates the box and the label and turns ticking off. */
	ADojoS4Door();

	/** The box an interactor's sphere overlaps. */
	UPROPERTY(VisibleAnywhere, Category = "Door")
	TObjectPtr<UBoxComponent> Body;

	/** Floating text that shows SHUT, OPEN, or LOCKED. */
	UPROPERTY(VisibleAnywhere, Category = "Door")
	TObjectPtr<UTextRenderComponent> Label;

	/** True while the door is open. */
	UFUNCTION(BlueprintPure, Category = "Door")
	bool IsOpen() const;

	/** True while the door is locked. */
	UFUNCTION(BlueprintPure, Category = "Door")
	bool IsLocked() const;

	/** Shuts the door and locks it. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Lock();

	/** Unlocks the door; it stays shut until someone opens it. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Unlock();

	/** "Locked", "Close door", or "Open door". */
	virtual FText GetPrompt_Implementation() const override;

	/** A locked door cannot be used. */
	virtual bool CanInteract_Implementation(AActor* Interactor) const override;

	/** Opens a shut door and shuts an open one; false for a locked door. */
	virtual bool Interact_Implementation(AActor* Interactor) override;

private:
	/** Shows the door's state on the label. */
	void RefreshLabel();

	bool bOpen = false;
	bool bLocked = false;
};
