#include "DojoF2Spotter.h"

#include "Components/TextRenderComponent.h"

ADojoF2Spotter::ADojoF2Spotter()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF2Spotter::Watch(AActor* Target)
{
	Watched = Target;
}

bool ADojoF2Spotter::HasTarget() const
{
	return Watched.IsValid();
}

AActor* ADojoF2Spotter::GetTarget() const
{
	return Watched.Get();
}

void ADojoF2Spotter::Report()
{
	const FString Text = HasTarget() ? FString::Printf(TEXT("TRACKING %s"), *Watched->GetName()) : FString(TEXT("LOST"));
	Label->SetText(FText::FromString(Text));
}
