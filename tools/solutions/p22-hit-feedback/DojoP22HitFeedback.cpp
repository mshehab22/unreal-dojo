#include "DojoP22HitFeedback.h"

#include "DojoP22HudTicker.h"
#include "DojoP22SoundDesk.h"
#include "DojoP22SparkPool.h"
#include "Subsystems/SubsystemCollection.h"

void UDojoP22HitFeedback::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	Sound = Collection.InitializeDependency<UDojoP22SoundDesk>();
	Sparks = Collection.InitializeDependency<UDojoP22SparkPool>();
	Hud = Collection.InitializeDependency<UDojoP22HudTicker>();

	if (Sound) Sound->SetBusVolume(EffectsVolume);
}

void UDojoP22HitFeedback::PlayHitFeedback(FVector Where, float Damage)
{
	if (Damage <= 0.f || !Sound || !Sparks || !Hud) return;

	const bool bHeavy = Damage >= HeavyDamage;
	Sound->PlayCue(Sound->FindCue(bHeavy ? FName(TEXT("HeavyHit")) : FName(TEXT("Hit"))), Where);

	const int32 Count = FMath::Clamp(FMath::RoundToInt32(Damage / DamagePerSpark), 2, UDojoP22SparkPool::Capacity);
	const int32 Ticket = Sparks->Reserve(Count);
	if (Ticket != INDEX_NONE) Sparks->Fire(Ticket, Where, FVector::UpVector);

	Hud->PushLine(FString::Printf(TEXT("-%d"), FMath::RoundToInt32(Damage)));
	if (bHeavy) Hud->FlashEdge(FLinearColor::Red);
}

void UDojoP22HitFeedback::PlayMissFeedback(FVector Where)
{
	if (!Sound) return;

	Sound->PlayCue(Sound->FindCue(TEXT("Miss")), Where);
}

void UDojoP22HitFeedback::SetHeavyDamage(float Damage)
{
	HeavyDamage = FMath::Max(Damage, 0.f);
}

float UDojoP22HitFeedback::GetHeavyDamage() const
{
	return HeavyDamage;
}
