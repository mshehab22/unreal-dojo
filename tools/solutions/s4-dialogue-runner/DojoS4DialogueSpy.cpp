#include "DojoS4DialogueSpy.h"

#include "DojoS4DialogueRunner.h"
#include "DojoS4FlagStore.h"

void UDojoS4DialogueSpy::Watch(UDojoS4DialogueRunner* Runner, UDojoS4FlagStore* Store, FName WatchedFlag)
{
	if (Runner == nullptr)
	{
		return;
	}

	WatchedRunner = Runner;
	WatchedStore = Store;
	FlagName = WatchedFlag;
	Runner->OnDialogueStarted.AddUniqueDynamic(this, &UDojoS4DialogueSpy::HandleStarted);
	Runner->OnChoiceMade.AddUniqueDynamic(this, &UDojoS4DialogueSpy::HandleChoice);
	Runner->OnDialogueEnded.AddUniqueDynamic(this, &UDojoS4DialogueSpy::HandleEnded);
}

FString UDojoS4DialogueSpy::GetLog() const
{
	return FString::Join(Log, TEXT(", "));
}

FString UDojoS4DialogueSpy::GetTextAtLastChoice() const
{
	return TextAtLastChoice;
}

bool UDojoS4DialogueSpy::WasFlagSetAtLastChoice() const
{
	return bFlagSetAtLastChoice;
}

void UDojoS4DialogueSpy::HandleStarted(UDojoS4DialogueData* Dialogue)
{
	Log.Add(TEXT("started"));
}

void UDojoS4DialogueSpy::HandleChoice(int32 Index, FText ChoiceText)
{
	Log.Add(FString::Printf(TEXT("choice %d %s"), Index, *ChoiceText.ToString()));
	TextAtLastChoice = WatchedRunner->GetCurrentText().ToString();
	bFlagSetAtLastChoice = WatchedStore != nullptr && WatchedStore->Has(FlagName);
}

void UDojoS4DialogueSpy::HandleEnded()
{
	Log.Add(TEXT("ended"));
}
