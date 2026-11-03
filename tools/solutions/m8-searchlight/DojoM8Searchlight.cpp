#include "DojoM8Searchlight.h"

#include "CollisionQueryParams.h"
#include "Components/SceneComponent.h"
#include "Engine/World.h"

ADojoM8Searchlight::ADojoM8Searchlight()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM8Searchlight::Watch(AActor* NewTarget)
{
	Watched = NewTarget;
	bSeeing = false;
}

bool ADojoM8Searchlight::IsSeeing() const
{
	return bSeeing;
}

bool ADojoM8Searchlight::CanSee(const AActor* Candidate) const
{
	return IsValid(Candidate) && IsInsideCone(Candidate->GetActorLocation()) && HasClearLine(Candidate);
}

void ADojoM8Searchlight::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	AddActorWorldRotation(FRotator(0.f, SweepDegreesPerSecond * DeltaSeconds, 0.f));

	const bool bNowSeeing = CanSee(Watched.Get());
	if (bNowSeeing == bSeeing) return;

	bSeeing = bNowSeeing;
	OnSightChanged.Broadcast(this, bSeeing);
}

bool ADojoM8Searchlight::IsInsideCone(const FVector& TargetLocation) const
{
	const FVector ToTarget = TargetLocation - GetActorLocation();
	if (ToTarget.SizeSquared() > FMath::Square(ViewRange)) return false;

	const FVector Flat = ToTarget.GetSafeNormal2D();
	if (Flat.IsNearlyZero()) return true;

	const double Cosine = FVector::DotProduct(GetActorForwardVector().GetSafeNormal2D(), Flat);
	return Cosine >= FMath::Cos(FMath::DegreesToRadians(ViewHalfAngleDegrees));
}

bool ADojoM8Searchlight::HasClearLine(const AActor* Candidate) const
{
	FCollisionQueryParams Params(TEXT("DojoM8Sight"), false, this);
	Params.AddIgnoredActor(Candidate);

	FHitResult Hit;
	return !GetWorld()->LineTraceSingleByChannel(Hit, GetActorLocation(), Candidate->GetActorLocation(), ECC_Visibility, Params);
}
