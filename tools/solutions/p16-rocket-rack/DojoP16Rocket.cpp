#include "DojoP16Rocket.h"

#include "Components/SphereComponent.h"

ADojoP16Rocket::ADojoP16Rocket()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = false;

	Body = CreateDefaultSubobject<USphereComponent>(TEXT("Body"));
	Body->InitSphereRadius(20.f);
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Body;
}

void ADojoP16Rocket::Launch(const FVector& LaunchVelocity, float FuseSeconds)
{
	Velocity = LaunchVelocity;
	FuseLeft = FuseSeconds;
	bFlying = true;
	bBurst = false;
}

void ADojoP16Rocket::ResetForLaunch()
{
	Velocity = FVector::ZeroVector;
	FuseLeft = 0.f;
	bFlying = false;
	bBurst = false;
}

bool ADojoP16Rocket::IsFlying() const
{
	return bFlying;
}

bool ADojoP16Rocket::HasBurst() const
{
	return bBurst;
}

void ADojoP16Rocket::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bFlying) return;

	AddActorWorldOffset(Velocity * DeltaSeconds);
	Velocity.Z -= Gravity * DeltaSeconds;

	FuseLeft -= DeltaSeconds;
	if (FuseLeft > 0.f) return;

	bFlying = false;
	bBurst = true;
}
