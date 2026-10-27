#include "DojoM2Patrol.h"

#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"

ADojoM2Patrol::ADojoM2Patrol()
{
	PrimaryActorTick.bCanEverTick = true;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

void ADojoM2Patrol::BeginPlay()
{
	Super::BeginPlay();

	StartLocation = GetActorLocation();
	PathDirection = GetActorForwardVector();
}

float ADojoM2Patrol::GetOffsetAlongPath() const
{
	return Offset;
}

int32 ADojoM2Patrol::GetEndsReached() const
{
	return EndsReached;
}

void ADojoM2Patrol::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	float Remaining = Speed * DeltaSeconds;

	// A long frame can cross an end, so spend the movement leg by leg; what is left after an end goes the other way.
	while (Remaining > 0.f && TravelDistance > 0.f)
	{
		const float RoomAhead = bOutbound ? TravelDistance - Offset : Offset;
		const float Move = FMath::Min(Remaining, RoomAhead);

		Offset += bOutbound ? Move : -Move;
		Remaining -= Move;

		if (Move >= RoomAhead)
		{
			bOutbound = !bOutbound;
			EndsReached++;
		}
	}

	SetActorLocation(StartLocation + PathDirection * Offset);
}
