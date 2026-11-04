#include "DojoS4Villager.h"

#include "Components/BoxComponent.h"
#include "Quests/s4-dialogue-runner/DojoS4DialogueData.h"
#include "Quests/s4-dialogue-runner/DojoS4DialogueRunner.h"
#include "Quests/s4-dialogue-runner/DojoS4FlagStore.h"

ADojoS4Villager::ADojoS4Villager()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	RootComponent = Body;
	Body->SetBoxExtent(FVector(40.f, 40.f, 90.f));
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	Body->SetGenerateOverlapEvents(true);
}

FText ADojoS4Villager::GetPrompt_Implementation() const
{
	return FText::FromString(FString::Printf(TEXT("Talk to %s"), *DisplayName.ToString()));
}

bool ADojoS4Villager::CanInteract_Implementation(AActor* Interactor) const
{
	return Dialogue != nullptr && Runner != nullptr && FlagStore != nullptr && Runner->GetState() == EDojoS4DialogueState::EDS_Idle;
}

bool ADojoS4Villager::Interact_Implementation(AActor* Interactor)
{
	if (!CanInteract_Implementation(Interactor))
	{
		return false;
	}

	return Runner->Start(Dialogue, FlagStore);
}
