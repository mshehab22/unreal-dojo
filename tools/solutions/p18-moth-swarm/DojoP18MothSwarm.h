#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP18MothSwarm.generated.h"

/** One moth: where it is on the ground plane and how far it flies each second. */
USTRUCT(BlueprintType)
struct FDojoP18Moth
{
	GENERATED_BODY()

	/** Where the moth is, on the ground plane. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moth")
	FVector2D Position = FVector2D::ZeroVector;

	/** How far it flies each second, and which way. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moth")
	FVector2D Velocity = FVector2D::ZeroVector;
};

/** Thousands of moths kept as plain data, not actors, filed in a grid of cells so a question about one spot looks only at the moths near it. */
UCLASS()
class ADojoP18MothSwarm : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking on. */
	ADojoP18MothSwarm();

	/** How many moths the swarm scatters when play begins. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ClampMin = "0", ExposeOnSpawn = "true"))
	int32 Count = 2000;

	/** The seed of the scatter: the same seed gives the same moths. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ExposeOnSpawn = "true"))
	int32 Seed = 18;

	/** Half the side of the square field the moths fly in, centered where the swarm stands. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ClampMin = "100.0", ExposeOnSpawn = "true"))
	float HalfSize = 2000.f;

	/** The side of one grid cell. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ClampMin = "1.0"))
	float CellSize = 100.f;

	/** How far each moth flies in a second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ClampMin = "0.0"))
	float Speed = 120.f;

	/** Flies every moth for DeltaSeconds, turning it back where it meets the field's edge. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	void Step(float DeltaSeconds);

	/** Fills OutMoths with the index of every moth within Radius of Center, and returns how many moths it measured to decide. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	int32 FindNear(const FVector2D& Center, float Radius, TArray<int32>& OutMoths) const;

	/** How many moths are within Radius of Center. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	int32 CountNear(FVector2D Center, float Radius) const;

	/** Every moth, in scatter order. */
	const TArray<FDojoP18Moth>& GetMoths() const;

	/** Flies the swarm one frame. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Scatters the moths. */
	virtual void BeginPlay() override;

private:
	/** Places Count moths from Seed, each flying a random way at Speed, and files them. */
	void Scatter();

	/** Files every moth in the cell under it, from an empty grid. */
	void FileAll();

	/** Moves the moth at Index to the cell under it now, if that changed. */
	void Refile(int32 Index);

	/** The cell under Position. */
	FIntPoint CellOf(const FVector2D& Position) const;

	/** Every moth, in scatter order. */
	TArray<FDojoP18Moth> Moths;

	/** The moth indices filed in each cell that holds any. */
	TMap<FIntPoint, TArray<int32>> Cells;

	/** The cell each moth is filed in, by moth index. */
	TArray<FIntPoint> MothCells;

	/** The middle of the field, where the swarm stood when it scattered. */
	FVector2D FieldCenter = FVector2D::ZeroVector;
};
