#include "DojoM3Checkpoint.h"

#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"
#include "DojoM3Runner.h"

ADojoM3Checkpoint::ADojoM3Checkpoint()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<USphereComponent>(TEXT("Zone"));
	Zone->SetSphereRadius(120.f);
	Zone->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	Zone->SetCollisionResponseToAllChannels(ECR_Ignore);
	Zone->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
	RootComponent = Zone;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Zone);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 150.f));
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("FLAG")));
}

void ADojoM3Checkpoint::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM3Checkpoint::HandleZoneBeginOverlap);
}

bool ADojoM3Checkpoint::IsReached() const
{
	return bReached;
}

void ADojoM3Checkpoint::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	ADojoM3Runner* Runner = Cast<ADojoM3Runner>(OtherActor);
	if (!Runner)
	{
		return;
	}

	Runner->SetRespawnPoint(GetActorLocation());
	bReached = true;
	Label->SetText(FText::FromString(TEXT("REACHED")));
}
