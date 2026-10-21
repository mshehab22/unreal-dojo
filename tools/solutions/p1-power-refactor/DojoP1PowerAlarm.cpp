#include "DojoP1PowerAlarm.h"

#include "Components/TextRenderComponent.h"
#include "DojoP1Generator.h"

ADojoP1PowerAlarm::ADojoP1PowerAlarm()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1PowerAlarm::BeginPlay()
{
	Super::BeginPlay();

	ConnectTo(Generator);
	RefreshLabel();
}

void ADojoP1PowerAlarm::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Disconnect();

	Super::EndPlay(EndPlayReason);
}

void ADojoP1PowerAlarm::ConnectTo(ADojoP1Generator* NewGenerator)
{
	if (!IsValid(NewGenerator)) return;

	if (ConnectedGenerator != NewGenerator) Disconnect();

	ConnectedGenerator = NewGenerator;
	ConnectedGenerator->OnPowerChanged.AddUniqueDynamic(this, &ADojoP1PowerAlarm::HandlePowerChanged);
}

void ADojoP1PowerAlarm::HandlePowerChanged(bool bRunning)
{
	if (!bRunning) Sound();
}

void ADojoP1PowerAlarm::Disconnect()
{
	if (IsValid(ConnectedGenerator)) ConnectedGenerator->OnPowerChanged.RemoveDynamic(this, &ADojoP1PowerAlarm::HandlePowerChanged);

	ConnectedGenerator = nullptr;
}

void ADojoP1PowerAlarm::Sound()
{
	TimesSounded++;
	RefreshLabel();
}

int32 ADojoP1PowerAlarm::GetTimesSounded() const
{
	return TimesSounded;
}

void ADojoP1PowerAlarm::RefreshLabel()
{
	const FString Text = TimesSounded == 0 ? FString(TEXT("Quiet")) : FString::Printf(TEXT("ALARM %d"), TimesSounded);
	Label->SetText(FText::FromString(Text));
}
