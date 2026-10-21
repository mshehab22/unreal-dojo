#include "DojoP3PatrolDrone.h"

#include "Components/TextRenderComponent.h"

ADojoP3PatrolDrone::ADojoP3PatrolDrone()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP3PatrolDrone::BeginPlay()
{
	Super::BeginPlay();

	StartLocation = GetActorLocation();
	RefreshLabel();
}

void ADojoP3PatrolDrone::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Offset += Heading * Speed * DeltaSeconds;

	// A long frame can carry the drone past an end, even past both; fold the extra distance back until it is inside.
	while (Offset > PatrolLength || Offset < 0.f)
	{
		if (Offset > PatrolLength)
		{
			Offset = 2.f * PatrolLength - Offset;
			Heading = -1.f;
		}
		else
		{
			Offset = -Offset;
			Heading = 1.f;
		}
	}

	SetActorLocation(StartLocation + FVector(Offset, 0.f, 0.f));
	RefreshLabel();
}

float ADojoP3PatrolDrone::GetOffset() const
{
	return Offset;
}

float ADojoP3PatrolDrone::GetHeading() const
{
	return Heading;
}

void ADojoP3PatrolDrone::RefreshLabel()
{
	Label->SetText(FText::FromString(Heading > 0.f ? TEXT(">>") : TEXT("<<")));
}
