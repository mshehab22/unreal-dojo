#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22SparkPool.generated.h"

/** One burst of sparks the pool fired. */
USTRUCT(BlueprintType)
struct FDojoP22SparkBurst
{
	GENERATED_BODY()

	/** How many sparks flew. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sparks")
	int32 Count = 0;

	/** Where they flew from. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sparks")
	FVector Where = FVector::ZeroVector;

	/** Which way they flew. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sparks")
	FVector Normal = FVector::UpVector;
};

/**
 * Stands in for the game's visual effects: a fixed pool of sparks that are reserved, then fired or cancelled.
 * A real pool would spawn a Niagara system with UNiagaraFunctionLibrary::SpawnSystemAtLocation; this one records its bursts, so tests can see them.
 */
UCLASS()
class UDojoP22SparkPool : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** How many sparks the pool owns. */
	static constexpr int32 Capacity = 32;

	/** Holds Count sparks and returns a ticket for them, or INDEX_NONE when Count is below 1 or more than the free sparks. */
	UFUNCTION(BlueprintCallable, Category = "Sparks")
	int32 Reserve(int32 Count);

	/** Fires the sparks held by Ticket at Where along Normal and frees them; false for a ticket that is not held. */
	UFUNCTION(BlueprintCallable, Category = "Sparks")
	bool Fire(int32 Ticket, FVector Where, FVector Normal);

	/** Frees the sparks held by Ticket without firing them. */
	UFUNCTION(BlueprintCallable, Category = "Sparks")
	void Cancel(int32 Ticket);

	/** Sparks not held by any ticket. */
	UFUNCTION(BlueprintPure, Category = "Sparks")
	int32 GetFree() const;

	/** Every burst fired in this world, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Sparks")
	TArray<FDojoP22SparkBurst> GetBursts() const;

private:
	/** How many sparks each held ticket holds. */
	TMap<int32, int32> Held;

	/** The next ticket to hand out. */
	int32 NextTicket = 0;

	/** Sparks not held by any ticket. */
	int32 Free = Capacity;

	/** Every burst fired, oldest first. */
	UPROPERTY()
	TArray<FDojoP22SparkBurst> Bursts;
};
