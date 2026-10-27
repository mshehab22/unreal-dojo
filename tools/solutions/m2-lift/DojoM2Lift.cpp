#include "DojoM2Lift.h"

#include "Components/TextRenderComponent.h"

ADojoM2Lift::ADojoM2Lift()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM2Lift::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

bool ADojoM2Lift::CallTo(int32 FloorIndex)
{
	if (bMoving || !FloorHeights.IsValidIndex(FloorIndex) || FloorIndex == CurrentFloor) return false;

	TargetFloor = FloorIndex;
	bMoving = true;
	SetActorTickEnabled(true);
	RefreshLabel();
	return true;
}

bool ADojoM2Lift::IsMoving() const
{
	return bMoving;
}

int32 ADojoM2Lift::GetCurrentFloor() const
{
	return CurrentFloor;
}

int32 ADojoM2Lift::GetTargetFloor() const
{
	return TargetFloor;
}

void ADojoM2Lift::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bMoving) return;

	const FVector Here = GetActorLocation();
	const FVector Goal(Here.X, Here.Y, FloorHeights[TargetFloor]);
	const FVector Next = FMath::VInterpTo(Here, Goal, DeltaSeconds, InterpSpeed);

	if (FVector::DistSquared(Next, Goal) > FMath::Square(ArriveTolerance))
	{
		SetActorLocation(Next);
		return;
	}

	SetActorLocation(Goal);
	CurrentFloor = TargetFloor;
	bMoving = false;
	SetActorTickEnabled(false);
	RefreshLabel();
}

void ADojoM2Lift::RefreshLabel()
{
	const FString Text = bMoving ? FString::Printf(TEXT("GOING TO %d"), TargetFloor) : FString::Printf(TEXT("FLOOR %d"), CurrentFloor);
	Label->SetText(FText::FromString(Text));
}
