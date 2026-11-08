#pragma once

#include "CoreMinimal.h"
#include "DojoP20MoveRule.h"
#include "GameFramework/Actor.h"
#include "DojoP20Mover.generated.h"

/** A practice dummy that moves by whichever movement rule class it is given; the class can be changed while it moves. Strategy pattern. */
UCLASS()
class ADojoP20Mover : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP20Mover();

	/** The class of the rule that moves this dummy; empty means it stands still. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mover")
	TSubclassOf<UDojoP20MoveRule> RuleClass;

	/** Makes NewClass the movement rule from the next step on; an empty class makes the dummy stand still. */
	UFUNCTION(BlueprintCallable, Category = "Mover")
	void SetRuleClass(TSubclassOf<UDojoP20MoveRule> NewClass);

	/** Moves the dummy to where its rule says it goes after DeltaSeconds; does nothing without a rule class, or with an abstract one. */
	UFUNCTION(BlueprintCallable, Category = "Mover")
	void Step(float DeltaSeconds);

	/** Where the dummy was when play began. */
	UFUNCTION(BlueprintPure, Category = "Mover")
	FVector GetAnchor() const;

	/** The rule object now moving the dummy, or nullptr before the first step. */
	UFUNCTION(BlueprintPure, Category = "Mover")
	UDojoP20MoveRule* GetRule() const;

protected:
	/** Remembers where the dummy started. */
	virtual void BeginPlay() override;

private:
	/** The rule object that moves this dummy; one object for each mover, because a rule may remember things between steps. */
	UPROPERTY()
	TObjectPtr<UDojoP20MoveRule> Rule; // @explain: Each mover keeps a rule object of its own, because a rule such as the patrol remembers which way it is heading and two movers must not share that memory.

	/** Where the dummy was when play began. */
	FVector Anchor = FVector::ZeroVector;
};
