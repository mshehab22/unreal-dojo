#pragma once

#include "CoreMinimal.h"
#include "DojoS4DialogueChoice.h"
#include "DojoS4DialogueNode.generated.h"

/** One moment of a conversation: what the speaker says and what the player may answer. */
USTRUCT(BlueprintType)
struct FDojoS4DialogueNode
{
	GENERATED_BODY()

	/** The name other nodes use to lead here. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FName Id;

	/** What the speaker says. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FText Text;

	/** The answers; a node with none is a closing line. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	TArray<FDojoS4DialogueChoice> Choices;
};
