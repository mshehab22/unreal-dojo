#pragma once

#include "CoreMinimal.h"
#include "DojoS4DialogueChoice.generated.h"

/** One thing the player can say at a node; it may need a flag to be shown, set a flag when chosen, and lead to another node. */
USTRUCT(BlueprintType)
struct FDojoS4DialogueChoice
{
	GENERATED_BODY()

	/** What the player says. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FText Text;

	/** The node this choice leads to; none ends the conversation. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FName NextNode;

	/** The choice is shown only once this flag is set; none means always shown. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FName RequiredFlag;

	/** Set when this choice is made; none sets nothing. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FName SetFlag;
};
