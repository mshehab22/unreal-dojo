#include "DojoM5Rangefinder.h"

#include "Components/ArrowComponent.h"
#include "Components/BoxComponent.h"
#include "CollisionQueryParams.h"
#include "DrawDebugHelpers.h"
#include "Engine/EngineTypes.h"
#include "Engine/HitResult.h"
#include "Engine/World.h"

ADojoM5Rangefinder::ADojoM5Rangefinder()
{
	PrimaryActorTick.bCanEverTick = false;

	UBoxComponent* Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	Body->SetBoxExtent(FVector(20.f, 20.f, 20.f));
	Body->SetCollisionProfileName(TEXT("BlockAll"));
	RootComponent = Body;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Body);
}

void ADojoM5Rangefinder::Measure()
{
	const FVector Start = GetActorLocation(); // @explain: The ray starts at the rangefinder's own centre, inside its own box.
	const FVector End = Start + GetActorForwardVector() * Reach; // @explain: The end is a point Reach units straight ahead, along the way the actor faces.

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this); // @explain: The ray begins inside the rangefinder's own solid box, so without this it would report the rangefinder itself at distance zero.

	FHitResult Hit;
	const bool bFound = GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params); // @explain: It returns true when something blocks the Visibility channel on the line, and fills Hit with the first thing it met.

	bHasTarget = bFound;
	MeasuredDistance = bFound ? Hit.Distance : Reach;
	TargetActor = bFound ? Hit.GetActor() : nullptr;

	const FVector LineEnd = bFound ? Hit.ImpactPoint : End;
	const FColor LineColor = bFound ? FColor::Green : FColor::Red;
	DrawDebugLine(GetWorld(), Start, LineEnd, LineColor, false, 1.f);
}

bool ADojoM5Rangefinder::HasTarget() const
{
	return bHasTarget;
}

float ADojoM5Rangefinder::GetDistance() const
{
	return MeasuredDistance;
}

AActor* ADojoM5Rangefinder::GetTargetActor() const
{
	return TargetActor.Get();
}
