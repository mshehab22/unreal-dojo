#include "DojoS6BTDecorator_NearClue.h"

#include "AIController.h"
#include "BehaviorTree/BehaviorTreeComponent.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "GameFramework/Pawn.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"

/** Watches the HasClue key and aborts both lower branches and its own branch when the answer changes. */
UDojoS6BTDecorator_NearClue::UDojoS6BTDecorator_NearClue()
{
	NodeName = TEXT("Near Clue");
	BlackboardKey.SelectedKeyName = FDojoS6TreeKit::HasClueKey();
	BlackboardKey.AddBoolFilter(this, GET_MEMBER_NAME_CHECKED(UDojoS6BTDecorator_NearClue, BlackboardKey));
	FlowAbortMode = EBTFlowAbortMode::Both;
}

/** True when HasClue is set and the clue lies within MaxDistance of the guard's pawn. */
bool UDojoS6BTDecorator_NearClue::CalculateRawConditionValue(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) const
{
	const UBlackboardComponent* Blackboard = OwnerComp.GetBlackboardComponent();
	const AAIController* Controller = OwnerComp.GetAIOwner();
	const APawn* Pawn = Controller != nullptr ? Controller->GetPawn() : nullptr;

	if (Blackboard == nullptr || Pawn == nullptr)
	{
		return false;
	}

	if (!Blackboard->GetValueAsBool(FDojoS6TreeKit::HasClueKey()))
	{
		return false;
	}

	const FVector Clue = Blackboard->GetValueAsVector(FDojoS6TreeKit::ClueLocationKey());
	return FVector::Dist(Pawn->GetActorLocation(), Clue) <= MaxDistance;
}
