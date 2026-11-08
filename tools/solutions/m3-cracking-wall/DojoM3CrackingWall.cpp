#include "DojoM3CrackingWall.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM3CrackingWall::ADojoM3CrackingWall()
{
	PrimaryActorTick.bCanEverTick = false;

	Box = CreateDefaultSubobject<UBoxComponent>(TEXT("Box"));
	Box->SetBoxExtent(FVector(300.f, 20.f, 200.f));
	Box->SetCollisionProfileName(TEXT("BlockAll"));
	RootComponent = Box;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Box);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 250.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM3CrackingWall::BeginPlay()
{
	Super::BeginPlay();

	Box->OnComponentHit.AddDynamic(this, &ADojoM3CrackingWall::HandleBoxHit);

	RefreshLabel();
}

int32 ADojoM3CrackingWall::GetCracks() const
{
	return Cracks;
}

bool ADojoM3CrackingWall::IsBroken() const
{
	return bBroken;
}

void ADojoM3CrackingWall::HandleBoxHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit)
{
	if (bBroken)
	{
		return;
	}

	Cracks++;

	if (Cracks >= HitsToBreak)
	{
		bBroken = true;
		Box->SetCollisionResponseToAllChannels(ECR_Overlap);
	}

	RefreshLabel();
}

void ADojoM3CrackingWall::RefreshLabel()
{
	const FString Text = bBroken ? FString(TEXT("BROKEN")) : FString::Printf(TEXT("CRACKS %d / %d"), Cracks, HitsToBreak);
	Label->SetText(FText::FromString(Text));
}
