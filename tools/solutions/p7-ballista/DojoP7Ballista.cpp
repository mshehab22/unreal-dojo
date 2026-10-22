#include "DojoP7Ballista.h"

#include "Components/TextRenderComponent.h"
#include "DojoP7BallistaAiming.h"
#include "DojoP7BallistaIdle.h"
#include "DojoP7BallistaReloading.h"

ADojoP7Ballista::ADojoP7Ballista()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	IdleState = CreateDefaultSubobject<UDojoP7BallistaIdle>(TEXT("IdleState"));
	AimingState = CreateDefaultSubobject<UDojoP7BallistaAiming>(TEXT("AimingState"));
	ReloadingState = CreateDefaultSubobject<UDojoP7BallistaReloading>(TEXT("ReloadingState"));
}

void ADojoP7Ballista::BeginPlay()
{
	Super::BeginPlay();

	CurrentState = IdleState;
	CurrentState->Enter(this);
	RefreshLabel();
}

void ADojoP7Ballista::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (IsValid(CurrentState)) CurrentState->TickState(this, DeltaSeconds);
	RefreshLabel();
}

void ADojoP7Ballista::SpotTarget()
{
	bHasTarget = true;
	if (IsValid(CurrentState)) CurrentState->OnTargetSpotted(this);
	RefreshLabel();
}

void ADojoP7Ballista::LoseTarget()
{
	bHasTarget = false;
	if (IsValid(CurrentState)) CurrentState->OnTargetLost(this);
	RefreshLabel();
}

void ADojoP7Ballista::Fire()
{
	if (IsValid(CurrentState)) CurrentState->OnFireOrder(this);
	RefreshLabel();
}

void ADojoP7Ballista::ChangeState(UDojoP7BallistaState* NewState)
{
	if (!IsValid(NewState) || NewState == CurrentState) return;

	if (IsValid(CurrentState)) CurrentState->Exit(this);
	CurrentState = NewState;
	CurrentState->Enter(this);
}

void ADojoP7Ballista::LaunchBolt()
{
	BoltsFired++;
}

UDojoP7BallistaState* ADojoP7Ballista::GetCurrentState() const
{
	return CurrentState;
}

bool ADojoP7Ballista::HasTarget() const
{
	return bHasTarget;
}

int32 ADojoP7Ballista::GetBoltsFired() const
{
	return BoltsFired;
}

void ADojoP7Ballista::RefreshLabel()
{
	if (IsValid(CurrentState)) Label->SetText(FText::FromString(CurrentState->GetLabelText()));
}
