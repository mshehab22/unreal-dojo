#include "DojoM2Bumper.h"

#include "Components/SphereComponent.h"

ADojoM2Bumper::ADojoM2Bumper()
{
	PrimaryActorTick.bCanEverTick = true;

	Ball = CreateDefaultSubobject<USphereComponent>(TEXT("Ball"));
	Ball->SetSphereRadius(40.f);
	Ball->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Ball;
}

void ADojoM2Bumper::BeginPlay()
{
	Super::BeginPlay();

	Heading = Heading.GetSafeNormal();
}

int32 ADojoM2Bumper::GetBounces() const
{
	return Bounces;
}

void ADojoM2Bumper::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	FHitResult Hit;
	AddActorWorldOffset(Heading * Speed * DeltaSeconds, true, &Hit);

	if (Hit.IsValidBlockingHit())
	{
		Heading = Heading.MirrorByVector(Hit.ImpactNormal).GetSafeNormal();
		Bounces++;
	}
}
