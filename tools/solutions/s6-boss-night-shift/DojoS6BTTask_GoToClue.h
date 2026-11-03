#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTTaskNode.h"
#include "DojoS6BTTask_GoToClue.generated.h"

/** What one guard's search needs between frames: where it is going, whether it got there, and how long it still looks around. */
struct FDojoS6GoToClueMemory
{
	/** The clue this search walks to. */
	FVector Destination = FVector::ZeroVector;

	/** True once the guard stands on the clue. */
	bool bArrived = false;

	/** Seconds of looking around still to go after arriving. */
	float LookLeft = 0.f;
};

/** A task that walks the guard to the clue in the blackboard, looks around for a moment, and then forgets the clue so the guard goes back to its beat. */
UCLASS()
class UDojoS6BTTask_GoToClue : public UBTTaskNode
{
	GENERATED_BODY()

public:
	/** Names the node and asks for TickTask. */
	UDojoS6BTTask_GoToClue();

	/** How fast the guard walks to the clue, in units per second. */
	UPROPERTY(EditAnywhere, Category = "Search", meta = (ClampMin = "0"))
	float SearchSpeed = 300.f;

	/** How long the guard looks around at the clue, in seconds. */
	UPROPERTY(EditAnywhere, Category = "Search", meta = (ClampMin = "0"))
	float LookSeconds = 2.f;

	/** Reads the clue and starts walking; fails when there is no pawn. */
	virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

	/** How many bytes of memory each guard's search needs. */
	virtual uint16 GetInstanceMemorySize() const override;

	/** Builds the memory block when a guard starts the tree. */
	virtual void InitializeMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryInit::Type InitType) const override;

	/** Tears the memory block down when a guard's tree stops. */
	virtual void CleanupMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryClear::Type CleanupType) const override;

protected:
	/** Walks one frame closer, or looks around, and forgets the clue when the looking is done. */
	virtual void TickTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds) override;
};
