#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/Decorators/BTDecorator_BlackboardBase.h"
#include "DojoS6BTDecorator_NearClue.generated.h"

/** A Behavior Tree decorator that lets its branch run only while there is a fresh clue close enough to the guard, and that interrupts a running branch the moment its answer changes. */
UCLASS()
class UDojoS6BTDecorator_NearClue : public UBTDecorator_BlackboardBase
{
	GENERATED_BODY()

public:
	/** Watches the HasClue key and aborts both lower branches and its own branch when the answer changes. */
	UDojoS6BTDecorator_NearClue();

	/** How far from the guard a clue may be and still be worth checking. */
	UPROPERTY(EditAnywhere, Category = "Clue", meta = (ClampMin = "0"))
	float MaxDistance = 1500.f;

protected:
	/** True when HasClue is set and the clue lies within MaxDistance of the guard's pawn. */
	virtual bool CalculateRawConditionValue(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) const override;
};
