#include "DojoP2SwingingBlade.h"

#include "Components/SceneComponent.h"
#include "Components/TextRenderComponent.h"

ADojoP2SwingingBlade::ADojoP2SwingingBlade()
{
	PrimaryActorTick.bCanEverTick = true;

	Pivot = CreateDefaultSubobject<USceneComponent>(TEXT("Pivot"));
	RootComponent = Pivot;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Pivot);
	Label->SetRelativeLocation(FVector(0.f, 0.f, -150.f));
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("BLADE")));
}

void ADojoP2SwingingBlade::BeginPlay()
{
	Super::BeginPlay();

	Angle = StartAngle;
	PreviousAngle = StartAngle;
}

void ADojoP2SwingingBlade::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Advance(DeltaSeconds);
	SetActorRotation(FRotator(0.f, 0.f, GetDisplayAngle()));
}

void ADojoP2SwingingBlade::Advance(float DeltaSeconds)
{
	Lag += DeltaSeconds;

	while (Lag >= StepSeconds)
	{
		SimulateStep();
		Lag -= StepSeconds;
	}
}

void ADojoP2SwingingBlade::SimulateStep()
{
	PreviousAngle = Angle;

	AngularSpeed -= Stiffness * Angle * StepSeconds;
	AngularSpeed *= Damping;
	Angle += AngularSpeed * StepSeconds;

	StepsRun++;
}

float ADojoP2SwingingBlade::GetAngle() const
{
	return Angle;
}

int32 ADojoP2SwingingBlade::GetStepsRun() const
{
	return StepsRun;
}

float ADojoP2SwingingBlade::GetAlpha() const
{
	return Lag / StepSeconds;
}

float ADojoP2SwingingBlade::GetDisplayAngle() const
{
	return FMath::Lerp(PreviousAngle, Angle, GetAlpha());
}
