#include "DojoS3Runner.h"

#include "Components/SceneComponent.h"
#include "Quests/s3-saveable/DojoS3SaveableComponent.h"

ADojoS3Runner::ADojoS3Runner()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	Saveable = CreateDefaultSubobject<UDojoS3SaveableComponent>(TEXT("Saveable"));
}

void ADojoS3Runner::MoveTo(float NewSpot)
{
	Spot = NewSpot;
	SetActorLocation(FVector(Spot, 0.f, 0.f));
}

void ADojoS3Runner::AddCoins(int32 Amount)
{
	Coins += FMath::Max(0, Amount);
}

void ADojoS3Runner::ResetRun()
{
	Coins = 0;
	MoveTo(0.f);
}

float ADojoS3Runner::GetSpot() const
{
	return Spot;
}

int32 ADojoS3Runner::GetCoins() const
{
	return Coins;
}

void ADojoS3Runner::OnRestoredFromSave_Implementation()
{
	SetActorLocation(FVector(Spot, 0.f, 0.f));
}
