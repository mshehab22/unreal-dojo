#include "DojoP8InteractableBase.h"

#include "Components/TextRenderComponent.h"
#include "DojoP8Visitor.h"

ADojoP8InteractableBase::ADojoP8InteractableBase()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8InteractableBase::Interact(ADojoP8Visitor* Visitor)
{
	if (!IsValid(Visitor) || bUsedUp) return;

	InteractionCount++;
	OnInteract(Visitor);
}

void ADojoP8InteractableBase::OnInteract_Implementation(ADojoP8Visitor* Visitor)
{
	ShowPrompt(FText::FromString(TEXT("Nothing happens")));
}

FText ADojoP8InteractableBase::GetPrompt() const
{
	return Prompt;
}

bool ADojoP8InteractableBase::IsUsedUp() const
{
	return bUsedUp;
}

int32 ADojoP8InteractableBase::GetInteractionCount() const
{
	return InteractionCount;
}

void ADojoP8InteractableBase::ShowPrompt(const FText& Text)
{
	Prompt = Text;
	Label->SetText(Prompt);
}

bool ADojoP8InteractableBase::TakeItem(ADojoP8Visitor* Visitor, FName Item)
{
	return IsValid(Visitor) && Visitor->RemoveItem(Item);
}

void ADojoP8InteractableBase::GiveItem(ADojoP8Visitor* Visitor, FName Item)
{
	if (IsValid(Visitor)) Visitor->AddItem(Item);
}

void ADojoP8InteractableBase::SetQuestFlag(ADojoP8Visitor* Visitor, FName Flag)
{
	if (IsValid(Visitor)) Visitor->SetFlag(Flag);
}

void ADojoP8InteractableBase::MarkUsedUp()
{
	bUsedUp = true;
}
