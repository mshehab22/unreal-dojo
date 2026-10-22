#include "DojoP8TrapBase.h"

#include "Components/TextRenderComponent.h"
#include "DojoP8Fighter.h"
#include "EngineUtils.h"
#include "TimerManager.h"

ADojoP8TrapBase::ADojoP8TrapBase()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8TrapBase::Spring()
{
	if (bCoolingDown) return;

	Trigger();

	bCoolingDown = true;
	GetWorldTimerManager().SetTimer(CooldownTimer, this, &ADojoP8TrapBase::FinishCooldown, CooldownSeconds, false);
}

void ADojoP8TrapBase::FinishCooldown()
{
	bCoolingDown = false;
	GetWorldTimerManager().ClearTimer(CooldownTimer);
}

bool ADojoP8TrapBase::IsCoolingDown() const
{
	return bCoolingDown;
}

const TArray<FName>& ADojoP8TrapBase::GetCueLog() const
{
	return CueLog;
}

int32 ADojoP8TrapBase::DamageFightersInRadius(float Radius, float Amount)
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

void ADojoP8TrapBase::PushFightersAway(float Radius, float Distance)
{
	for (TActorIterator<ADojoP8Fighter> It(GetWorld()); It; ++It)
	{
		ADojoP8Fighter* Fighter = *It;
		if (!IsValid(Fighter) || Fighter->IsDown()) continue;

		const FVector Offset = Fighter->GetActorLocation() - GetActorLocation();
		if (Offset.Size() > Radius) continue;

		const FVector Direction = Offset.GetSafeNormal2D();
		Fighter->SetActorLocation(Fighter->GetActorLocation() + Direction * Distance);
	}
}

void ADojoP8TrapBase::PlayCue(FName Cue)
{
	CueLog.Add(Cue);
	Label->SetText(FText::FromName(Cue));
}
