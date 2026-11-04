#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8SightLog.generated.h"

class ADojoM8Searchlight;

/** A listener for tests and Blueprints: counts how often a searchlight started and stopped seeing its target. */
UCLASS()
class ADojoM8SightLog : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8SightLog();

	/** Starts counting the light's sight changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Sight Log")
	void Listen(ADojoM8Searchlight* Light);

	/** How many times the light started to see its target. */
	UFUNCTION(BlueprintPure, Category = "Sight Log")
	int32 GetSeenCount() const;

	/** How many times the light stopped seeing its target. */
	UFUNCTION(BlueprintPure, Category = "Sight Log")
	int32 GetLostCount() const;

private:
	/** Adds one to the seen or the lost count. */
	UFUNCTION()
	void HandleSightChanged(ADojoM8Searchlight* Light, bool bSeen);

	int32 SeenCount = 0;

	int32 LostCount = 0;
};
