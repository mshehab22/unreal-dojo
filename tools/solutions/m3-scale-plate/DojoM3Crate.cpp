#include "DojoM3Crate.h"

#include "Components/BoxComponent.h"
#include "Components/SphereComponent.h"

ADojoM3Crate::ADojoM3Crate()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	Body->SetBoxExtent(FVector(40.f, 40.f, 40.f));
	Body->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Body;

	Handle = CreateDefaultSubobject<USphereComponent>(TEXT("Handle"));
	Handle->SetupAttachment(Body);
	Handle->SetRelativeLocation(FVector(0.f, 0.f, 50.f));
	Handle->SetSphereRadius(20.f);
	Handle->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
}

void ADojoM3Crate::BeginPlay()
{
	Super::BeginPlay();

	Home = GetActorLocation();
}

FVector ADojoM3Crate::GetHome() const
{
	return Home;
}

void ADojoM3Crate::ReturnHome()
{
	SetActorLocation(Home, false, nullptr, ETeleportType::TeleportPhysics);
	Returns++;
}

int32 ADojoM3Crate::GetReturns() const
{
	return Returns;
}
