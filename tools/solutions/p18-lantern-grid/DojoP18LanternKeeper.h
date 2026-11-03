#pragma once

#include "CoreMinimal.h"
#include "DojoP18Grid.h"
#include "GameFramework/Actor.h"
#include "DojoP18LanternKeeper.generated.h"

class ADojoP18Lantern;

/** Keeps the meadow's lanterns filed in a grid and answers how many burn near a spot. The keeper depends on the lanterns and the grid; neither knows the keeper exists. */
UCLASS()
class ADojoP18LanternKeeper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP18LanternKeeper();

	/** The side of one grid cell. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lanterns", meta = (ClampMin = "1.0", ExposeOnSpawn = "true"))
	float CellSize = 200.f;

	/** Files Lantern in the grid. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	void Register(ADojoP18Lantern* Lantern);

	/** Takes Lantern out of the grid. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	void Unregister(ADojoP18Lantern* Lantern);

	/** Moves Lantern to NewLocation and refiles it. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	void MoveLantern(ADojoP18Lantern* Lantern, FVector NewLocation);

	/** How many filed lanterns burn within Radius of Center on the ground plane. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	int32 CountLitNear(FVector Center, float Radius);

	/** Every filed lantern within Radius of Center on the ground plane, lit or not. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	TArray<ADojoP18Lantern*> FindLanternsNear(FVector Center, float Radius);

	/** How many lanterns the last CountLitNear or FindLanternsNear measured. */
	UFUNCTION(BlueprintPure, Category = "Lanterns")
	int32 GetLastMeasured() const;

protected:
	/** Makes the grid and files every lantern already in the world. */
	virtual void BeginPlay() override;

private:
	/** The lanterns, filed by cell. */
	FDojoP18Grid Grid;

	/** Lanterns the last count measured. */
	int32 LastMeasured = 0;
};
