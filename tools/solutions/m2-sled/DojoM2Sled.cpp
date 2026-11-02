#include "DojoM2Sled.h"

#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"

ADojoM2Sled::ADojoM2Sled()
{
	PrimaryActorTick.bCanEverTick = true;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

float ADojoM2Sled::GetDistanceTravelled() const
{
	return DistanceTravelled;
}

void ADojoM2Sled::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	const FVector Step = Direction.GetSafeNormal() * Speed * DeltaSeconds;

	if (bLocalSpace)
	{
		AddActorLocalOffset(Step);
	}
	else
	{
		AddActorWorldOffset(Step);
	}

	DistanceTravelled += Step.Size();
}
