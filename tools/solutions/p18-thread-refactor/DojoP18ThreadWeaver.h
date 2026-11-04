#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP18ThreadWeaver.generated.h"

/** Two floating lanterns joined by a glowing thread, the lower index first. */
USTRUCT(BlueprintType)
struct FDojoP18Thread
{
	GENERATED_BODY()

	/** The lower index of the two lanterns. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Thread")
	int32 First = 0;

	/** The higher index of the two lanterns. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Thread")
	int32 Second = 0;
};

/** Joins every two floating lanterns on the pond that drift within reach of each other with a thread, once per pair. */
UCLASS()
class ADojoP18ThreadWeaver : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking on. */
	ADojoP18ThreadWeaver();

	/** Where each floating lantern is on the pond. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weaver")
	TArray<FVector2D> Floats;

	/** Two lanterns this close or closer are joined. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weaver", meta = (ClampMin = "1.0"))
	float LinkRange = 150.f;

	/** Works out the threads again from where the lanterns are now. */
	UFUNCTION(BlueprintCallable, Category = "Weaver")
	void Weave();

	/** The threads the last Weave found, each pair once, in no particular order. */
	UFUNCTION(BlueprintPure, Category = "Weaver")
	TArray<FDojoP18Thread> GetThreads() const;

	/** How many pairs of lanterns the last Weave measured. */
	UFUNCTION(BlueprintPure, Category = "Weaver")
	int32 GetLastMeasured() const;

	/** Weaves again every frame, because the lanterns drift. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** The cell under Position, for cells LinkRange wide. */
	FIntPoint CellOf(const FVector2D& Position) const;

	/** Measures one pair and joins it when it is in reach. */
	void Measure(int32 One, int32 Other);

	/** The threads the last Weave found. */
	TArray<FDojoP18Thread> Threads;

	/** Pairs the last Weave measured. */
	int32 LastMeasured = 0;
};
