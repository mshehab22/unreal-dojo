#include "DojoM7PlateGate.h"

#include "Components/BoxComponent.h"
#include "Components/SceneComponent.h"
#include "Quests/m7-signal-plate/DojoM7SignalPlate.h"

ADojoM7PlateGate::ADojoM7PlateGate()
{
	PrimaryActorTick.bCanEverTick = true;

	Frame = CreateDefaultSubobject<USceneComponent>(TEXT("Frame"));
	RootComponent = Frame;

	Panel = CreateDefaultSubobject<UBoxComponent>(TEXT("Panel"));
	Panel->SetupAttachment(Frame);
	Panel->SetBoxExtent(FVector(20.f, 150.f, 150.f));
	Panel->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	Panel->SetHiddenInGame(false);

	// A gate built over a plate must never count as something standing on it.
	Panel->SetGenerateOverlapEvents(false);
}

void ADojoM7PlateGate::BeginPlay()
{
	Super::BeginPlay();

	BindPlates();
}

void ADojoM7PlateGate::BindPlates()
{
	for (ADojoM7SignalPlate* Plate : Plates)
	{
		if (!IsValid(Plate)) continue;

		Plate->OnPlatePressed.AddUniqueDynamic(this, &ADojoM7PlateGate::HandlePlateChanged);
		Plate->OnPlateReleased.AddUniqueDynamic(this, &ADojoM7PlateGate::HandlePlateChanged);
		HandlePlateChanged(Plate);
	}
}

bool ADojoM7PlateGate::WantsOpen() const
{
	return bWantsOpen;
}

float ADojoM7PlateGate::GetOpenFraction() const
{
	if (OpenHeight <= 0.f) return 0.f;

	return static_cast<float>(Panel->GetRelativeLocation().Z) / OpenHeight;
}

bool ADojoM7PlateGate::IsOpen() const
{
	return GetOpenFraction() >= 1.f;
}

void ADojoM7PlateGate::HandlePlateChanged(ADojoM7SignalPlate* ChangedPlate)
{
	bWantsOpen = false;
	for (const ADojoM7SignalPlate* Plate : Plates)
	{
		if (!IsValid(Plate)) continue;
		bWantsOpen = Plate->IsPressed();
		if (!bWantsOpen) return;
	}
}

void ADojoM7PlateGate::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	FVector PanelLocation = Panel->GetRelativeLocation();
	const float Height = static_cast<float>(PanelLocation.Z);
	const float TargetHeight = bWantsOpen ? OpenHeight : 0.f;
	if (Height == TargetHeight) return;

	PanelLocation.Z = StepHeight(Height, TargetHeight, DeltaSeconds);
	Panel->SetRelativeLocation(PanelLocation);
	if (PanelLocation.Z != TargetHeight) return;

	if (bWantsOpen)
	{
		bHasOpened = true;
		OnOpened.Broadcast();
	}
	else if (bHasOpened)
	{
		bHasOpened = false;
		OnClosed.Broadcast();
	}
}

float ADojoM7PlateGate::StepHeight(float Height, float TargetHeight, float DeltaSeconds) const
{
	// ClampMin guards only the Details panel; code that sets OpenSeconds is not clamped, so the division is guarded here too.
	const float Speed = OpenHeight / FMath::Max(OpenSeconds, 0.05f);
	const float NextHeight = FMath::FInterpConstantTo(Height, TargetHeight, DeltaSeconds, Speed);

	// Land exactly on the end, so float rounding never leaves the panel a hair short of open or closed.
	if (FMath::IsNearlyEqual(NextHeight, TargetHeight, 0.01f)) return TargetHeight;
	return NextHeight;
}
