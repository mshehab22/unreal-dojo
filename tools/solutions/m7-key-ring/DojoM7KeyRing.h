#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoM7KeyRing.generated.h"

/** Broadcast when a ring gains a key id it did not hold. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM7OnKeyAdded, FName, KeyId);

/** The keys a visitor carries, each key id once; pickups add to it and doors read it, and the ring knows neither. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoM7KeyRing : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; a ring only answers questions. */
	UDojoM7KeyRing();

	/** Fires once for each key id the ring gains. */
	UPROPERTY(BlueprintAssignable, Category = "Keys")
	FDojoM7OnKeyAdded OnKeyAdded;

	/** Adds a key id and announces it; false for None or an id the ring already holds. */
	UFUNCTION(BlueprintCallable, Category = "Keys")
	bool AddKey(FName KeyId);

	/** True while the ring holds this key id. */
	UFUNCTION(BlueprintPure, Category = "Keys")
	bool HasKey(FName KeyId) const;

	/** Takes a key id off the ring; false if it was not there. */
	UFUNCTION(BlueprintCallable, Category = "Keys")
	bool RemoveKey(FName KeyId);

	/** Empties the ring. */
	UFUNCTION(BlueprintCallable, Category = "Keys")
	void ClearKeys();

	/** How many different key ids the ring holds. */
	UFUNCTION(BlueprintPure, Category = "Keys")
	int32 GetKeyCount() const;

private:
	/** The key ids held now, each once. */
	TSet<FName> Keys;
};
