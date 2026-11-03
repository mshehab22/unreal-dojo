#include "DojoM3Runner.h"

#include "Components/SphereComponent.h"

ADojoM3Runner::ADojoM3Runner()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<USphereComponent>(TEXT("Body"));
	Body->SetSphereRadius(40.f);
	Body->SetCollisionProfileName(TEXT("Pawn"));
	RootComponent = Body;
}

void ADojoM3Runner::BeginPlay()
{
	Super::BeginPlay();

	RespawnPoint = GetActorLocation();
}

void ADojoM3Runner::SetRespawnPoint(const FVector& NewPoint)
{
	RespawnPoint = NewPoint;
}

FVector ADojoM3Runner::GetRespawnPoint() const
{
	return RespawnPoint;
}

void ADojoM3Runner::Respawn()
{
	SetActorLocation(RespawnPoint, false, nullptr, ETeleportType::TeleportPhysics);
	Respawns++;
}

int32 ADojoM3Runner::GetRespawns() const
{
	return Respawns;
}
