#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoF4HitCounterComponent.generated.h"

/** Counts hits on whatever actor it is added to and reports when that actor is down. Component pattern: the behavior lives here, not in the owner's class. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoF4HitCounterComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the counter only changes when hit. */
	UDojoF4HitCounterComponent();

	/** Hits that put the owner down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Hits", meta = (ClampMin = "1"))
	int32 HitsToDown = 3;

	/** Counts one hit, unless the owner is already down. */
	UFUNCTION(BlueprintCallable, Category = "Hits")
	void RegisterHit();

	/** Clears the hits so the owner stands again. */
	UFUNCTION(BlueprintCallable, Category = "Hits")
	void ResetHits();

	/** Hits counted so far. */
	UFUNCTION(BlueprintPure, Category = "Hits")
	int32 GetHits() const;

	/** True once HitsToDown hits have been counted. */
	UFUNCTION(BlueprintPure, Category = "Hits")
	bool IsDown() const;

private:
	int32 Hits = 0;
};
