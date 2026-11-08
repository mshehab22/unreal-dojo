#include "DojoP16Ripple.h"

#include "Components/SceneComponent.h"

ADojoP16Ripple::ADojoP16Ripple()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP16Ripple::Show(const FVector& Where, float Seconds)
{
	SetActorLocation(Where);
	SecondsLeft = Seconds;
	bShowing = true;

	SetActorHiddenInGame(false);
	SetActorTickEnabled(true);
}

bool ADojoP16Ripple::IsShowing() const
{
	return bShowing;
}

void ADojoP16Ripple::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bShowing) return;

	SecondsLeft -= DeltaSeconds;
	if (SecondsLeft > 0.f) return;

	Fade();
}

void ADojoP16Ripple::Fade()
{
	bShowing = false;

	SetActorHiddenInGame(true);
	SetActorTickEnabled(false);
}
