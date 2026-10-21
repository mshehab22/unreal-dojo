#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP4StrawFloor.generated.h"

class UTextRenderComponent;

/** One square of straw on the arena floor. */
UENUM(BlueprintType)
enum class EDojoP4StrawState : uint8
{
	ESS_Straw UMETA(DisplayName = "Straw"),
	ESS_Burning UMETA(DisplayName = "Burning"),
	ESS_Ash UMETA(DisplayName = "Ash")
};

/** A grid of straw squares where fire spreads one square per step, the same whichever way the step walks the grid (Double Buffer: read the finished grid, write the next one, then swap). */
UCLASS()
class ADojoP4StrawFloor : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on for drawing. */
	ADojoP4StrawFloor();

	/** Floating text that shows how many squares are burning. */
	UPROPERTY(VisibleAnywhere, Category = "Straw")
	TObjectPtr<UTextRenderComponent> Label;

	/** Squares along X. */
	UPROPERTY(EditAnywhere, Category = "Straw", meta = (ClampMin = "1"))
	int32 Width = 12;

	/** Squares along Y. */
	UPROPERTY(EditAnywhere, Category = "Straw", meta = (ClampMin = "1"))
	int32 Height = 8;

	/** Seconds between spread steps during play. */
	UPROPERTY(EditAnywhere, Category = "Straw", meta = (ClampMin = "0.05"))
	float StepSeconds = 0.5f;

	/** Which way a step walks the squares; with a correct step the fire spreads the same either way. */
	UPROPERTY(EditAnywhere, Category = "Straw")
	bool bWalkBackward = false;

	/** Refills the floor with fresh straw at the given size. */
	UFUNCTION(BlueprintCallable, Category = "Straw")
	void ResetGrid(int32 NewWidth, int32 NewHeight);

	/** Sets one straw square burning; ash and squares off the floor are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Straw")
	void Ignite(int32 X, int32 Y);

	/** One spread step: burning squares turn to ash, and straw next to a burning square catches. */
	UFUNCTION(BlueprintCallable, Category = "Straw")
	void Step();

	/** The state of one square; squares off the floor read as ash. */
	UFUNCTION(BlueprintPure, Category = "Straw")
	EDojoP4StrawState GetSquare(int32 X, int32 Y) const;

	/** How many squares are burning right now. */
	UFUNCTION(BlueprintPure, Category = "Straw")
	int32 CountBurning() const;

	/** Draws the burning squares. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Fills the floor and starts the step timer. */
	virtual void BeginPlay() override;

private:
	/** The state the square at Index will have after this step, read only from Squares. */
	EDojoP4StrawState NextStateOf(int32 Index) const;

	/** True when the square at X, Y is on the floor and burning in Squares. */
	bool IsBurningAt(int32 X, int32 Y) const;

	/** Writes the burning count into the label. */
	void RefreshLabel();

	/** The finished floor everyone reads. */
	TArray<EDojoP4StrawState> Squares;

	/** The floor being built by the current step. */
	TArray<EDojoP4StrawState> NextSquares;

	FTimerHandle StepTimer;
};
