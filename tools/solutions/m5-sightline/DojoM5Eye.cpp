#include "DojoM5Eye.h"

#include "CollisionQueryParams.h"
#include "Components/ArrowComponent.h"
#include "Components/BoxComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/EngineTypes.h"
#include "Engine/HitResult.h"
#include "Engine/World.h"

ADojoM5Eye::ADojoM5Eye()
{
	PrimaryActorTick.bCanEverTick = false;

	UBoxComponent* Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	Body->SetBoxExtent(FVector(30.f, 30.f, 30.f));
	Body->SetCollisionProfileName(TEXT("BlockAll"));
	RootComponent = Body;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Body);
}

bool ADojoM5Eye::CanSee(const AActor* Candidate)
{
	Blocker = nullptr;

	if (!IsValid(Candidate)) return false;

	const FVector Start = GetActorLocation();
	const FVector Goal = Candidate->GetActorLocation();
	const FVector Toward = Goal - Start;
	if (Toward.Size() > Range) return false;

	// The dot product of two unit vectors is the cosine of the angle between them, so a smaller cosine means a wider angle.
	const float CosineLimit = FMath::Cos(FMath::DegreesToRadians(HalfAngleDegrees));
	if (FVector::DotProduct(GetActorForwardVector(), Toward.GetSafeNormal()) < CosineLimit) return false;

	// Ask by what things are rather than by how they answer one channel: a shape can be set to ignore a channel and still be solid.
	FCollisionObjectQueryParams Objects;
	Objects.AddObjectTypesToQuery(ECC_WorldStatic);
	Objects.AddObjectTypesToQuery(ECC_WorldDynamic);
	Objects.AddObjectTypesToQuery(ECC_Pawn);

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);

	FHitResult Hit;
	const bool bBlocked = GetWorld()->LineTraceSingleByObjectType(Hit, Start, Goal, Objects, Params);
	const bool bSeen = bBlocked && Hit.GetActor() == Candidate;

	if (bBlocked && !bSeen) Blocker = Hit.GetActor();

	DrawDebugLine(GetWorld(), Start, bBlocked ? Hit.ImpactPoint : Goal, bSeen ? FColor::Green : FColor::Red, false, 0.5f);
	return bSeen;
}

AActor* ADojoM5Eye::GetBlocker() const
{
	return Blocker.Get();
}
