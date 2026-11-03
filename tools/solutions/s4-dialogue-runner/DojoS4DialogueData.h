#pragma once

#include "CoreMinimal.h"
#include "DojoS4DialogueNode.h"
#include "Engine/DataAsset.h"
#include "DojoS4DialogueData.generated.h"

/** One conversation kept in an asset, so designers write dialogue without code; the runner only plays it. */
UCLASS(BlueprintType)
class UDojoS4DialogueData : public UDataAsset
{
	GENERATED_BODY()

public:
	/** The node the conversation opens on. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Dialogue")
	FName StartNode;

	/** Every node of the conversation. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Dialogue")
	TArray<FDojoS4DialogueNode> Nodes;

	/** The node with this id, or null when there is none. */
	const FDojoS4DialogueNode* FindNode(FName NodeId) const;
};
