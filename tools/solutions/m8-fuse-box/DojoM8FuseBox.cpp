#include "DojoM8FuseBox.h"

#include "Components/SceneComponent.h"
#include "DojoM8Fuse.h"

ADojoM8FuseBox::ADojoM8FuseBox()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM8FuseBox::Watch(ADojoM8Fuse* Fuse)
{
	if (!IsValid(Fuse)) return;

	Fuse->OnCollected.AddUniqueDynamic(this, &ADojoM8FuseBox::HandleCollected);
}

void ADojoM8FuseBox::StartOver()
{
	Collected = 0;
	bPowered = false;
}

int32 ADojoM8FuseBox::GetCollected() const
{
	return Collected;
}

bool ADojoM8FuseBox::IsPowered() const
{
	return bPowered;
}

void ADojoM8FuseBox::HandleCollected(ADojoM8Fuse* Fuse, AActor* Collector)
{
	Collected++;
	if (bPowered || Collected < RequiredFuses) return;

	bPowered = true;
	OnPowered.Broadcast();
}
