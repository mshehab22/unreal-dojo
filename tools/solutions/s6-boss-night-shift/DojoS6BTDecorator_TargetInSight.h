#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/Decorators/BTDecorator_BlackboardBase.h"
#include "DojoS6BTDecorator_TargetInSight.generated.h"

/** A decorator that lets its branch run only while the followed actor is in sight, and interrupts running branches the moment that changes. */
UCLASS()
class UDojoS6BTDecorator_TargetInSight : public UBTDecorator_BlackboardBase
{
	GENERATED_BODY()

public:
	/** Watches the TargetVisible key and aborts both lower branches and its own branch when it changes. */
	UDojoS6BTDecorator_TargetInSight();

protected:
	/** True while the TargetVisible key is set. */
	virtual bool CalculateRawConditionValue(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) const override;
};
