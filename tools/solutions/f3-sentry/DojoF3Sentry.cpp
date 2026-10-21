#include "DojoF3Sentry.h"

#include "Components/TextRenderComponent.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"

ADojoF3Sentry::ADojoF3Sentry()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("IDLE")));
}

ADojoF1PopupTarget* ADojoF3Sentry::AimAtNearestRaised()
{
	const FVector Origin = GetActorLocation();
	const float MaxRangeSquared = FMath::Square(MaxRange);

	ADojoF1PopupTarget* Nearest = nullptr;
	float NearestSquared = MaxRangeSquared;

	for (ADojoF1PopupTarget* Target : Targets)
	{
		if (!IsValid(Target) || Target->GetState() != EDojoF1TargetState::ETS_Raised) continue;

		const float DistanceSquared = FVector::DistSquared(Origin, Target->GetActorLocation());
		if (DistanceSquared <= NearestSquared)
		{
			Nearest = Target;
			NearestSquared = DistanceSquared;
		}
	}

	if (Nearest) SetActorRotation(FRotator(0.f, GetYawTo(Nearest), 0.f));

	ShowAim(Nearest);
	return Nearest;
}

float ADojoF3Sentry::GetYawTo(const AActor* Target) const
{
	if (!IsValid(Target)) return GetActorRotation().Yaw;

	const FVector Flat = (Target->GetActorLocation() - GetActorLocation()) * FVector(1.f, 1.f, 0.f);
	return FMath::RadiansToDegrees(FMath::Atan2(Flat.Y, Flat.X));
}

void ADojoF3Sentry::ShowAim(const AActor* Target)
{
	const FString Text = Target ? FString::Printf(TEXT("AIM %s"), *Target->GetName()) : FString(TEXT("IDLE"));
	Label->SetText(FText::FromString(Text));
}
