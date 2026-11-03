#include "DojoM4Bomb.h"

#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM4Bomb::ADojoM4Bomb()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<USphereComponent>(TEXT("Body"));
	Body->SetSphereRadius(30.f);
	Body->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Body;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Body);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 80.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM4Bomb::BeginPlay()
{
	Super::BeginPlay();

	if (StartFuse > 0.f)
	{
		bLitAtStart = true;
		Light(StartFuse);
	}

	RefreshLabel();
}

void ADojoM4Bomb::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(FuseTimer);
	GetWorldTimerManager().ClearTimer(LabelTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoM4Bomb::Light(float Seconds)
{
	if (Seconds <= 0.f)
	{
		Blow();
		return;
	}

	FTimerManager& Timers = GetWorldTimerManager();
	if (Timers.IsTimerActive(FuseTimer) && Timers.GetTimerRemaining(FuseTimer) <= Seconds)
	{
		return;
	}

	Timers.SetTimer(FuseTimer, this, &ADojoM4Bomb::Blow, Seconds, false);

	if (!Timers.IsTimerActive(LabelTimer))
	{
		Timers.SetTimer(LabelTimer, this, &ADojoM4Bomb::RefreshLabel, 0.1f, true);
	}

	RefreshLabel();
}

void ADojoM4Bomb::Defuse()
{
	GetWorldTimerManager().ClearTimer(FuseTimer);
	GetWorldTimerManager().ClearTimer(LabelTimer);
	RefreshLabel();
}

bool ADojoM4Bomb::IsLit() const
{
	return GetWorldTimerManager().IsTimerActive(FuseTimer);
}

float ADojoM4Bomb::GetFuseRemaining() const
{
	return IsLit() ? GetWorldTimerManager().GetTimerRemaining(FuseTimer) : 0.f;
}

bool ADojoM4Bomb::WasLitAtStart() const
{
	return bLitAtStart;
}

void ADojoM4Bomb::Blow()
{
	Destroy();
}

void ADojoM4Bomb::RefreshLabel()
{
	const FString Text = IsLit() ? FString::Printf(TEXT("%.1f"), GetFuseRemaining()) : FString(TEXT("SAFE"));
	Label->SetText(FText::FromString(Text));
}
