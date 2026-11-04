#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8AlertLog.generated.h"

class ADojoM8AlertMeter;

/** A listener for tests and Blueprints: counts how often an alert meter announced a catch. */
UCLASS()
class ADojoM8AlertLog : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8AlertLog();

	/** Starts counting the meter's announcements, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Alert Log")
	void Listen(ADojoM8AlertMeter* Meter);

	/** How many times the meter announced a catch. */
	UFUNCTION(BlueprintPure, Category = "Alert Log")
	int32 GetCaughtCount() const;

private:
	/** Adds one to the count. */
	UFUNCTION()
	void HandleCaught();

	int32 CaughtCount = 0;
};
