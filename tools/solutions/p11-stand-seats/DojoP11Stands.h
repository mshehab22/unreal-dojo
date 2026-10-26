#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP11Stands.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMesh;

/** A block of arena seats drawn by one instanced static mesh component: one mesh shared by every seat, one transform per seat. Flyweight pattern. */
UCLASS()
class ADojoP11Stands : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the seat component as the root and turns ticking off. */
	ADojoP11Stands();

	/** Draws every intact seat as one instance of SeatMesh. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Stands")
	TObjectPtr<UInstancedStaticMeshComponent> Seats;

	/** The one mesh every seat shares. */
	UPROPERTY(EditAnywhere, Category = "Stands")
	TObjectPtr<UStaticMesh> SeatMesh;

	/** Rows of seats, front to back. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "1"))
	int32 Rows = 4;

	/** Seats in each row. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "1"))
	int32 SeatsPerRow = 10;

	/** Distance between neighboring seats in a row. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "1.0"))
	float SeatSpacing = 60.f;

	/** How far each row sits behind the one in front. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "1.0"))
	float RowDepth = 80.f;

	/** How much higher each row sits than the one in front. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "0.0"))
	float RowRise = 40.f;

	/** Clears the stands and draws every seat, all intact. */
	UFUNCTION(BlueprintCallable, Category = "Stands")
	void BuildSeats();

	/** Breaks Seat so it is no longer drawn; returns false for a seat that does not exist or is already broken. */
	UFUNCTION(BlueprintCallable, Category = "Stands")
	bool BreakSeat(int32 Seat);

	/** True for a seat that exists and is not broken. */
	UFUNCTION(BlueprintPure, Category = "Stands")
	bool IsSeatIntact(int32 Seat) const;

	/** Seats still drawn. */
	UFUNCTION(BlueprintPure, Category = "Stands")
	int32 GetIntactCount() const;

	/** Where Seat sits, relative to the stands; seats are numbered row by row from the front left. */
	UFUNCTION(BlueprintPure, Category = "Stands")
	FVector GetSeatLocation(int32 Seat) const;

protected:
	/** Builds the seats. */
	virtual void BeginPlay() override;

private:
	/** Draws one instance for every intact seat, in seat order. */
	void RedrawSeats();

	/** Whether each seat, by seat number, is intact. */
	TArray<bool> SeatIntact;
};
