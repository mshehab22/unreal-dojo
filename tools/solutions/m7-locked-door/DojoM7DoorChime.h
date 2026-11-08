#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7DoorChime.generated.h"

class ADojoM7LockedDoor;

/** Rings once for every unlock it hears and remembers the last door and visitor; the doors it listens to never know it is there. */
UCLASS()
class ADojoM7DoorChime : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM7DoorChime();

	/** Starts listening to a door's unlocks; listening twice to one door still rings once per unlock. */
	UFUNCTION(BlueprintCallable, Category = "Chime")
	void Listen(ADojoM7LockedDoor* Door);

	/** How many unlocks the chime has heard. */
	UFUNCTION(BlueprintPure, Category = "Chime")
	int32 GetRings() const;

	/** The door named by the last unlock, or null. */
	UFUNCTION(BlueprintPure, Category = "Chime")
	ADojoM7LockedDoor* GetLastDoor() const;

	/** The visitor named by the last unlock, or null. */
	UFUNCTION(BlueprintPure, Category = "Chime")
	AActor* GetLastVisitor() const;

private:
	/** Rings and remembers who opened which door. */
	UFUNCTION()
	void HandleUnlocked(ADojoM7LockedDoor* Door, AActor* Visitor);

	UPROPERTY()
	TObjectPtr<ADojoM7LockedDoor> LastDoor;

	UPROPERTY()
	TObjectPtr<AActor> LastVisitor;

	int32 Rings = 0;
};
