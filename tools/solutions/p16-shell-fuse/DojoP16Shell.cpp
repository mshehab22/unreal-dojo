#include "DojoP16Shell.h"

#include "Components/SphereComponent.h"
#include "TimerManager.h"

ADojoP16Shell::ADojoP16Shell()
{
	PrimaryActorTick.bCanEverTick = true;

	Body = CreateDefaultSubobject<USphereComponent>(TEXT("Body"));
	Body->InitSphereRadius(30.f);
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Body;
}

bool ADojoP16Shell::Fire(float FuseSeconds)
{
	if (bResting || bFlying) return false;

	bFlying = true;
	bBurst = false;
	GetWorldTimerManager().SetTimer(FuseTimer, this, &ADojoP16Shell::Burst, FuseSeconds, false);
	return true;
}

void ADojoP16Shell::RestInPool()
{
	// A destroyed shell's pending fuse would never fire, but a resting shell is alive, so the fuse is put out by hand.
	GetWorldTimerManager().ClearTimer(FuseTimer);

	bResting = true;
	bFlying = false;
	bBurst = false;

	SetActorHiddenInGame(true);
	SetActorEnableCollision(false);
	SetActorTickEnabled(false);
}

void ADojoP16Shell::WakeFromPool(const FVector& Where)
{
	bResting = false;
	bFlying = false;
	bBurst = false;

	SetActorLocation(Where);
	SetActorHiddenInGame(false);
	SetActorEnableCollision(true);
	SetActorTickEnabled(true);
}

bool ADojoP16Shell::IsResting() const
{
	return bResting;
}

bool ADojoP16Shell::IsFlying() const
{
	return bFlying;
}

bool ADojoP16Shell::HasBurst() const
{
	return bBurst;
}

void ADojoP16Shell::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bFlying) return;

	AddActorWorldOffset(FVector(0.f, 0.f, RiseSpeed * DeltaSeconds));
}

void ADojoP16Shell::Burst()
{
	bFlying = false;
	bBurst = true;
}
