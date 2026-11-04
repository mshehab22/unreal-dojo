#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTTaskNode.h"
#include "DojoS6BTTask_WalkBeat.generated.h"

class ADojoS6Guard;

/** What one guard's run of the task needs to remember between frames; the tree keeps one of these per guard. */
struct FDojoS6WalkBeatMemory
{
	/** The beat point this run walks to. */
	FVector Destination = FVector::ZeroVector;
};

/** A Behavior Tree task that walks the guard to the next point of its beat over several frames and succeeds on arrival; one node object serves every guard that runs the tree. */
UCLASS()
class UDojoS6BTTask_WalkBeat : public UBTTaskNode
{
	GENERATED_BODY()

public:
	/** Names the node and asks for TickTask. */
	UDojoS6BTTask_WalkBeat();

	/** How close to a point counts as arriving. */
	UPROPERTY(EditAnywhere, Category = "Walk", meta = (ClampMin = "1"))
	float AcceptanceRadius = 10.f;

	/** Picks the guard's next beat point and starts walking; fails when there is no guard or no beat. */
	virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

	/** How many bytes of memory each guard's run of this task needs. */
	virtual uint16 GetInstanceMemorySize() const override;

	/** Builds the memory block when a guard starts the tree. */
	virtual void InitializeMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryInit::Type InitType) const override;

	/** Tears the memory block down when a guard's tree stops. */
	virtual void CleanupMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryClear::Type CleanupType) const override;

protected:
	/** Moves the guard one frame's walk closer and finishes the task on arrival. */
	virtual void TickTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds) override;

private:
	/** The guard pawn the tree is running for, or null. */
	static ADojoS6Guard* FindGuard(const UBehaviorTreeComponent& OwnerComp);
};
