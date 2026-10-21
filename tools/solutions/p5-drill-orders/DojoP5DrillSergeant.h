#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP5DrillSergeant.generated.h"

class ADojoP5DrillDummy;
class UTextRenderComponent;

/** The moves a drill order can ask for. */
UENUM(BlueprintType)
enum class EDojoP5DrillMove : uint8
{
	EDM_StepLeft UMETA(DisplayName = "Step Left"),
	EDM_StepRight UMETA(DisplayName = "Step Right"),
	EDM_Block UMETA(DisplayName = "Block")
};

/** One order: which move, and which dummy it is for. A plain value, so it can wait in a queue until its beat. */
USTRUCT(BlueprintType)
struct FDojoP5DrillOrder
{
	GENERATED_BODY()

	/** The dummy that will carry the order out; weak, because the dummy may be gone before the order's beat comes. */
	UPROPERTY()
	TWeakObjectPtr<ADojoP5DrillDummy> Dummy;

	/** What the dummy will do. */
	UPROPERTY()
	EDojoP5DrillMove Move = EDojoP5DrillMove::EDM_Block;

	/** Performs the move on the dummy. Returns false, doing nothing, when the dummy is gone. */
	bool CarryOut() const;
};

/** A drill sergeant that queues orders for any dummy and carries out one per beat (Command: each order is a value that waits, then runs). */
UCLASS()
class ADojoP5DrillSergeant : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP5DrillSergeant();

	/** Floating text that shows how many orders are waiting. */
	UPROPERTY(VisibleAnywhere, Category = "Drill")
	TObjectPtr<UTextRenderComponent> Label;

	/** The dummy the console routine is ordered for, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Drill")
	TObjectPtr<ADojoP5DrillDummy> FloorDummy;

	/** Seconds between beats during play. */
	UPROPERTY(EditAnywhere, Category = "Drill", meta = (ClampMin = "0.1"))
	float BeatSeconds = 0.75f;

	/** Queues one order for a dummy; it runs on a later beat. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void Order(ADojoP5DrillDummy* Dummy, EDojoP5DrillMove Move);

	/** Queues a short routine for the floor dummy: step left, block, step right, step right, block. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void QueueRoutine();

	/** One beat: drops orders whose dummy is gone and carries out the first order whose dummy is still there. */
	UFUNCTION(BlueprintCallable, Category = "Drill")
	void Beat();

	/** Orders still in the queue. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	int32 GetOrdersWaiting() const;

	/** Orders carried out so far. */
	UFUNCTION(BlueprintPure, Category = "Drill")
	int32 GetOrdersCarriedOut() const;

protected:
	/** Starts the beat timer. */
	virtual void BeginPlay() override;

private:
	/** Writes the waiting count into the label. */
	void RefreshLabel();

	/** Orders waiting for their beat, oldest first. */
	UPROPERTY()
	TArray<FDojoP5DrillOrder> Queue;

	int32 OrdersCarriedOut = 0;
	FTimerHandle BeatTimer;
};
