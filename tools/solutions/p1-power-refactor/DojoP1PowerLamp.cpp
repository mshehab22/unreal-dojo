#include "DojoP1PowerLamp.h"

#include "Components/TextRenderComponent.h"
#include "DojoP1Generator.h"

ADojoP1PowerLamp::ADojoP1PowerLamp()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1PowerLamp::BeginPlay()
{
	Super::BeginPlay();

	ConnectTo(Generator);
	RefreshLabel();
}

void ADojoP1PowerLamp::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Disconnect();

	Super::EndPlay(EndPlayReason);
}

void ADojoP1PowerLamp::ConnectTo(ADojoP1Generator* NewGenerator)
{
	if (!IsValid(NewGenerator)) return;

	if (ConnectedGenerator != NewGenerator) Disconnect();

	ConnectedGenerator = NewGenerator;
	ConnectedGenerator->OnPowerChanged.AddUniqueDynamic(this, &ADojoP1PowerLamp::HandlePowerChanged);
	SetLit(NewGenerator->IsRunning());
}

void ADojoP1PowerLamp::HandlePowerChanged(bool bRunning)
{
	SetLit(bRunning);
}

void ADojoP1PowerLamp::Disconnect()
{
	if (IsValid(ConnectedGenerator)) ConnectedGenerator->OnPowerChanged.RemoveDynamic(this, &ADojoP1PowerLamp::HandlePowerChanged);

	ConnectedGenerator = nullptr;
}

void ADojoP1PowerLamp::SetLit(bool bNewLit)
{
	bLit = bNewLit;
	RefreshLabel();
}

bool ADojoP1PowerLamp::IsLit() const
{
	return bLit;
}

void ADojoP1PowerLamp::RefreshLabel()
{
	Label->SetText(FText::FromString(bLit ? TEXT("ON") : TEXT("OFF")));
}
