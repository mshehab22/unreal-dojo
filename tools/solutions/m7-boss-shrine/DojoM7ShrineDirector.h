#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7ShrineDirector.generated.h"

class ADojoM3Crate;
class ADojoM7KeyPickup;
class ADojoM7LockedDoor;
class ADojoM7PlateGate;
class UTextRenderComponent;

/** Broadcast when a visitor clears the shrine, with the number of rounds cleared so far. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM7OnRoundCleared, int32, Round);

/** Runs the shrine between visitors: an unlock of the door clears a round, and after a pause every piece goes back; the rules stay in the pieces. */
UCLASS()
class ADojoM7ShrineDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the board and turns ticking off. */
	ADojoM7ShrineDirector();

	/** The shrine board: rounds cleared, the gate, and whether a reset is coming. */
	UPROPERTY(VisibleAnywhere, Category = "Shrine")
	TObjectPtr<UTextRenderComponent> Board;

	/** The gate that guards the inner court; the board follows its events. */
	UPROPERTY(EditAnywhere, Category = "Shrine")
	TObjectPtr<ADojoM7PlateGate> Gate;

	/** The shrine key, put back after every round. */
	UPROPERTY(EditAnywhere, Category = "Shrine")
	TObjectPtr<ADojoM7KeyPickup> KeyPickup;

	/** The sanctum door; its unlock clears a round. */
	UPROPERTY(EditAnywhere, Category = "Shrine")
	TObjectPtr<ADojoM7LockedDoor> Door;

	/** The crates sent home after every round. */
	UPROPERTY(EditAnywhere, Category = "Shrine")
	TArray<TObjectPtr<ADojoM3Crate>> Crates;

	/** Seconds between a cleared round and the reset. */
	UPROPERTY(EditAnywhere, Category = "Shrine", meta = (ClampMin = "0", Units = "s"))
	float ResetSeconds = 2.f;

	/** Fires once for every round cleared. */
	UPROPERTY(BlueprintAssignable, Category = "Shrine")
	FDojoM7OnRoundCleared OnRoundCleared;

	/** How many times the door has been unlocked since play began. */
	UFUNCTION(BlueprintPure, Category = "Shrine")
	int32 GetRoundsCleared() const;

	/** True from a cleared round until the pieces are put back. */
	UFUNCTION(BlueprintPure, Category = "Shrine")
	bool IsResetting() const;

protected:
	/** Listens to the door and the gate and writes the first board. */
	virtual void BeginPlay() override;

	/** Stops listening and cancels a pending reset. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** The door opened: count the round, remember the visitor, and start the reset clock. */
	UFUNCTION()
	void HandleDoorUnlocked(ADojoM7LockedDoor* UnlockedDoor, AActor* Visitor);

	/** The gate reached fully open. */
	UFUNCTION()
	void HandleGateOpened();

	/** The gate got back to fully closed. */
	UFUNCTION()
	void HandleGateClosed();

	/** Sends the crates home, puts the key back, relocks the door, and takes the key off the last visitor's ring. */
	void ResetShrine();

	/** Rewrites the board. */
	void RefreshBoard();

	UPROPERTY(Transient)
	TObjectPtr<AActor> LastVisitor;

	FTimerHandle ResetTimer;

	int32 RoundsCleared = 0;

	bool bResetting = false;

	bool bGateOpen = false;
};
