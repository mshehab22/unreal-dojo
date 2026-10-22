#include "DojoP8Visitor.h"

#include "Components/TextRenderComponent.h"

ADojoP8Visitor::ADojoP8Visitor()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8Visitor::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

bool ADojoP8Visitor::HasItem(FName Item) const
{
	return Items.Contains(Item);
}

void ADojoP8Visitor::AddItem(FName Item)
{
	Items.Add(Item);
	RefreshLabel();
}

bool ADojoP8Visitor::RemoveItem(FName Item)
{
	const int32 Index = Items.Find(Item);
	if (Index == INDEX_NONE) return false;

	Items.RemoveAt(Index);
	RefreshLabel();
	return true;
}

bool ADojoP8Visitor::HasFlag(FName Flag) const
{
	return QuestFlags.Contains(Flag);
}

void ADojoP8Visitor::SetFlag(FName Flag)
{
	QuestFlags.AddUnique(Flag);
}

void ADojoP8Visitor::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Carrying %d"), Items.Num())));
}
