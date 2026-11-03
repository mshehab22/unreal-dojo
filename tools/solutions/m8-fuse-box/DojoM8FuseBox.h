#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8FuseBox.generated.h"

class ADojoM8Fuse;

/** Broadcast once, when the box has received every fuse it needs. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoM8OnPowered);

/** Counts the fuses it is told to watch and announces once when there are enough; the fuses know nothing about the box. */
UCLASS()
class ADojoM8FuseBox : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8FuseBox();

	/** How many fuses power the box. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fuse Box", meta = (ClampMin = "1"))
	int32 RequiredFuses = 3;

	/** Fires once, when the count first reaches RequiredFuses. */
	UPROPERTY(BlueprintAssignable, Category = "Fuse Box")
	FDojoM8OnPowered OnPowered;

	/** Starts listening to the fuse, binding only once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Fuse Box")
	void Watch(ADojoM8Fuse* Fuse);

	/** Forgets every fuse counted and unpowers the box, ready for another round. */
	UFUNCTION(BlueprintCallable, Category = "Fuse Box")
	void Reset();

	/** How many fuses have been collected since the last reset. */
	UFUNCTION(BlueprintPure, Category = "Fuse Box")
	int32 GetCollected() const;

	/** True once enough fuses have been collected. */
	UFUNCTION(BlueprintPure, Category = "Fuse Box")
	bool IsPowered() const;

private:
	/** Counts one more fuse and powers the box when there are enough. */
	UFUNCTION()
	void HandleCollected(ADojoM8Fuse* Fuse, AActor* Collector);

	int32 Collected = 0;

	bool bPowered = false;
};
