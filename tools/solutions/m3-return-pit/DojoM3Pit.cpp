#include "DojoM3Pit.h"

#include "Components/BoxComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"

ADojoM3Pit::ADojoM3Pit()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<UBoxComponent>(TEXT("Zone"));
	Zone->SetBoxExtent(FVector(150.f, 150.f, 100.f));
	Zone->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Zone;
}

void ADojoM3Pit::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM3Pit::HandleZoneBeginOverlap);
}

int32 ADojoM3Pit::GetCatches() const
{
	return Catches;
}

void ADojoM3Pit::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (ADojoM3Runner* Runner = Cast<ADojoM3Runner>(OtherActor))
	{
		Catches++;
		Runner->Respawn();
	}
	else if (ADojoM3Crate* Crate = Cast<ADojoM3Crate>(OtherActor))
	{
		Catches++;
		Crate->ReturnHome();
	}
}
