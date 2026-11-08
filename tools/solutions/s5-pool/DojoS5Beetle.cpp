#include "DojoS5Beetle.h"

#include "Components/TextRenderComponent.h"

ADojoS5Beetle::ADojoS5Beetle()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Body"));
	RootComponent = Body;
	Body->SetHorizontalAlignment(EHTA_Center);
	Body->SetText(FText::FromString(TEXT("beetle")));
}

void ADojoS5Beetle::Wake(const FVector& Location)
{
	SetActorLocation(Location);
	SetActorHiddenInGame(false);
	SetActorEnableCollision(true);
	bAwake = true;
}

void ADojoS5Beetle::Sleep()
{
	SetActorHiddenInGame(true);
	SetActorEnableCollision(false);
	bAwake = false;
}

void ADojoS5Beetle::Defeat()
{
	if (bAwake)
	{
		OnDefeated.Broadcast(this);
	}
}

bool ADojoS5Beetle::IsAwake() const
{
	return bAwake;
}
