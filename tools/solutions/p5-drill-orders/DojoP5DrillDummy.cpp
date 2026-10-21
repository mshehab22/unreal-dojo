#include "DojoP5DrillDummy.h"

#include "Components/TextRenderComponent.h"

ADojoP5DrillDummy::ADojoP5DrillDummy()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP5DrillDummy::BeginPlay()
{
	Super::BeginPlay();

	MiddleLocation = GetActorLocation();
	Refresh();
}

void ADojoP5DrillDummy::Step(int32 Direction)
{
	Lane = FMath::Clamp(Lane + FMath::Sign(Direction), 0, 2);
	Refresh();
}

void ADojoP5DrillDummy::Block()
{
	Blocks++;
	Refresh();
}

int32 ADojoP5DrillDummy::GetLane() const
{
	return Lane;
}

int32 ADojoP5DrillDummy::GetBlocks() const
{
	return Blocks;
}

void ADojoP5DrillDummy::Refresh()
{
	SetActorLocation(MiddleLocation + FVector(0.f, (Lane - 1) * 150.f, 0.f));
	Label->SetText(FText::FromString(FString::Printf(TEXT("Lane %d, blocks %d"), Lane, Blocks)));
}
