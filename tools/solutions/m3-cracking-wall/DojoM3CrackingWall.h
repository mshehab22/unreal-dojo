#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3CrackingWall.generated.h"

class UBoxComponent;
class UTextRenderComponent;

/** A solid wall that cracks each time something runs into it and gives way after a set number of hits. */
UCLASS()
class ADojoM3CrackingWall : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the blocking box as the root and the label above it. */
	ADojoM3CrackingWall();

	/** The solid shape; its extent is half the wall's size on each axis. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Cracking Wall")
	TObjectPtr<UBoxComponent> Box;

	/** Floating text: CRACKS and the count, or BROKEN. */
	UPROPERTY(VisibleAnywhere, Category = "Cracking Wall")
	TObjectPtr<UTextRenderComponent> Label;

	/** How many hits break the wall. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Cracking Wall", meta = (ClampMin = "1"))
	int32 HitsToBreak = 4;

	/** Hits taken so far, never more than HitsToBreak. */
	UFUNCTION(BlueprintPure, Category = "Cracking Wall")
	int32 GetCracks() const;

	/** True once the wall has given way. */
	UFUNCTION(BlueprintPure, Category = "Cracking Wall")
	bool IsBroken() const;

protected:
	/** Starts listening for hits on the box and writes the first label. */
	virtual void BeginPlay() override;

private:
	/** Runs when a swept move is stopped by the box. */
	UFUNCTION()
	void HandleBoxHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit);

	/** Writes the cracks so far, or BROKEN. */
	void RefreshLabel();

	int32 Cracks = 0;

	bool bBroken = false;
};
