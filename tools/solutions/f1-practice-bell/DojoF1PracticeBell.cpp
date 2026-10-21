#include "DojoF1PracticeBell.h"

#include "Components/TextRenderComponent.h"
#include "Dojo.h"

ADojoF1PracticeBell::ADojoF1PracticeBell()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF1PracticeBell::Strike(float Force)
{
	if (Force < MinimumForce) return;

	RingCount++;
	LastVolume = FMath::Clamp(Force / FullVolumeForce, 0.f, 1.f);

	Ring(LastVolume);
}

int32 ADojoF1PracticeBell::GetRingCount() const
{
	return RingCount;
}

float ADojoF1PracticeBell::GetLastVolume() const
{
	return LastVolume;
}

void ADojoF1PracticeBell::Ring_Implementation(float Volume)
{
	Label->SetText(FText::Format(FText::FromString(TEXT("DONG {0}")), FText::AsPercent(Volume)));
	UE_LOG(LogDojo, Log, TEXT("%s rang at volume %.2f"), *GetName(), Volume);
}
