#include "DojoP8Lever.h"

void ADojoP8Lever::OnInteract_Implementation(ADojoP8Visitor* Visitor)
{
	SetQuestFlag(Visitor, FlagName);
	ShowPrompt(FText::FromString(TEXT("Clunk")));
}
