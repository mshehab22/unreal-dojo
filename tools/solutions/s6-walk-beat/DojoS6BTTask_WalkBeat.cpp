#include "DojoS6BTTask_WalkBeat.h"

#include "AIController.h"
#include "BehaviorTree/BehaviorTreeComponent.h"
#include "DojoS6Guard.h"

/** Names the node and asks for TickTask. */
UDojoS6BTTask_WalkBeat::UDojoS6BTTask_WalkBeat()
{
	NodeName = TEXT("Walk Beat");
	INIT_TASK_NODE_NOTIFY_FLAGS();
}

/** Picks the guard's next beat point and starts walking. */
EBTNodeResult::Type UDojoS6BTTask_WalkBeat::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
	const ADojoS6Guard* Guard = FindGuard(OwnerComp);
	FVector Point;

	if (Guard == nullptr || !Guard->GetNextPoint(Point))
	{
		return EBTNodeResult::Failed;
	}

	FDojoS6WalkBeatMemory* Memory = CastInstanceNodeMemory<FDojoS6WalkBeatMemory>(NodeMemory);
	Memory->Destination = Point;
	return EBTNodeResult::InProgress;
}

/** How many bytes of memory each guard's run of this task needs. */
uint16 UDojoS6BTTask_WalkBeat::GetInstanceMemorySize() const
{
	return sizeof(FDojoS6WalkBeatMemory);
}

/** Builds the memory block when a guard starts the tree. */
void UDojoS6BTTask_WalkBeat::InitializeMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryInit::Type InitType) const
{
	InitializeNodeMemory<FDojoS6WalkBeatMemory>(NodeMemory, InitType);
}

/** Tears the memory block down when a guard's tree stops. */
void UDojoS6BTTask_WalkBeat::CleanupMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryClear::Type CleanupType) const
{
	CleanupNodeMemory<FDojoS6WalkBeatMemory>(NodeMemory, CleanupType);
}

/** Moves the guard one frame's walk closer and finishes the task on arrival. */
void UDojoS6BTTask_WalkBeat::TickTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds)
{
	ADojoS6Guard* Guard = FindGuard(OwnerComp);

	if (Guard == nullptr)
	{
		FinishLatentTask(OwnerComp, EBTNodeResult::Failed);
		return;
	}

	const FDojoS6WalkBeatMemory* Memory = CastInstanceNodeMemory<FDojoS6WalkBeatMemory>(NodeMemory);
	const FVector Here = Guard->GetActorLocation();
	const FVector ToGo = Memory->Destination - Here;
	const float Step = Guard->WalkSpeed * DeltaSeconds;

	if (ToGo.Size() <= FMath::Max(Step, AcceptanceRadius))
	{
		Guard->SetActorLocation(Memory->Destination);
		Guard->AdvancePoint();
		FinishLatentTask(OwnerComp, EBTNodeResult::Succeeded);
		return;
	}

	Guard->SetActorLocation(Here + ToGo.GetSafeNormal() * Step);
}

/** The guard pawn the tree is running for, or null. */
ADojoS6Guard* UDojoS6BTTask_WalkBeat::FindGuard(const UBehaviorTreeComponent& OwnerComp)
{
	const AAIController* Controller = OwnerComp.GetAIOwner();
	return Controller != nullptr ? Cast<ADojoS6Guard>(Controller->GetPawn()) : nullptr;
}
