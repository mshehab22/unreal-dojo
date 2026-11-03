#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BehaviorTree.h"
#include "BehaviorTree/BTCompositeNode.h"

class APawn;
class UWorld;
class UBTComposite_Selector;
class UBTComposite_Sequence;

/** Builds a Behavior Tree in code, node by node, the way the Behavior Tree editor builds an asset; a headless test has no assets, so the tests and the boss use this, and its keys are the guard's blackboard. */
struct FDojoS6TreeKit
{
	/** The Object key holding the actor the guard follows. */
	static FName TargetActorKey();

	/** The Bool key that is true while the followed actor is in sight. */
	static FName TargetVisibleKey();

	/** The Vector key holding where the newest clue is. */
	static FName ClueLocationKey();

	/** The Bool key that is true while there is a fresh clue. */
	static FName HasClueKey();

	/** Gives a world an AI system (behavior tree manager and perception) if it has none; a world made with UWorld::CreateWorld as a game world starts without one. Returns whether the world has one now. */
	static bool EnableAI(UWorld* World);

	/** Makes an empty tree whose blackboard holds the four guard keys. */
	static UBehaviorTree* MakeTree();

	/** Makes a selector and sets it as the tree's root. */
	static UBTComposite_Selector* AddRootSelector(UBehaviorTree* Tree);

	/** Makes a sequence and sets it as the tree's root. */
	static UBTComposite_Sequence* AddRootSequence(UBehaviorTree* Tree);

	/** Adds a sequence as Parent's next child. */
	static UBTComposite_Sequence* AddSequence(UBTCompositeNode* Parent);

	/** Adds a task as Parent's next child. */
	template<typename TTask>
	static TTask* AddTask(UBTCompositeNode* Parent)
	{
		TTask* Task = NewObject<TTask>(Parent->GetTreeAsset());
		const int32 ChildIndex = Parent->Children.AddZeroed(1);
		Parent->Children[ChildIndex].ChildTask = Task;
		return Task;
	}

	/** Puts a decorator on Parent's newest child, the way a decorator sits on top of a node in the editor. */
	template<typename TDecorator>
	static TDecorator* AddDecorator(UBTCompositeNode* Parent)
	{
		TDecorator* Decorator = NewObject<TDecorator>(Parent->GetTreeAsset());
		Parent->Children.Last().Decorators.Add(Decorator);
		return Decorator;
	}

	/** Puts a service on a composite node; it runs while that node's branch is active. */
	template<typename TService>
	static TService* AddService(UBTCompositeNode* Node)
	{
		TService* Service = NewObject<TService>(Node->GetTreeAsset());
		Node->Services.Add(Service);
		return Service;
	}

	/** Starts Tree on the pawn's AI controller, which makes the blackboard first; false when the pawn has no AI controller. */
	static bool Run(APawn* Pawn, UBehaviorTree* Tree);
};
