#include "DojoP10Weapon.h"

#include "Components/TextRenderComponent.h"
#include "DojoP10WeaponKind.h"

ADojoP10Weapon::ADojoP10Weapon()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP10Weapon::BeginPlay()
{
	Super::BeginPlay();

	Durability = Kind ? Kind->MaxDurability : 0.f;
	Label->SetText(Kind ? Kind->DisplayName : FText::FromString(TEXT("No kind")));
}

float ADojoP10Weapon::Swing()
{
	if (!Kind || Durability <= 0.f) return 0.f;

	const float Dealt = IsWorn() ? Kind->Damage * Kind->WornDamageScale : Kind->Damage;
	Durability = FMath::Max(0.f, Durability - Kind->WearPerSwing);
	return Dealt;
}

float ADojoP10Weapon::GetDurability() const
{
	return Durability;
}

bool ADojoP10Weapon::IsWorn() const
{
	return Kind && Durability <= Kind->MaxDurability * Kind->WornBelowShare;
}
