#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP15Crier.generated.h"

/** A crier that stands in the dojo and calls lines out through whichever announcer is provided at that moment. Service Locator pattern. */
UCLASS()
class ADojoP15Crier : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP15Crier();

	/** Announces Line through the announcer the desk of this world holds; with no desk in the world, the line is dropped. */
	UFUNCTION(BlueprintCallable, Category = "Crier")
	void CallOut(const FString& Line);

protected:
	/** Runs when the crier enters play. */
	virtual void BeginPlay() override;
};
