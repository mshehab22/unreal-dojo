#include "DojoP8HazardBase.h"

#include "Components/TextRenderComponent.h"
#include "EngineUtils.h"
#include "Quests/p8-trap-family/DojoP8Fighter.h"
#include "TimerManager.h"

ADojoP8HazardBase::ADojoP8HazardBase()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8HazardBase::Unleash()
{
	if (bCoolingDown) return;

	OnUnleash();

	bCoolingDown = true;
	GetWorldTimerManager().SetTimer(CooldownTimer, this, &ADojoP8HazardBase::FinishCooldown, CooldownSeconds, false);
}

void ADojoP8HazardBase::FinishCooldown()
{
	bCoolingDown = false;
	GetWorldTimerManager().ClearTimer(CooldownTimer);
}

bool ADojoP8HazardBase::IsCoolingDown() const
{
	return bCoolingDown;
}

FName ADojoP8HazardBase::GetLastCue() const
{
	return LastCue;
}

int32 ADojoP8HazardBase::DamageFightersInRadius(float Radius, float Amount)
{
	int32 Hit = 0;

	for (TActorIterator<ADojoP8Fighter> It(GetWorld()); It; ++It)
	{
		ADojoP8Fighter* Fighter = *It;
		if (!IsValid(Fighter) || Fighter->IsDown()) continue;
		if (FVector::Dist(Fighter->GetActorLocation(), GetActorLocation()) > Radius) continue;

		Fighter->TakeHit(Amount);
		Hit++;
	}

	return Hit;
}

void ADojoP8HazardBase::PlayCue(FName Cue)
{
	LastCue = Cue;
	Label->SetText(FText::FromName(Cue));
}
