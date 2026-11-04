#include "DojoM8Fuse.h"

#include "Components/SphereComponent.h"

ADojoM8Fuse::ADojoM8Fuse()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<USphereComponent>(TEXT("Zone"));
	Zone->SetSphereRadius(80.f);
	Zone->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	Zone->SetCollisionResponseToAllChannels(ECR_Ignore);
	Zone->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
	RootComponent = Zone;
}

void ADojoM8Fuse::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM8Fuse::HandleZoneBeginOverlap);
}

bool ADojoM8Fuse::Collect(AActor* Collector)
{
	if (bCollected) return false;

	bCollected = true;
	OnCollected.Broadcast(this, Collector);
	Destroy();
	return true;
}

bool ADojoM8Fuse::IsCollected() const
{
	return bCollected;
}

void ADojoM8Fuse::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (!IsValid(OtherActor)) return;

	Collect(OtherActor);
}
