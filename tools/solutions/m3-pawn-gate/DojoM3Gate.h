#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Gate.generated.h"

class UBoxComponent;
class UTextRenderComponent;

/** A gate that lets pawns through while open, always stops everything else, and never shuts on a pawn standing in it. */
UCLASS()
class ADojoM3Gate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid box as the root and the label above it. */
	ADojoM3Gate();

	/** The solid shape; it blocks everything while shut. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Gate")
	TObjectPtr<UBoxComponent> Box;

	/** Floating text: SHUT, OPEN, or CLEARING while it waits for a pawn to leave. */
	UPROPERTY(VisibleAnywhere, Category = "Gate")
	TObjectPtr<UTextRenderComponent> Label;

	/** Lets pawns through, and only pawns. */
	UFUNCTION(BlueprintCallable, Category = "Gate")
	void Open();

	/** Stops letting pawns through, as soon as none is standing in the gate. */
	UFUNCTION(BlueprintCallable, Category = "Gate")
	void Close();

	/** True from Open until Close. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	bool IsOpen() const;

	/** True while the box blocks pawns. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	bool IsBlockingPawns() const;

protected:
	/** Starts listening for shapes leaving the box and writes the first label. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape stops overlapping the box. */
	UFUNCTION()
	void HandleBoxEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex);

	/** True when a shape whose object type is Pawn overlaps the box. */
	bool HasPawnInside() const;

	/** Blocks pawns again when the gate is not open and no pawn is inside. */
	void ShutIfClear();

	/** Writes SHUT, OPEN, or CLEARING. */
	void RefreshLabel();

	bool bOpen = false;
};
