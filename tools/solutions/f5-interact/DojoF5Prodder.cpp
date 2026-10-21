#include "DojoF5Prodder.h"

#include "Components/SceneComponent.h"
#include "DojoF5Interactable.h"

ADojoF5Prodder::ADojoF5Prodder()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

bool ADojoF5Prodder::Prod(AActor* Target)
{
	if (!IsValid(Target) || !Target->Implements<UDojoF5Interactable>()) return false;

	ReachedCount++;
	return IDojoF5Interactable::Execute_Interact(Target, this);
}

int32 ADojoF5Prodder::GetReachedCount() const
{
	return ReachedCount;
}
