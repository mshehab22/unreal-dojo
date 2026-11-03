#pragma once

#include "CoreMinimal.h"
#include "AIController.h"
#include "DojoS6GuardController.generated.h"

class UBehaviorTree;
class UDojoS6SenseMemoryComponent;

/** Broadcast when the guard catches someone, with the one caught. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS6OnCaught, AActor*, Caught);

/** The night guard's mind: sight and hearing feed a sense memory, and a Behavior Tree built on possession reads that memory to chase, search, or walk the beat; it knows nothing about the director or the board. */
UCLASS()
class ADojoS6GuardController : public AAIController
{
	GENERATED_BODY()

public:
	/** Makes the perception component with sight and hearing, and the sense memory. */
	ADojoS6GuardController();

	/** Fires when the chase task reaches its target. */
	UPROPERTY(BlueprintAssignable, Category = "Guard")
	FDojoS6OnCaught OnCaught;

	/** The guard's sense memory. */
	UFUNCTION(BlueprintPure, Category = "Guard")
	UDojoS6SenseMemoryComponent* GetMemory() const;

	/** Announces that the guard caught Caught; called by the chase task. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	void ReportCatch(AActor* Caught);

	/** Stops the tree, so a finished shift leaves the guard standing. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	void EndShift();

protected:
	/** Connects the memory to the perception component. */
	virtual void BeginPlay() override;

	/** Builds the tree once and runs it on the possessed guard. */
	virtual void OnPossess(APawn* InPawn) override;

private:
	/** Builds chase, search, and the beat under one selector, with the memory service on top. */
	UBehaviorTree* BuildTree();

	UPROPERTY(VisibleAnywhere, Category = "Guard")
	TObjectPtr<UDojoS6SenseMemoryComponent> SenseMemory;

	UPROPERTY()
	TObjectPtr<UBehaviorTree> GuardTree;
};
