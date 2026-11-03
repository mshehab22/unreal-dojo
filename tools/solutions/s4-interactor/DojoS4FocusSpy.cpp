#include "DojoS4FocusSpy.h"

#include "DojoS4Interactor.h"

void UDojoS4FocusSpy::Watch(UDojoS4Interactor* Interactor)
{
	if (Interactor == nullptr)
	{
		return;
	}

	Interactor->OnFocusChanged.AddUniqueDynamic(this, &UDojoS4FocusSpy::HandleFocusChanged);
}

int32 UDojoS4FocusSpy::GetNoticeCount() const
{
	return NoticeCount;
}

AActor* UDojoS4FocusSpy::GetLastFocus() const
{
	return LastFocus;
}

FString UDojoS4FocusSpy::GetLastPrompt() const
{
	return LastPrompt;
}

void UDojoS4FocusSpy::HandleFocusChanged(AActor* Focus, FText Prompt)
{
	++NoticeCount;
	LastFocus = Focus;
	LastPrompt = Prompt.ToString();
}
