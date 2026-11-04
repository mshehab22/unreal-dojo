#include "DojoS6BTService_ReadMemory.h"

#include "AIController.h"
#include "BehaviorTree/BehaviorTreeComponent.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"

/** Names the node, sets the interval, and asks for the activation and tick calls. */
UDojoS6BTService_ReadMemory::UDojoS6BTService_ReadMemory()
{
	NodeName = TEXT("Read Memory");
	Interval = 0.25f;
	RandomDeviation = 0.f;
	INIT_SERVICE_NODE_NOTIFY_FLAGS();
}

/** Copies the memory the moment the branch starts. */
void UDojoS6BTService_ReadMemory::OnBecomeRelevant(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
	Super::OnBecomeRelevant(OwnerComp, NodeMemory);
	CopyMemory(OwnerComp);
}

/** Copies the memory again on every interval. */
void UDojoS6BTService_ReadMemory::TickNode(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds)
{
	Super::TickNode(OwnerComp, NodeMemory, DeltaSeconds);
	CopyMemory(OwnerComp);
}

/** Writes the four guard keys from the memory component on the AI controller. */
void UDojoS6BTService_ReadMemory::CopyMemory(UBehaviorTreeComponent& OwnerComp) const
{
	const AAIController* Controller = OwnerComp.GetAIOwner();
	UBlackboardComponent* Blackboard = OwnerComp.GetBlackboardComponent();
	const UDojoS6SenseMemoryComponent* Memory = Controller != nullptr ? Controller->FindComponentByClass<UDojoS6SenseMemoryComponent>() : nullptr;

	if (Blackboard == nullptr || Memory == nullptr)
	{
		return;
	}

	const bool bFreshClue = Memory->HasClue() && Memory->GetClueAge() <= ClueSeconds;

	Blackboard->SetValueAsObject(FDojoS6TreeKit::TargetActorKey(), Memory->GetTarget());
	Blackboard->SetValueAsBool(FDojoS6TreeKit::TargetVisibleKey(), Memory->IsTargetVisible());
	Blackboard->SetValueAsVector(FDojoS6TreeKit::ClueLocationKey(), Memory->GetClueLocation());
	Blackboard->SetValueAsBool(FDojoS6TreeKit::HasClueKey(), bFreshClue);
}
