#include "DojoF6Target.h"

#include "Components/TextRenderComponent.h"

ADojoF6Target::ADojoF6Target()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF6Target::ApplyRow(FName RowName, const FDojoF6TargetRow& Row)
{
	Kind = RowName;
	Health = Row.Health;
	Points = Row.Points;
	ShowHealth();
}

bool ADojoF6Target::TakeShot(float Damage)
{
	if (Health <= 0.f || Damage <= 0.f) return false;

	Health = FMath::Max(Health - Damage, 0.f);
	ShowHealth();
	if (Health > 0.f) return false;

	Destroy();
	return true;
}

FName ADojoF6Target::GetKind() const
{
	return Kind;
}

float ADojoF6Target::GetHealth() const
{
	return Health;
}

int32 ADojoF6Target::GetPoints() const
{
	return Points;
}

void ADojoF6Target::ShowHealth()
{
	Label->SetText(FText::AsNumber(Health));
}
