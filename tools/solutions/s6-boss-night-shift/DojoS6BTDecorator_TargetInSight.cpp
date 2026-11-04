#include "DojoS6BTDecorator_TargetInSight.h"

#include "BehaviorTree/BehaviorTreeComponent.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"

/** Watches the TargetVisible key and aborts both lower branches and its own branch when it changes. */
UDojoS6BTDecorator_TargetInSight::UDojoS6BTDecorator_TargetInSight()
{
	NodeName = TEXT("Target In Sight");
	BlackboardKey.SelectedKeyName = FDojoS6TreeKit::TargetVisibleKey();
	BlackboardKey.AddBoolFilter(this, GET_MEMBER_NAME_CHECKED(UDojoS6BTDecorator_TargetInSight, BlackboardKey));
	FlowAbortMode = EBTFlowAbortMode::Both;
}

/** True while the TargetVisible key is set. */
bool UDojoS6BTDecorator_TargetInSight::CalculateRawConditionValue(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) const
{
	const UBlackboardComponent* Blackboard = OwnerComp.GetBlackboardComponent();
	return Blackboard != nullptr && Blackboard->GetValueAsBool(FDojoS6TreeKit::TargetVisibleKey());
}
