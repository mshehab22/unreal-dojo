#include "DojoS6GuardController.h"

#include "BehaviorTree/Composites/BTComposite_Selector.h"
#include "BehaviorTree/Composites/BTComposite_Sequence.h"
#include "BrainComponent.h"
#include "DojoS6BTDecorator_TargetInSight.h"
#include "DojoS6BTTask_Chase.h"
#include "DojoS6BTTask_GoToClue.h"
#include "Perception/AIPerceptionComponent.h"
#include "Perception/AISenseConfig_Hearing.h"
#include "Perception/AISenseConfig_Sight.h"
#include "Quests/s6-clue-decorator/DojoS6BTDecorator_NearClue.h"
#include "Quests/s6-memory-service/DojoS6BTService_ReadMemory.h"
#include "Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h"
#include "Quests/s6-walk-beat/DojoS6BTTask_WalkBeat.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"

/** Makes the perception component with sight and hearing, and the sense memory. */
ADojoS6GuardController::ADojoS6GuardController()
{
	UAIPerceptionComponent* Senses = CreateDefaultSubobject<UAIPerceptionComponent>(TEXT("Perception"));

	UAISenseConfig_Sight* Sight = CreateDefaultSubobject<UAISenseConfig_Sight>(TEXT("Sight"));
	Sight->SightRadius = 1200.f;
	Sight->LoseSightRadius = 1400.f;
	Sight->PeripheralVisionAngleDegrees = 70.f;
	Sight->DetectionByAffiliation = FAISenseAffiliationFilter(true, true, true);
	Senses->ConfigureSense(*Sight);

	UAISenseConfig_Hearing* Hearing = CreateDefaultSubobject<UAISenseConfig_Hearing>(TEXT("Hearing"));
	Hearing->HearingRange = 1500.f;
	Hearing->DetectionByAffiliation = FAISenseAffiliationFilter(true, true, true);
	Senses->ConfigureSense(*Hearing);

	Senses->SetDominantSense(Sight->GetSenseImplementation());
	SetPerceptionComponent(*Senses);

	SenseMemory = CreateDefaultSubobject<UDojoS6SenseMemoryComponent>(TEXT("SenseMemory"));
}

/** The guard's sense memory. */
UDojoS6SenseMemoryComponent* ADojoS6GuardController::GetMemory() const
{
	return SenseMemory;
}

/** Announces that the guard caught Caught. */
void ADojoS6GuardController::ReportCatch(AActor* Caught)
{
	OnCaught.Broadcast(Caught);
}

/** Forgets what the guard knows once a search is done. */
void ADojoS6GuardController::ForgetClue()
{
	SenseMemory->Forget();
}

/** Stops the tree, so a finished shift leaves the guard standing. */
void ADojoS6GuardController::EndShift()
{
	if (GetBrainComponent() != nullptr)
	{
		GetBrainComponent()->StopLogic(TEXT("Shift over"));
	}
}

/** Connects the memory to the perception component. */
void ADojoS6GuardController::BeginPlay()
{
	Super::BeginPlay();
	SenseMemory->Watch(GetAIPerceptionComponent());
}

/** Builds the tree once and runs it on the possessed guard. */
void ADojoS6GuardController::OnPossess(APawn* InPawn)
{
	Super::OnPossess(InPawn);

	if (GuardTree == nullptr)
	{
		GuardTree = BuildTree();
	}

	RunBehaviorTree(GuardTree);
}

/** Builds chase, search, and the beat under one selector, with the memory service on top. */
UBehaviorTree* ADojoS6GuardController::BuildTree()
{
	UBehaviorTree* NewTree = FDojoS6TreeKit::MakeTree();
	UBTComposite_Selector* Root = FDojoS6TreeKit::AddRootSelector(NewTree);
	FDojoS6TreeKit::AddService<UDojoS6BTService_ReadMemory>(Root)->ClueSeconds = 10.f;

	UBTComposite_Sequence* Chase = FDojoS6TreeKit::AddSequence(Root);
	FDojoS6TreeKit::AddDecorator<UDojoS6BTDecorator_TargetInSight>(Root);
	FDojoS6TreeKit::AddTask<UDojoS6BTTask_Chase>(Chase);

	UBTComposite_Sequence* Search = FDojoS6TreeKit::AddSequence(Root);
	FDojoS6TreeKit::AddDecorator<UDojoS6BTDecorator_NearClue>(Root)->MaxDistance = 3000.f;
	FDojoS6TreeKit::AddTask<UDojoS6BTTask_GoToClue>(Search);

	FDojoS6TreeKit::AddTask<UDojoS6BTTask_WalkBeat>(Root);
	return NewTree;
}
