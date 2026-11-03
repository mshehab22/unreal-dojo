#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTTaskNode.h"
#include "DojoS6BTTask_Hold.generated.h"

/** A task that stands still and never finishes on its own; the branch above it ends only when a decorator aborts it. */
UCLASS()
class UDojoS6BTTask_Hold : public UBTTaskNode
{
	GENERATED_BODY()

public:
	/** Names the node for the Behavior Tree editor. */
	UDojoS6BTTask_Hold();

	/** Starts holding and stays in progress. */
	virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;
};
