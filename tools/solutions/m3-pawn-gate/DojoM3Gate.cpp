#include "DojoM3Gate.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM3Gate::ADojoM3Gate()
{
	PrimaryActorTick.bCanEverTick = false;

	Box = CreateDefaultSubobject<UBoxComponent>(TEXT("Box"));
	Box->SetBoxExtent(FVector(40.f, 300.f, 200.f));
	Box->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Box;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Box);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 250.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM3Gate::BeginPlay()
{
	Super::BeginPlay();

	Box->OnComponentEndOverlap.AddDynamic(this, &ADojoM3Gate::HandleBoxEndOverlap);
	RefreshLabel();
}

void ADojoM3Gate::Open()
{
	bOpen = true;
	Box->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
	RefreshLabel();
}

void ADojoM3Gate::Close()
{
	bOpen = false;
	RefreshLabel();
	ShutIfClear();
}

bool ADojoM3Gate::IsOpen() const
{
	return bOpen;
}

bool ADojoM3Gate::IsBlockingPawns() const
{
	return Box->GetCollisionResponseToChannel(ECC_Pawn) == ECR_Block;
}

void ADojoM3Gate::HandleBoxEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex)
{
	ShutIfClear();
}

bool ADojoM3Gate::HasPawnInside() const
{
	TArray<UPrimitiveComponent*> Inside;
	Box->GetOverlappingComponents(Inside);

	for (const UPrimitiveComponent* Shape : Inside)
	{
		if (Shape->GetCollisionObjectType() == ECC_Pawn)
		{
			return true;
		}
	}

	return false;
}

void ADojoM3Gate::ShutIfClear()
{
	if (bOpen || HasPawnInside())
	{
		return;
	}

	Box->SetCollisionResponseToChannel(ECC_Pawn, ECR_Block);
	RefreshLabel();
}

void ADojoM3Gate::RefreshLabel()
{
	const TCHAR* Text = bOpen ? TEXT("OPEN") : (IsBlockingPawns() ? TEXT("SHUT") : TEXT("CLEARING"));
	Label->SetText(FText::FromString(Text));
}
