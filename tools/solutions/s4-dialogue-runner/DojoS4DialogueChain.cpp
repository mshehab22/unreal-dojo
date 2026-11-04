#include "DojoS4DialogueChain.h"

#include "DojoS4DialogueRunner.h"

void UDojoS4DialogueChain::Arm(UDojoS4DialogueRunner* Runner, UDojoS4DialogueData* FollowUp, UDojoS4FlagStore* Store)
{
	if (Runner == nullptr)
	{
		return;
	}

	WatchedRunner = Runner;
	NextDialogue = FollowUp;
	NextFlags = Store;
	bArmed = true;
	Runner->OnDialogueEnded.AddUniqueDynamic(this, &UDojoS4DialogueChain::HandleEnded);
}

bool UDojoS4DialogueChain::DidStartFollowUp() const
{
	return bStartedFollowUp;
}

void UDojoS4DialogueChain::HandleEnded()
{
	if (!bArmed || WatchedRunner == nullptr)
	{
		return;
	}

	bArmed = false;
	bStartedFollowUp = WatchedRunner->Start(NextDialogue, NextFlags);
}
