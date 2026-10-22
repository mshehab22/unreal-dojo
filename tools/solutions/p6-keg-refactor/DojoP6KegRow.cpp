#include "DojoP6KegRow.h"

#include "Components/TextRenderComponent.h"

ADojoP6KegRow::ADojoP6KegRow()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	ResetRow(12);
}

void ADojoP6KegRow::ResetRow(int32 Count)
{
	Blown.Init(false, FMath::Max(1, Count));
	BlownCount = 0;
	DeepestChain = 0;
	PendingKegs.Reset();
	RefreshLabel();
}

void ADojoP6KegRow::Detonate(int32 Keg)
{
	if (!Blown.IsValidIndex(Keg) || Blown[Keg]) return;

	PendingKegs.AddUnique(Keg);
}

void ADojoP6KegRow::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (PendingKegs.Num() == 0) return;

	// This tick's wave is what was posted before it began; kegs it sets off are posted for the next tick.
	TArray<int32> Wave = MoveTemp(PendingKegs);
	PendingKegs.Reset();

	for (const int32 Keg : Wave) Blow(Keg);

	RefreshLabel();
}

void ADojoP6KegRow::Blow(int32 Keg)
{
	if (!Blown.IsValidIndex(Keg) || Blown[Keg]) return;

	CurrentDepth++;
	DeepestChain = FMath::Max(DeepestChain, CurrentDepth);

	Blown[Keg] = true;
	BlownCount++;

	Detonate(Keg - 1);
	Detonate(Keg + 1);

	CurrentDepth--;
}

int32 ADojoP6KegRow::GetBlownCount() const
{
	return BlownCount;
}

bool ADojoP6KegRow::IsBlown(int32 Keg) const
{
	return Blown.IsValidIndex(Keg) && Blown[Keg];
}

int32 ADojoP6KegRow::GetDeepestChain() const
{
	return DeepestChain;
}

void ADojoP6KegRow::RefreshLabel()
{
	FString Row;
	for (const bool bBlown : Blown) Row += bBlown ? TEXT("*") : TEXT("o");
	Label->SetText(FText::FromString(Row));
}
