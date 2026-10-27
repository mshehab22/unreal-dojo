#include "DojoP10Lantern.h"

#include "Components/TextRenderComponent.h"
#include "DojoP10LanternKind.h"

ADojoP10Lantern::ADojoP10Lantern()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP10Lantern::BeginPlay()
{
	Super::BeginPlay();

	Refuel();
}

bool ADojoP10Lantern::Light()
{
	if (FuelLeft > 0.f) bLit = true;

	RefreshLabel();
	return bLit;
}

void ADojoP10Lantern::Refuel()
{
	FuelLeft = GetKind()->FuelSeconds;
	RefreshLabel();
}

bool ADojoP10Lantern::IsLit() const
{
	return bLit;
}

float ADojoP10Lantern::GetFuelLeft() const
{
	return FuelLeft;
}

void ADojoP10Lantern::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bLit) return;

	FuelLeft = FMath::Max(0.f, FuelLeft - DeltaSeconds);
	if (FuelLeft > 0.f) return;

	bLit = false;
	RefreshLabel();
}

const UDojoP10LanternKind* ADojoP10Lantern::GetKind() const
{
	return Kind ? Kind.Get() : GetDefault<UDojoP10LanternKind>();
}

void ADojoP10Lantern::RefreshLabel()
{
	const UDojoP10LanternKind* Current = GetKind();
	Label->SetText(Current->DisplayName);
	Label->SetTextRenderColor(bLit ? Current->GlowColor : FColor::Silver);
}
