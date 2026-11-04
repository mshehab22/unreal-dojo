#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8PowerLog.generated.h"

class ADojoM8Fuse;
class ADojoM8FuseBox;

/** A listener for tests and Blueprints: counts how often a fuse box announced that it was powered, and how many fuse pickups it heard and whether each fuse still stood when it was announced. */
UCLASS()
class ADojoM8PowerLog : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8PowerLog();

	/** Starts counting the box's announcements, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Power Log")
	void Listen(ADojoM8FuseBox* Box);

	/** Starts counting the pickup of one fuse, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Power Log")
	void ListenToFuse(ADojoM8Fuse* Fuse);

	/** How many times the box announced that it was powered. */
	UFUNCTION(BlueprintPure, Category = "Power Log")
	int32 GetPoweredCount() const;

	/** How many fuse pickups were heard. */
	UFUNCTION(BlueprintPure, Category = "Power Log")
	int32 GetPickupCount() const;

	/** How many pickups were announced after the fuse had already started leaving the world. */
	UFUNCTION(BlueprintPure, Category = "Power Log")
	int32 GetLateNotices() const;

private:
	/** Adds one to the powered count. */
	UFUNCTION()
	void HandlePowered();

	/** Counts a pickup, and a late one if the fuse is already leaving. */
	UFUNCTION()
	void HandleCollected(ADojoM8Fuse* Fuse, AActor* Collector);

	int32 PoweredCount = 0;

	int32 PickupCount = 0;

	int32 LateNotices = 0;
};
