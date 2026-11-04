#include "DojoP16Water.h"

#include "Components/SceneComponent.h"
#include "DojoP16Ripple.h"
#include "Engine/World.h"

ADojoP16Water::ADojoP16Water()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP16Water::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoP16Ripple* Ripple : Ripples)
	{
		if (IsValid(Ripple)) Ripple->Destroy();
	}

	Ripples.Empty();

	Super::EndPlay(EndPlayReason);
}

ADojoP16Ripple* ADojoP16Water::Splash(const FVector& Where)
{
	ADojoP16Ripple* Ripple = TakeRipple();
	if (!Ripple) return nullptr;

	// The ripple shown now goes last, so the array stays in the order the ripples were shown.
	Ripples.Remove(Ripple);
	Ripples.Add(Ripple);

	Ripple->Show(Where, RippleSeconds);
	return Ripple;
}

int32 ADojoP16Water::GetShowingCount() const
{
	int32 Count = 0;
	for (const ADojoP16Ripple* Ripple : Ripples)
	{
		if (IsValid(Ripple) && Ripple->IsShowing()) Count++;
	}
	return Count;
}

ADojoP16Ripple* ADojoP16Water::TakeRipple()
{
	for (ADojoP16Ripple* Ripple : Ripples)
	{
		if (IsValid(Ripple) && !Ripple->IsShowing()) return Ripple;
	}

	if (Ripples.Num() < MaxRipples)
	{
		ADojoP16Ripple* Ripple = GetWorld()->SpawnActor<ADojoP16Ripple>(ADojoP16Ripple::StaticClass(), GetActorLocation(), FRotator::ZeroRotator);
		if (Ripple) Ripples.Add(Ripple);
		return Ripple;
	}

	// Every ripple shows; the first in the array has shown longest.
	for (ADojoP16Ripple* Ripple : Ripples)
	{
		if (IsValid(Ripple)) return Ripple;
	}
	return nullptr;
}
