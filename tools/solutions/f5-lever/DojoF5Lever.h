#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF5Lever.generated.h"

class UTextRenderComponent;

/** Broadcast after every pull, with the lever's new position. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoF5OnLeverPulled, bool, bIsOn);

/** A lever that flips on and off and announces each pull to whoever listens; it never knows who that is. */
UCLASS()
class ADojoF5Lever : public AActor
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

protected:
	/** Shows the starting position. */
	virtual void BeginPlay() override;

private:
	/** Writes ON or OFF into the label. */
	void RefreshLabel();

	bool bIsOn = false;
};
