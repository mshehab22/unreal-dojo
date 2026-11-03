#include "DojoM3Plate.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM3Plate::ADojoM3Plate()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<UBoxComponent>(TEXT("Zone"));
	Zone->SetBoxExtent(FVector(100.f, 100.f, 100.f));
	Zone->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Zone;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Zone);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 150.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM3Plate::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM3Plate::HandleZoneBeginOverlap);
	Zone->OnComponentEndOverlap.AddDynamic(this, &ADojoM3Plate::HandleZoneEndOverlap);
	RefreshLabel();
}

int32 ADojoM3Plate::GetCount() const
{
	return Count;
}

bool ADojoM3Plate::IsPressed() const
{
	return Count >= RequiredCount;
}

void ADojoM3Plate::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	Recount();
}

void ADojoM3Plate::HandleZoneEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex)
{
	Recount();
}

void ADojoM3Plate::Recount()
{
	TArray<AActor*> OnPlate;
	Zone->GetOverlappingActors(OnPlate);

	const int32 Previous = Count;
	Count = OnPlate.Num();
	RefreshLabel();

	if (Count != Previous)
	{
		OnCountChanged.Broadcast(Count);
	}
}

void ADojoM3Plate::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("%d / %d"), Count, RequiredCount)));
}
