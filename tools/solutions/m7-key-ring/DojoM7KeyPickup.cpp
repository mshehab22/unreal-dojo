#include "DojoM7KeyPickup.h"

#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"
#include "DojoM7KeyRing.h"

ADojoM7KeyPickup::ADojoM7KeyPickup()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<USphereComponent>(TEXT("Zone"));
	Zone->SetSphereRadius(60.f);
	Zone->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Zone;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Zone);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 90.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM7KeyPickup::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM7KeyPickup::HandleZoneBeginOverlap);
	Label->SetText(FText::FromName(KeyId));
}

bool ADojoM7KeyPickup::IsTaken() const
{
	return bTaken;
}

void ADojoM7KeyPickup::ResetPickup()
{
	bTaken = false;
	SetActorHiddenInGame(false);
	Zone->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
}

void ADojoM7KeyPickup::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (bTaken || !IsValid(OtherActor)) return;

	UDojoM7KeyRing* Ring = OtherActor->FindComponentByClass<UDojoM7KeyRing>();
	if (!Ring || !Ring->AddKey(KeyId)) return;

	bTaken = true;
	SetActorHiddenInGame(true);
	Zone->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}
