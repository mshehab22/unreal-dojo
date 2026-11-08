#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7KeyTally.generated.h"

class UDojoM7KeyRing;

/** Counts every key a ring announces and remembers the last one; the rings it listens to never know it is there. */
UCLASS()
class ADojoM7KeyTally : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM7KeyTally();

	/** Starts listening to a ring's new keys; listening twice to one ring still counts each key once. */
	UFUNCTION(BlueprintCallable, Category = "Tally")
	void Listen(UDojoM7KeyRing* Ring);

	/** How many key announcements the tally has heard. */
	UFUNCTION(BlueprintPure, Category = "Tally")
	int32 GetHeard() const;

	/** The key id named by the last announcement, or None. */
	UFUNCTION(BlueprintPure, Category = "Tally")
	FName GetLastKey() const;

private:
	/** Counts one announcement and remembers its key id. */
	UFUNCTION()
	void HandleKeyAdded(FName KeyId);

	int32 Heard = 0;

	FName LastKey;
};
