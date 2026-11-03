#include "DojoM8ExitGate.h"

#include "Components/BoxComponent.h"

ADojoM8ExitGate::ADojoM8ExitGate()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<UBoxComponent>(TEXT("Zone"));
	Zone->SetBoxExtent(FVector(150.f, 100.f, 150.f));
	Zone->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	Zone->SetCollisionResponseToAllChannels(ECR_Ignore);
	Zone->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
	RootComponent = Zone;
}

void ADojoM8ExitGate::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM8ExitGate::HandleZoneBeginOverlap);
}

void ADojoM8ExitGate::SetPowered(bool bNewPowered)
{
	bPowered = bNewPowered;
	if (!bPowered) return;

	TArray<AActor*> Inside;
	Zone->GetOverlappingActors(Inside);
	for (AActor* Candidate : Inside) LetOut(Candidate);
}

void ADojoM8ExitGate::Reset()
{
	bPowered = false;
	bEscaped = false;
}

bool ADojoM8ExitGate::IsPowered() const
{
	return bPowered;
}

bool ADojoM8ExitGate::HasEscaped() const
{
	return bEscaped;
}

void ADojoM8ExitGate::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	LetOut(OtherActor);
}

void ADojoM8ExitGate::LetOut(AActor* Candidate)
{
	if (!bPowered || bEscaped || !IsValid(Candidate)) return;

	bEscaped = true;
	OnEscaped.Broadcast(Candidate);
}
