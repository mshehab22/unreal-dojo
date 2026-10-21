#include "DojoP1PracticeLever.h"

#include "Components/TextRenderComponent.h"

ADojoP1PracticeLever::ADojoP1PracticeLever()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1PracticeLever::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP1PracticeLever::Pull()
{
	PullCount++;
	RefreshLabel();

	OnPulled.Broadcast(this, PullCount);
}

int32 ADojoP1PracticeLever::GetPullCount() const
{
	return PullCount;
}

void ADojoP1PracticeLever::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Pulled %d"), PullCount)));
}
