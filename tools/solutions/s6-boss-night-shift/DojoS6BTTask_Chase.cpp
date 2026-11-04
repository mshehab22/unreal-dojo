#include "DojoS6BTTask_Chase.h"

#include "BehaviorTree/BehaviorTreeComponent.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "DojoS6GuardController.h"
#include "GameFramework/Pawn.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"

/** Names the node and asks for TickTask. */
UDojoS6BTTask_Chase::UDojoS6BTTask_Chase()
{
	NodeName = TEXT("Chase");
	INIT_TASK_NODE_NOTIFY_FLAGS();
}

/** Starts the chase; fails when there is no target or no pawn. */
EBTNodeResult::Type UDojoS6BTTask_Chase::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
	const AAIController* Controller = OwnerComp.GetAIOwner();

	if (Controller == nullptr || Controller->GetPawn() == nullptr || FindTarget(OwnerComp) == nullptr)
	{
		return EBTNodeResult::Failed;
	}

	return EBTNodeResult::InProgress;
}

/** Runs one frame closer, reading the target again each frame, and reports the catch on arrival. */
void UDojoS6BTTask_Chase::TickTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds)
{
	ADojoS6GuardController* Controller = Cast<ADojoS6GuardController>(OwnerComp.GetAIOwner());
	APawn* Guard = Controller != nullptr ? Controller->GetPawn() : nullptr;
	AActor* Target = FindTarget(OwnerComp);

	if (Guard == nullptr || Target == nullptr)
	{
		FinishLatentTask(OwnerComp, EBTNodeResult::Failed);
		return;
	}

	const FVector Here = Guard->GetActorLocation();
	const FVector ToGo = Target->GetActorLocation() - Here;

	if (ToGo.Size() <= CatchDistance)
	{
		FinishLatentTask(OwnerComp, EBTNodeResult::Succeeded);
		Controller->ReportCatch(Target);
		return;
	}

	const float Step = FMath::Min(ChaseSpeed * DeltaSeconds, static_cast<float>(ToGo.Size()));
	Guard->SetActorLocation(Here + ToGo.GetSafeNormal() * Step);
}

/** The actor in the TargetActor key, or null. */
AActor* UDojoS6BTTask_Chase::FindTarget(const UBehaviorTreeComponent& OwnerComp)
{
	const UBlackboardComponent* Blackboard = OwnerComp.GetBlackboardComponent();
	return Blackboard != nullptr ? Cast<AActor>(Blackboard->GetValueAsObject(FDojoS6TreeKit::TargetActorKey())) : nullptr;
}
