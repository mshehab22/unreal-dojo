#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1Generator.generated.h"

class UTextRenderComponent;

/** Fired after the generator starts or stops; carries the new state. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoP1OnPowerChanged, bool, bRunning);

/** A generator the player switches on and off; it announces each change and knows no device (Observer: the subject). */
UCLASS()
class ADojoP1Generator : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1Generator();

	/** Floating text that shows RUNNING or STOPPED. */
	UPROPERTY(VisibleAnywhere, Category = "Power")
	TObjectPtr<UTextRenderComponent> Label;

	/** Fired after every change of state. Devices and Blueprints bind to it. */
	UPROPERTY(BlueprintAssignable, Category = "Power")
	FDojoP1OnPowerChanged OnPowerChanged;

	/** Starts or stops the generator and announces the change; does nothing if the state is unchanged. */
	UFUNCTION(BlueprintCallable, Category = "Power")
	void SetRunning(bool bNewRunning);

	/** Flips between running and stopped. */
	UFUNCTION(BlueprintCallable, Category = "Power")
	void Toggle();

	/** True while the generator runs. */
	UFUNCTION(BlueprintPure, Category = "Power")
	bool IsRunning() const;

protected:
	/** Shows the starting state on the label. */
	virtual void BeginPlay() override;

private:
	/** Writes RUNNING or STOPPED into the label. */
	void RefreshLabel();

	bool bRunning = false;
};
