#include "DojoS6TreeKit.h"

#include "AI/AISystemBase.h"
#include "AIController.h"
#include "BehaviorTree/BlackboardData.h"
#include "BehaviorTree/Blackboard/BlackboardKeyType_Bool.h"
#include "BehaviorTree/Blackboard/BlackboardKeyType_Object.h"
#include "BehaviorTree/Blackboard/BlackboardKeyType_Vector.h"
#include "BehaviorTree/Composites/BTComposite_Selector.h"
#include "BehaviorTree/Composites/BTComposite_Sequence.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "GameFramework/Pawn.h"

namespace DojoS6TreeKitLocal
{
	/** Adds one key of the given type to a blackboard. */
	void AddKey(UBlackboardData* Blackboard, FName Name, UBlackboardKeyType* KeyType)
	{
		FBlackboardEntry Entry;
		Entry.EntryName = Name;
		Entry.KeyType = KeyType;
		Blackboard->Keys.Add(Entry);
	}
}

/** The Object key holding the actor the guard follows. */
FName FDojoS6TreeKit::TargetActorKey()
{
	return TEXT("TargetActor");
}

/** The Bool key that is true while the followed actor is in sight. */
FName FDojoS6TreeKit::TargetVisibleKey()
{
	return TEXT("TargetVisible");
}

/** The Vector key holding where the newest clue is. */
FName FDojoS6TreeKit::ClueLocationKey()
{
	return TEXT("ClueLocation");
}

/** The Bool key that is true while there is a fresh clue. */
FName FDojoS6TreeKit::HasClueKey()
{
	return TEXT("HasClue");
}

/** Gives a world an AI system if it has none, and starts it the way a world starting play would. */
bool FDojoS6TreeKit::EnableAI(UWorld* World)
{
	if (World == nullptr)
	{
		return false;
	}

	if (World->GetAISystem() == nullptr)
	{
		UAISystemBase* AISystem = World->CreateAISystem();

		if (AISystem == nullptr)
		{
			return false;
		}

		AISystem->InitializeActorsForPlay(false);
		AISystem->StartPlay();
	}

	return true;
}

/** Makes an empty tree whose blackboard holds the four guard keys. */
UBehaviorTree* FDojoS6TreeKit::MakeTree()
{
	UBlackboardData* Blackboard = NewObject<UBlackboardData>();

	UBlackboardKeyType_Object* TargetType = NewObject<UBlackboardKeyType_Object>(Blackboard);
	TargetType->BaseClass = AActor::StaticClass();

	DojoS6TreeKitLocal::AddKey(Blackboard, TargetActorKey(), TargetType);
	DojoS6TreeKitLocal::AddKey(Blackboard, TargetVisibleKey(), NewObject<UBlackboardKeyType_Bool>(Blackboard));
	DojoS6TreeKitLocal::AddKey(Blackboard, ClueLocationKey(), NewObject<UBlackboardKeyType_Vector>(Blackboard));
	DojoS6TreeKitLocal::AddKey(Blackboard, HasClueKey(), NewObject<UBlackboardKeyType_Bool>(Blackboard));
	Blackboard->UpdateParentKeys();

	UBehaviorTree* Tree = NewObject<UBehaviorTree>();
	Tree->BlackboardAsset = Blackboard;
	return Tree;
}

/** Makes a selector and sets it as the tree's root. */
UBTComposite_Selector* FDojoS6TreeKit::AddRootSelector(UBehaviorTree* Tree)
{
	UBTComposite_Selector* Selector = NewObject<UBTComposite_Selector>(Tree);
	Selector->InitializeFromAsset(*Tree);
	Tree->RootNode = Selector;
	return Selector;
}

/** Makes a sequence and sets it as the tree's root. */
UBTComposite_Sequence* FDojoS6TreeKit::AddRootSequence(UBehaviorTree* Tree)
{
	UBTComposite_Sequence* Sequence = NewObject<UBTComposite_Sequence>(Tree);
	Sequence->InitializeFromAsset(*Tree);
	Tree->RootNode = Sequence;
	return Sequence;
}

/** Adds a sequence as Parent's next child. */
UBTComposite_Sequence* FDojoS6TreeKit::AddSequence(UBTCompositeNode* Parent)
{
	UBehaviorTree* Tree = Parent->GetTreeAsset();
	UBTComposite_Sequence* Sequence = NewObject<UBTComposite_Sequence>(Tree);
	Sequence->InitializeFromAsset(*Tree);

	const int32 ChildIndex = Parent->Children.AddZeroed(1);
	Parent->Children[ChildIndex].ChildComposite = Sequence;
	return Sequence;
}

/** Starts Tree on the pawn's AI controller, which makes the blackboard first. */
bool FDojoS6TreeKit::Run(APawn* Pawn, UBehaviorTree* Tree)
{
	AAIController* Controller = Pawn != nullptr ? Cast<AAIController>(Pawn->GetController()) : nullptr;

	if (Controller == nullptr || Tree == nullptr)
	{
		return false;
	}

	return Controller->RunBehaviorTree(Tree);
}
