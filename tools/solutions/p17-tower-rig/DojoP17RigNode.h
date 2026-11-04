#pragma once

#include "CoreMinimal.h"
#include "DojoP17RigNode.generated.h"

/** One joint of a tower rig: where it sits relative to its parent joint. */
USTRUCT(BlueprintType)
struct FDojoP17RigNode
{
	GENERATED_BODY()

	/** The joint's name, for the designer. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rig")
	FName NodeName = NAME_None;

	/** Index of the parent joint, which must be lower than this joint's own index; INDEX_NONE for a root. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rig")
	int32 ParentIndex = INDEX_NONE;

	/** Where this joint sits relative to its parent, or relative to the rig for a root. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rig")
	FVector LocalOffset = FVector::ZeroVector;
};
