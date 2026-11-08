#include "DojoS5Hatch.h"

#include "Components/SceneComponent.h"

ADojoS5Hatch::ADojoS5Hatch()
{
	PrimaryActorTick.bCanEverTick = false;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;
}

bool ADojoS5Hatch::IsOutOfSight(const AActor* Viewer) const
{
	if (Viewer == nullptr)
	{
		return true;
	}

	const FVector ToHatch = GetActorLocation() - Viewer->GetActorLocation();

	if (ToHatch.Size() < MinDistance)
	{
		return false;
	}

	const float Facing = FVector::DotProduct(Viewer->GetActorForwardVector(), ToHatch.GetSafeNormal());

	return Facing < FMath::Cos(FMath::DegreesToRadians(ViewHalfAngle));
}
