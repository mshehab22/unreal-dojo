#include "DojoS6BTTask_GoToClue.h"

#include "BehaviorTree/BehaviorTreeComponent.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "DojoS6GuardController.h"
#include "GameFramework/Pawn.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"

/** Names the node and asks for TickTask. */
UDojoS6BTTask_GoToClue::UDojoS6BTTask_GoToClue()
{
	NodeName = TEXT("Go To Clue");
	INIT_TASK_NODE_NOTIFY_FLAGS();
}

/** Reads the clue and starts walking. */
EBTNodeResult::Type UDojoS6BTTask_GoToClue::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
	const AAIController* Controller = OwnerComp.GetAIOwner();
	const UBlackboardComponent* Blackboard = OwnerComp.GetBlackboardComponent();

	if (Controller == nullptr || Controller->GetPawn() == nullptr || Blackboard == nullptr)
	{
		return EBTNodeResult::Failed;
	}

	FDojoS6GoToClueMemory* Memory = CastInstanceNodeMemory<FDojoS6GoToClueMemory>(NodeMemory);
	Memory->Destination = Blackboard->GetValueAsVector(FDojoS6TreeKit::ClueLocationKey());
	Memory->bArrived = false;
	Memory->LookLeft = LookSeconds;
	return EBTNodeResult::InProgress;
}

/** How many bytes of memory each guard's search needs. */
uint16 UDojoS6BTTask_GoToClue::GetInstanceMemorySize() const
{
	return sizeof(FDojoS6GoToClueMemory);
}

/** Builds the memory block when a guard starts the tree. */
void UDojoS6BTTask_GoToClue::InitializeMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryInit::Type InitType) const
{
	InitializeNodeMemory<FDojoS6GoToClueMemory>(NodeMemory, InitType);
}

/** Tears the memory block down when a guard's tree stops. */
void UDojoS6BTTask_GoToClue::CleanupMemory(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, EBTMemoryClear::Type CleanupType) const
{
	CleanupNodeMemory<FDojoS6GoToClueMemory>(NodeMemory, CleanupType);
}

/** Walks one frame closer, or looks around, and has the controller forget the clue when the looking is done. */
void UDojoS6BTTask_GoToClue::TickTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds)
{
	AAIController* Controller = OwnerComp.GetAIOwner();
	APawn* Guard = Controller != nullptr ? Controller->GetPawn() : nullptr;

	if (Guard == nullptr)
	{
		FinishLatentTask(OwnerComp, EBTNodeResult::Failed);
		return;
	}

	FDojoS6GoToClueMemory* Memory = CastInstanceNodeMemory<FDojoS6GoToClueMemory>(NodeMemory);

	if (!Memory->bArrived)
	{
		const FVector Here = Guard->GetActorLocation();
		const FVector ToGo = Memory->Destination - Here;
		const float Step = SearchSpeed * DeltaSeconds;

		if (ToGo.Size() <= Step)
		{
			Guard->SetActorLocation(Memory->Destination);
			Memory->bArrived = true;
		}
		else
		{
			Guard->SetActorLocation(Here + ToGo.GetSafeNormal() * Step);
		}

		return;
	}

	Memory->LookLeft -= DeltaSeconds;

	if (Memory->LookLeft > 0.f)
	{
		return;
	}

	if (ADojoS6GuardController* GuardController = Cast<ADojoS6GuardController>(Controller))
	{
		GuardController->ForgetClue();
	}

	FinishLatentTask(OwnerComp, EBTNodeResult::Succeeded);
}
