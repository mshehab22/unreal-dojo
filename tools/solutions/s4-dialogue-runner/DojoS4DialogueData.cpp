#include "DojoS4DialogueData.h"

const FDojoS4DialogueNode* UDojoS4DialogueData::FindNode(FName NodeId) const
{
	return Nodes.FindByPredicate([NodeId](const FDojoS4DialogueNode& Node) { return Node.Id == NodeId; });
}
