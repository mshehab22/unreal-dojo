#include "DojoP8KeyChest.h"

void ADojoP8KeyChest::OnInteract_Implementation(ADojoP8Visitor* Visitor)
{
	if (!TakeItem(Visitor, KeyItem))
	{
		ShowPrompt(FText::FromString(TEXT("Locked: needs a key")));
		return;
	}

	GiveItem(Visitor, RewardItem);
	ShowPrompt(FText::FromString(TEXT("Opened")));
	MarkUsedUp();
}
