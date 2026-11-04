#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTTaskNode.h"
#include "DojoS6BTTask_Chase.generated.h"

/** A task that runs the guard at the actor in the TargetActor key and reports a catch to the guard controller when it gets close enough. */
UCLASS()
class UDojoS6BTTask_Chase : public UBTTaskNode
{
	GENERATED_BODY()

public:
	/** Names the node and asks for TickTask. */
	UDojoS6BTTask_Chase();

	/** How fast the guard runs, in units per second. */
	UPROPERTY(EditAnywhere, Category = "Chase", meta = (ClampMin = "0"))
	float ChaseSpeed = 450.f;

	/** How close counts as a catch. */
	UPROPERTY(EditAnywhere, Category = "Chase", meta = (ClampMin = "1"))
	float CatchDistance = 100.f;

	/** Starts the chase; fails when there is no target or no pawn. */
	virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

protected:
	/** Runs one frame closer, reading the target again each frame, and reports the catch on arrival. */
	virtual void TickTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds) override;

private:
	/** The actor in the TargetActor key, or null. */
	static AActor* FindTarget(const UBehaviorTreeComponent& OwnerComp);
};
