#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTService.h"
#include "DojoS6BTService_ReadMemory.generated.h"

/** A Behavior Tree service that copies the guard's sense memory into the blackboard as soon as its branch starts and then on a fixed interval, so decorators and tasks read keys instead of components. */
UCLASS()
class UDojoS6BTService_ReadMemory : public UBTService
{
	GENERATED_BODY()

public:
	/** Names the node, sets the interval, and asks for the activation and tick calls. */
	UDojoS6BTService_ReadMemory();

	/** How old a clue may be, in seconds, and still count as fresh. */
	UPROPERTY(EditAnywhere, Category = "Memory", meta = (ClampMin = "0"))
	float ClueSeconds = 6.f;

protected:
	/** Copies the memory the moment the branch starts, so the first decision already sees it. */
	virtual void OnBecomeRelevant(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

	/** Copies the memory again on every interval. */
	virtual void TickNode(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds) override;

private:
	/** Writes the four guard keys from the memory component on the AI controller; does nothing when either is missing. */
	void CopyMemory(UBehaviorTreeComponent& OwnerComp) const;
};
