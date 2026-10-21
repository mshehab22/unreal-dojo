#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF2TargetRack.generated.h"

class ADojoF1PopupTarget;

/** Keeps a fixed set of pop-up targets and lends them out instead of spawning and destroying them. Object Pool pattern. */
UCLASS()
class ADojoF2TargetRack : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root, sets the default target class, and turns ticking off. */
	ADojoF2TargetRack();

	/** The target class the rack fills itself with. */
	UPROPERTY(EditAnywhere, Category = "Rack")
	TSubclassOf<ADojoF1PopupTarget> TargetClass;

	/** How many targets the rack owns; it never makes more. */
	UPROPERTY(EditAnywhere, Category = "Rack", meta = (ClampMin = "1"))
	int32 PoolSize = 3;

	/** Distance between the rack and each target slot. */
	UPROPERTY(EditAnywhere, Category = "Rack")
	FVector SlotSpacing = FVector(0.f, 150.f, 0.f);

	/** Lends out a resting target: shows it, enables its collision, and raises it. Returns nullptr when every target is out. */
	UFUNCTION(BlueprintCallable, Category = "Rack")
	ADojoF1PopupTarget* Deploy();

	/** Takes back a target this rack lent out: hides it and resets it for its next use. Returns false for any other actor. */
	UFUNCTION(BlueprintCallable, Category = "Rack")
	bool Recall(ADojoF1PopupTarget* Target);

	/** Targets resting in the rack. */
	UFUNCTION(BlueprintPure, Category = "Rack")
	int32 GetAvailableCount() const;

	/** Targets currently lent out. */
	UFUNCTION(BlueprintPure, Category = "Rack")
	int32 GetDeployedCount() const;

protected:
	/** Spawns every target once, hidden and without collision. */
	virtual void BeginPlay() override;

	/** Destroys the targets the rack owns. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Shows or hides a target and switches its collision with it. */
	static void SetTargetActive(ADojoF1PopupTarget* Target, bool bActive);

	UPROPERTY(VisibleInstanceOnly, Category = "Rack")
	TArray<TObjectPtr<ADojoF1PopupTarget>> Available;

	UPROPERTY(VisibleInstanceOnly, Category = "Rack")
	TArray<TObjectPtr<ADojoF1PopupTarget>> Deployed;
};
