#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "GameFramework/Actor.h"
#include "DojoP10Quiver.generated.h"

struct FDojoP10QuiverRow;
class UTextRenderComponent;

/** One quiver at the archery range: its own arrows left, and everything else read from its kind's data table row. Type Object pattern. */
UCLASS()
class ADojoP10Quiver : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP10Quiver();

	/** Shows the kind's name and the arrows left. */
	UPROPERTY(VisibleAnywhere, Category = "Quiver")
	TObjectPtr<UTextRenderComponent> Label;

	/** Which row of which quiver table this quiver is a kind of. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver", meta = (RowType = "/Script/Dojo.DojoP10QuiverRow"))
	FDataTableRowHandle Kind;

	/** Spawns a full quiver of Kind at Transform, as the row's QuiverClass or the plain quiver; returns nullptr without a world. */
	static ADojoP10Quiver* SpawnOfKind(UWorld* World, const FDataTableRowHandle& Kind, const FTransform& Transform);

	/** Takes one arrow and returns its damage; returns 0 when empty or without a kind. */
	UFUNCTION(BlueprintCallable, Category = "Quiver")
	float Draw();

	/** Fills this quiver back to its kind's ArrowCount. */
	UFUNCTION(BlueprintCallable, Category = "Quiver")
	void Refill();

	/** Arrows left in this quiver. */
	UFUNCTION(BlueprintPure, Category = "Quiver")
	int32 GetArrowsLeft() const;

	/** True when Kind names a row that exists. */
	UFUNCTION(BlueprintPure, Category = "Quiver")
	bool HasKind() const;

protected:
	/** Fills the quiver from its kind. */
	virtual void BeginPlay() override;

private:
	/** The kind's row, looked up each time so a retuned table reaches every quiver; nullptr when there is none. */
	const FDojoP10QuiverRow* FindKind() const;

	/** Writes the kind's name and the arrows left into the label. */
	void RefreshLabel();

	/** This quiver's own arrows; the only number that is not the kind's. */
	int32 ArrowsLeft = 0;
};
