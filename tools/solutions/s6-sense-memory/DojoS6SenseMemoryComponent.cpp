#include "DojoS6SenseMemoryComponent.h"

#include "Engine/World.h"
#include "Perception/AIPerceptionComponent.h"
#include "Perception/AIPerceptionSystem.h"
#include "Perception/AISense_Hearing.h"
#include "Perception/AISense_Sight.h"

/** Turns ticking off; the memory only reacts to news. */
UDojoS6SenseMemoryComponent::UDojoS6SenseMemoryComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

/** Starts listening to a perception component's updates, and stops listening to the one before. */
void UDojoS6SenseMemoryComponent::Watch(UAIPerceptionComponent* Perception)
{
	if (WatchedPerception != nullptr)
	{
		WatchedPerception->OnTargetPerceptionUpdated.RemoveDynamic(this, &UDojoS6SenseMemoryComponent::HandlePerception);
	}

	WatchedPerception = Perception;

	if (WatchedPerception != nullptr)
	{
		WatchedPerception->OnTargetPerceptionUpdated.AddUniqueDynamic(this, &UDojoS6SenseMemoryComponent::HandlePerception);
	}
}

/** Turns one perception update into a sighting or a noise, by the sense that produced it. */
void UDojoS6SenseMemoryComponent::HandlePerception(AActor* Actor, FAIStimulus Stimulus)
{
	const TSubclassOf<UAISense> Sense = UAIPerceptionSystem::GetSenseClassForStimulus(this, Stimulus);

	if (Sense == UAISense_Sight::StaticClass())
	{
		NoteSight(Actor, Stimulus.WasSuccessfullySensed(), Stimulus.StimulusLocation);
	}
	else if (Sense == UAISense_Hearing::StaticClass() && Stimulus.WasSuccessfullySensed())
	{
		NoteNoise(Stimulus.StimulusLocation);
	}
}

/** Records a sighting, or the moment the followed actor went out of sight. */
void UDojoS6SenseMemoryComponent::NoteSight(AActor* SeenActor, bool bSeen, FVector Location)
{
	if (SeenActor == nullptr)
	{
		return;
	}

	if (bSeen)
	{
		RememberedTarget = SeenActor;
		bTargetVisible = true;
	}
	else
	{
		if (RememberedTarget.Get() != SeenActor)
		{
			return;
		}

		bTargetVisible = false;
	}

	SetClue(Location);
	OnMemoryChanged.Broadcast(this);
}

/** Records a noise as the newest clue, unless the followed actor is in sight. */
void UDojoS6SenseMemoryComponent::NoteNoise(FVector NoiseLocation)
{
	if (bTargetVisible)
	{
		return;
	}

	SetClue(NoiseLocation);
	OnMemoryChanged.Broadcast(this);
}

/** Forgets the followed actor and the clue, announcing only when there was something to forget. */
void UDojoS6SenseMemoryComponent::Forget()
{
	if (!RememberedTarget.IsValid() && !bHasClue)
	{
		return;
	}

	RememberedTarget.Reset();
	bTargetVisible = false;
	bHasClue = false;
	OnMemoryChanged.Broadcast(this);
}

/** The actor being followed, or null. */
AActor* UDojoS6SenseMemoryComponent::GetTarget() const
{
	return RememberedTarget.Get();
}

/** True while the followed actor is in sight. */
bool UDojoS6SenseMemoryComponent::IsTargetVisible() const
{
	return bTargetVisible && RememberedTarget.IsValid();
}

/** True when there is a clue. */
bool UDojoS6SenseMemoryComponent::HasClue() const
{
	return bHasClue;
}

/** Where the newest clue is. */
FVector UDojoS6SenseMemoryComponent::GetClueLocation() const
{
	return ClueLocation;
}

/** Seconds since the newest clue was noted, or -1 when there is none. */
float UDojoS6SenseMemoryComponent::GetClueAge() const
{
	if (!bHasClue)
	{
		return -1.f;
	}

	return static_cast<float>(Now() - ClueTime);
}

/** Stops listening before the component leaves play. */
void UDojoS6SenseMemoryComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Watch(nullptr);
	Super::EndPlay(EndPlayReason);
}

/** Saves Location as the newest clue, stamped with the current time. */
void UDojoS6SenseMemoryComponent::SetClue(const FVector& Location)
{
	bHasClue = true;
	ClueLocation = Location;
	ClueTime = Now();
}

/** The world's time in seconds, or zero outside a world. */
double UDojoS6SenseMemoryComponent::Now() const
{
	const UWorld* World = GetWorld();
	return World != nullptr ? World->GetTimeSeconds() : 0.0;
}
