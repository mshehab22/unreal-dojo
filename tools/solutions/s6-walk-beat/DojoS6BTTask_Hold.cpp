#include "DojoS6BTTask_Hold.h"

/** Names the node for the Behavior Tree editor. */
UDojoS6BTTask_Hold::UDojoS6BTTask_Hold()
{
	NodeName = TEXT("Hold");
}

/** Starts holding and stays in progress. */
EBTNodeResult::Type UDojoS6BTTask_Hold::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
	return EBTNodeResult::InProgress;
}
