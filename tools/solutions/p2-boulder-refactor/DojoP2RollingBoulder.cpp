#include "DojoP2RollingBoulder.h"

#include "Components/TextRenderComponent.h"

ADojoP2RollingBoulder::ADojoP2RollingBoulder()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP2RollingBoulder::BeginPlay()
{
	Super::BeginPlay();

	StartLocation = GetActorLocation();
	RefreshLabel();
}

void ADojoP2RollingBoulder::Push()
{
	Speed = PushSpeed;
}

void ADojoP2RollingBoulder::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!IsRolling()) return;

	Lag += DeltaSeconds;

	int32 StepsThisTick = 0;
	while (Lag >= StepSeconds && StepsThisTick < MaxStepsPerTick && IsRolling())
	{
		SimulateStep();
		Lag -= StepSeconds;
		StepsThisTick++;
	}

	// Time the cap refused, or time left once the boulder stopped, is dropped rather than carried into later frames.
	if (Lag >= StepSeconds || !IsRolling()) Lag = 0.f;

	SetActorLocation(StartLocation + FVector(Distance, 0.f, 0.f));
	RefreshLabel();
}

void ADojoP2RollingBoulder::SimulateStep()
{
	Speed *= Drag;
	if (Speed < MinSpeed) Speed = 0.f;

	Distance += Speed * StepSeconds;
}

float ADojoP2RollingBoulder::GetDistance() const
{
	return Distance;
}

bool ADojoP2RollingBoulder::IsRolling() const
{
	return Speed > 0.f;
}

void ADojoP2RollingBoulder::RefreshLabel()
{
	Label->SetText(FText::AsNumber(FMath::RoundToInt(Distance)));
}
