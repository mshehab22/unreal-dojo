#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF5LeverLamp.generated.h"

class ADojoF5Lever;
class UTextRenderComponent;

/** A lamp that follows a lever by listening to its pull event: it knows the lever, the lever never knows the lamp. */
UCLASS()
class ADojoF5LeverLamp : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF5LeverLamp();

	/** Floating text that shows LIT or DARK. */
	UPROPERTY(VisibleAnywhere, Category = "Lamp")
	TObjectPtr<UTextRenderComponent> Label;

	/** The lever this lamp listens to, picked in the Details panel. */
	UPROPERTY(EditAnywhere, Category = "Lamp")
	TObjectPtr<ADojoF5Lever> Lever;

	/** True while the lamp is lit. */
	UFUNCTION(BlueprintPure, Category = "Lamp")
	bool IsLit() const;

protected:
	/** Starts listening to the lever. */
	virtual void BeginPlay() override;

	/** Stops listening, so the lever never calls a lamp that has left play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Lights or darkens the lamp to match the lever. */
	UFUNCTION()
	void HandlePulled(bool bIsOn);

	bool bLit = false;
};
