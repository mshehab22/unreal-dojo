#include "DojoP10Quiver.h"

#include "Components/TextRenderComponent.h"
#include "DojoP10QuiverRow.h"
#include "Engine/World.h"

ADojoP10Quiver::ADojoP10Quiver()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

ADojoP10Quiver* ADojoP10Quiver::SpawnOfKind(UWorld* World, const FDataTableRowHandle& Kind, const FTransform& Transform)
{
	if (!World) return nullptr;

	const FDojoP10QuiverRow* Row = Kind.DataTable ? Kind.DataTable->FindRow<FDojoP10QuiverRow>(Kind.RowName, TEXT("SpawnOfKind"), false) : nullptr;
	UClass* QuiverClass = Row && Row->QuiverClass ? Row->QuiverClass.Get() : ADojoP10Quiver::StaticClass();

	// Deferred, so the kind is set before BeginPlay fills the quiver.
	ADojoP10Quiver* Quiver = World->SpawnActorDeferred<ADojoP10Quiver>(QuiverClass, Transform);
	if (!Quiver) return nullptr;

	Quiver->Kind = Kind;
	Quiver->FinishSpawning(Transform);
	return Quiver;
}

void ADojoP10Quiver::BeginPlay()
{
	Super::BeginPlay();

	Refill();
}

float ADojoP10Quiver::Draw()
{
	const FDojoP10QuiverRow* Row = FindKind();
	if (!Row || ArrowsLeft <= 0) return 0.f;

	ArrowsLeft--;
	RefreshLabel();
	return Row->ArrowDamage;
}

void ADojoP10Quiver::Refill()
{
	const FDojoP10QuiverRow* Row = FindKind();
	ArrowsLeft = Row ? Row->ArrowCount : 0;
	RefreshLabel();
}

int32 ADojoP10Quiver::GetArrowsLeft() const
{
	return ArrowsLeft;
}

bool ADojoP10Quiver::HasKind() const
{
	return FindKind() != nullptr;
}

const FDojoP10QuiverRow* ADojoP10Quiver::FindKind() const
{
	if (!Kind.DataTable) return nullptr;

	return Kind.DataTable->FindRow<FDojoP10QuiverRow>(Kind.RowName, TEXT("Quiver"), false);
}

void ADojoP10Quiver::RefreshLabel()
{
	const FDojoP10QuiverRow* Row = FindKind();
	const FString Name = Row ? Row->DisplayName.ToString() : TEXT("No kind");
	Label->SetText(FText::FromString(FString::Printf(TEXT("%s: %d"), *Name, ArrowsLeft)));
}
