#include "DojoP22SpikeTrap.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/p22-hit-feedback/DojoP22HitFeedback.h"

ADojoP22SpikeTrap::ADojoP22SpikeTrap()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP22SpikeTrap::Spring(AActor* Victim, float Damage)
{
	++Springs;
	if (!IsValid(Victim)) return;

	if (UDojoP22HitFeedback* Feedback = GetWorld()->GetSubsystem<UDojoP22HitFeedback>())
	{
		Feedback->PlayHitFeedback(Victim->GetActorLocation(), Damage);
	}
}

int32 ADojoP22SpikeTrap::GetSprings() const
{
	return Springs;
}
