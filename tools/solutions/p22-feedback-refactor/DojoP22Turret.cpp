#include "DojoP22Turret.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/p22-hit-feedback/DojoP22HitFeedback.h"

ADojoP22Turret::ADojoP22Turret()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP22Turret::FireAt(AActor* Target, float Damage)
{
	++Shots;
	if (!IsValid(Target)) return;

	if (UDojoP22HitFeedback* Feedback = GetWorld()->GetSubsystem<UDojoP22HitFeedback>())
	{
		Feedback->PlayHitFeedback(Target->GetActorLocation(), Damage);
	}
}

void ADojoP22Turret::FireAndMiss(FVector Where)
{
	++Shots;

	if (UDojoP22HitFeedback* Feedback = GetWorld()->GetSubsystem<UDojoP22HitFeedback>())
	{
		Feedback->PlayMissFeedback(Where);
	}
}

int32 ADojoP22Turret::GetShots() const
{
	return Shots;
}
