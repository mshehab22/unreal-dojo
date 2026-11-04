#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP15Gong.generated.h"

/** The dojo gong: each strike is counted and announced as "Gong!" through whichever announcer is provided. Service Locator pattern. */
UCLASS()
class ADojoP15Gong : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP15Gong();

	/** Strikes the gong once: counts the strike and announces "Gong!". */
	UFUNCTION(BlueprintCallable, Category = "Gong")
	void Strike();

	/** How many times the gong has been struck. */
	UFUNCTION(BlueprintPure, Category = "Gong")
	int32 GetStrikeCount() const;

private:
	/** Strikes so far. */
	int32 StrikeCount = 0;
};
