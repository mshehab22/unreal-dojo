#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Quests/f5-interact/DojoF5Interactable.h"
#include "DojoF5Lever.generated.h"

class UTextRenderComponent;

/** Broadcast after every pull, with the lever's new position. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoF5OnLeverPulled, bool, bIsOn);

/** A lever that flips on and off and announces each pull to whoever listens; this boss version can also be lit through the interactable interface. */
UCLASS()
class ADojoF5Lever : public AActor, public IDojoF5Interactable
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF5Lever();

	/** Floating text that shows ON or OFF. */
	UPROPERTY(VisibleAnywhere, Category = "Lever")
	TObjectPtr<UTextRenderComponent> Label;

	/** Fires after every pull; C++ binds with AddDynamic, Blueprint with an event. */
	UPROPERTY(BlueprintAssignable, Category = "Lever")
	FDojoF5OnLeverPulled OnPulled;

	/** Flips the lever and broadcasts its new position. */
	UFUNCTION(BlueprintCallable, Category = "Lever")
	void Pull();

	/** True while the lever is on. */
	UFUNCTION(BlueprintPure, Category = "Lever")
	bool IsOn() const;

	/** Boss addition: lights the lever if it is off and its own cooldown, if it has one, is ready; returns true when it lit. */
	virtual bool Interact_Implementation(AActor* Interactor) override;

protected:
	/** Shows the starting position. */
	virtual void BeginPlay() override;

private:
	/** Writes ON or OFF into the label. */
	void RefreshLabel();

	bool bIsOn = false;
};
