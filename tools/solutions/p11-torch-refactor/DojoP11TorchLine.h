#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP11TorchLine.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMesh;

/** A line of torches along the arena wall, drawn by one instanced static mesh component that shares one torch mesh. Flyweight pattern. */
UCLASS()
class ADojoP11TorchLine : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the torch component as the root and turns ticking off. */
	ADojoP11TorchLine();

	/** Draws every torch as one instance of TorchMesh. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Torches")
	TObjectPtr<UInstancedStaticMeshComponent> Torches;

	/** The one mesh every torch shares. */
	UPROPERTY(EditAnywhere, Category = "Torches")
	TObjectPtr<UStaticMesh> TorchMesh;

	/** How many torches the line holds. */
	UPROPERTY(EditAnywhere, Category = "Torches", meta = (ClampMin = "0"))
	int32 TorchCount = 12;

	/** Distance between neighboring torches. */
	UPROPERTY(EditAnywhere, Category = "Torches", meta = (ClampMin = "1.0"))
	float TorchSpacing = 150.f;

	/** Clears the line and places TorchCount torches, TorchSpacing apart along X. */
	UFUNCTION(BlueprintCallable, Category = "Torches")
	void BuildTorches();

	/** Torches drawn. */
	UFUNCTION(BlueprintPure, Category = "Torches")
	int32 GetTorchCount() const;

	/** Where torch Index stands, relative to the line; zero for an index with no torch. */
	UFUNCTION(BlueprintPure, Category = "Torches")
	FVector GetTorchLocation(int32 Index) const;

protected:
	/** Places the torches. */
	virtual void BeginPlay() override;
};
