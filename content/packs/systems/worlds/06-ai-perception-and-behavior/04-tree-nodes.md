---
id: s6-tree-nodes
title: The nodes of a tree
order: 4
kind: concept
difficulty: 2
patterns: []
skills: [ai, behavior-trees]
terms: [bt-task-node, node-memory, bt-service, bt-decorator]
prerequisites: [s6-sense-memory]
xp: 30
estimatedMinutes: 8
concepts:
  - A task does the work of a leaf, and a service refreshes facts on an interval while its branch runs
  - A decorator is a condition on a node that says whether the branch may run
  - One node object serves every guard running the tree, so each guard's own numbers live in node memory
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: ten guards run the same Behavior Tree, and its patrol task keeps a `NextPoint` counter as an ordinary member variable of the task class. One guard finishes a point and adds one to it. What do the other nine see?"
choices:
  - Each keeps its own count, because each guard runs a private copy of the task
  - They share the one count, because there is one task object
  - The compiler refuses a task that has an ordinary member variable
  - The count restarts from zero on every frame the tree is searched
answerIndex: 1
explanation: A Behavior Tree asset holds one object per node, and every AI running the tree uses that same object, so a member variable on a node belongs to all of them at once.
```

# Card

The last quest gave a guard facts. A Behavior Tree is where those facts turn into doing something, and it is built from four kinds of node. You already met the shape: a **selector** tries its children left to right until one succeeds, a **sequence** runs them in order until one fails. The nodes below hang off those.

A **task** is a leaf, the node that acts. In C++ you derive from `UBTTaskNode` and override `ExecuteTask`, which answers with `EBTNodeResult::Succeeded` or `Failed` at once, or `InProgress` for work that takes several frames. An in-progress task has to end itself later with `FinishLatentTask`; until it does, the tree stays on that node.

A **service** is attached to a node and wakes up on an interval for as long as its branch is running. You derive from `UBTService`, set `Interval` and `RandomDeviation` in the constructor, and override `TickNode`. Its job is to keep the blackboard current, so the other nodes only have to read keys.

A **decorator** is a condition attached to a node. You derive from `UBTDecorator` and override `CalculateRawConditionValue`: return true and the branch under it may run, return false and it may not. `UBTDecorator_BlackboardBase` is the ready-made base for a condition on one blackboard key.

Here is the catch that shapes every node you write. The tree does not copy a node for each guard. Ten guards running one tree share one task object, one service object and one decorator object. So a number that belongs to one guard, such as which point it walks to next, cannot be a member variable. It goes in **node memory**: the node says how many bytes it needs by overriding `GetInstanceMemorySize`, the tree reserves that many bytes for each guard that runs it, and every virtual call receives a `uint8* NodeMemory` pointing at that guard's block. Inside the node, `CastInstanceNodeMemory<T>(NodeMemory)` turns the pointer into your own struct. The engine zeroes the block when it creates it, so a plain struct of numbers starts at zero.

If a node has only constant settings, such as a walking speed designers set once, ordinary properties are right: every guard may share those. Only state that changes per guard goes in node memory.

# Example

```cpp
// A struct for what one guard needs from this task. Plain numbers only.
struct FDojoExShoutMemory
{
	int32 ShoutsSoFar;
};

uint16 UDojoExBTTask_Shout::GetInstanceMemorySize() const
{
	return sizeof(FDojoExShoutMemory);
}

EBTNodeResult::Type UDojoExBTTask_Shout::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
	FDojoExShoutMemory* Memory = CastInstanceNodeMemory<FDojoExShoutMemory>(NodeMemory);
	Memory->ShoutsSoFar += 1;
	return Memory->ShoutsSoFar <= 3 ? EBTNodeResult::Succeeded : EBTNodeResult::Failed;
}

// A decorator that lets its branch run only while a flag on the blackboard is set.
bool UDojoExBTDecorator_IsAlarmed::CalculateRawConditionValue(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) const
{
	const UBlackboardComponent* Blackboard = OwnerComp.GetBlackboardComponent();
	return Blackboard != nullptr && Blackboard->GetValueAsBool(TEXT("Alarmed"));
}
```

# Questions

```yaml
- id: fill-finish
  type: fill-blank
  prompt: "A task that answered InProgress ends itself later by calling ___(OwnerComp, EBTNodeResult::Succeeded)."
  acceptedAnswers: [FinishLatentTask]
  explanation: FinishLatentTask reports the task's final result to the tree; returning from a tick function does not end an in-progress task.
- id: which-node
  type: multiple-choice
  prompt: A designer wants a chase branch to be allowed only while the blackboard says a target is known, and wants no new tree layout for it. Which node does that?
  choices:
    - A task that runs the whole chase
    - A service that sets the flag
    - A decorator on the chase branch
    - A second blackboard asset
  answerIndex: 2
  explanation: A decorator is the condition on a node, so it is what says whether the branch under it may run; a service only keeps the facts it reads up to date.
- id: spot-shared-counter
  type: spot-the-bug
  prompt: Two guards run this walk task, and both start walking toward the point the other one chose. Which line is wrong?
  code: |
    EBTNodeResult::Type UDojoExBTTask_Walk::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
    {
    	NextPoint = (NextPoint + 1) % PointCount;
    	return EBTNodeResult::InProgress;
    }
  bugLine: 3
  fix: Keep the counter in this guard's node memory and update it through CastInstanceNodeMemory, not in a member variable of the shared task.
  explanation: NextPoint is a member of the one task object that every guard shares, so each guard's step moves every guard's counter.
- id: what-a-service-does
  type: multiple-choice
  prompt: What is a Behavior Tree service for?
  choices:
    - Refreshing blackboard keys on an interval
    - Deciding whether the branch under it is allowed to run
    - Walking the pawn from one point of its beat to the next
    - Building the tree from code in a headless test
  answerIndex: 0
  explanation: A service runs on an interval and refreshes the blackboard, so tasks and decorators only read keys; the condition and the work belong to decorators and tasks.
- id: explain-node-memory
  type: explain-in-one-sentence
  prompt: In one sentence, say why a Behavior Tree task keeps a guard's walk progress in node memory instead of in a member variable.
  modelAnswer: Every guard that runs the tree shares the one task object, so a member variable would be shared by all of them, while node memory gives each guard its own block.
  rubric:
    - Says the task object is shared by every AI running the tree
    - Says node memory is separate for each AI
  explanation: Node memory is the per-guard storage that lets one shared node serve many guards.
```
