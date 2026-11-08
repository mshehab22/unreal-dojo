#include "DojoM7SignalPlate.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM7SignalPlate::ADojoM7SignalPlate()
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

void ADojoM7SignalPlate::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM7SignalPlate::HandleZoneBeginOverlap);
	Zone->OnComponentEndOverlap.AddDynamic(this, &ADojoM7SignalPlate::HandleZoneEndOverlap);
	Recount();
}

bool ADojoM7SignalPlate::IsPressed() const
{
	return Count > 0;
}

int32 ADojoM7SignalPlate::GetCount() const
{
	return Count;
}

void ADojoM7SignalPlate::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	Recount();
}

void ADojoM7SignalPlate::HandleZoneEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex)
{
	Recount();
}

void ADojoM7SignalPlate::Recount()
{
	const bool bWasPressed = IsPressed();
	Count = CountThingsOnZone();
	Label->SetText(FText::AsNumber(Count));
	if (bWasPressed == IsPressed()) return;
	if (IsPressed()) OnPlatePressed.Broadcast(this);
	else OnPlateReleased.Broadcast(this);
}

int32 ADojoM7SignalPlate::CountThingsOnZone()
{
	TArray<AActor*> OnPlate;
	Zone->GetOverlappingActors(OnPlate);
	OnPlate.Remove(this);
	return OnPlate.Num();
}
