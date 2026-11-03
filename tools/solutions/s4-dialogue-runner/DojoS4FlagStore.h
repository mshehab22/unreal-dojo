#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS4FlagStore.generated.h"

/** Broadcast when a flag becomes set; setting a flag that is already set announces nothing. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS4OnFlagSet, FName, Flag);

/** The story so far as a set of named flags that choices set and other choices, doors, and quests read. */
UCLASS()
class UDojoS4FlagStore : public UObject
{
	GENERATED_BODY()

public:
	/** Fires when a flag becomes set. */
	UPROPERTY(BlueprintAssignable, Category = "Flags")
	FDojoS4OnFlagSet OnFlagSet;

	/** Sets a flag; the none name is not a flag and is ignored. */
	UFUNCTION(BlueprintCallable, Category = "Flags")
	void Set(FName Flag);

	/** True when the flag is set. */
	UFUNCTION(BlueprintPure, Category = "Flags")
	bool Has(FName Flag) const;

	/** Clears every flag without announcing anything. */
	UFUNCTION(BlueprintCallable, Category = "Flags")
	void Reset();

private:
	UPROPERTY()
	TSet<FName> RaisedFlags;
};
