#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExLanternSwitch.generated.h"

class ADojoExLantern;

/** A switch that holds references to lanterns and lights or darkens them all at once. */
UCLASS()
class ADojoExLanternSwitch : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the switch only reacts to Toggle. */
	ADojoExLanternSwitch();

	UPROPERTY(EditAnywhere, Category = "Switch")
	TArray<TObjectPtr<ADojoExLantern>> Lanterns;

	/** Flips the switch and applies the new state to every lantern. */
	UFUNCTION(BlueprintCallable, CallInEditor, Category = "Switch")
	void Toggle();

	/** Whether the switch is currently on. */
	bool IsOn() const;

protected:
	/** Applies the starting state to every wired lantern. */
	virtual void BeginPlay() override;

private:
	/** Sets every wired lantern's light to match the switch. */
	void ApplyToAll();

	bool bIsOn = false;
};
