#include "DojoS4DialogueRunner.h"

#include "DojoS4DialogueData.h"
#include "DojoS4FlagStore.h"

bool UDojoS4DialogueRunner::Start(UDojoS4DialogueData* Data, UDojoS4FlagStore* FlagStore)
{
	if (State == EDojoS4DialogueState::EDS_Active || Data == nullptr || FlagStore == nullptr || Data->FindNode(Data->StartNode) == nullptr)
	{
		return false;
	}

	CurrentData = Data;
	CurrentFlags = FlagStore;
	CurrentNode = Data->StartNode;
	State = EDojoS4DialogueState::EDS_Active;
	OnDialogueStarted.Broadcast(Data);
	return true;
}

EDojoS4DialogueState UDojoS4DialogueRunner::GetState() const
{
	return State;
}

FText UDojoS4DialogueRunner::GetCurrentText() const
{
	const FDojoS4DialogueNode* Node = CurrentData != nullptr ? CurrentData->FindNode(CurrentNode) : nullptr;
	return Node != nullptr ? Node->Text : FText::GetEmpty();
}

TArray<FDojoS4DialogueChoice> UDojoS4DialogueRunner::GetVisibleChoices() const
{
	TArray<FDojoS4DialogueChoice> Visible;
	const FDojoS4DialogueNode* Node = CurrentData != nullptr ? CurrentData->FindNode(CurrentNode) : nullptr;

	if (Node == nullptr)
	{
		return Visible;
	}

	for (const FDojoS4DialogueChoice& Choice : Node->Choices)
	{
		if (Choice.RequiredFlag.IsNone() || CurrentFlags->Has(Choice.RequiredFlag))
		{
			Visible.Add(Choice);
		}
	}

	return Visible;
}

bool UDojoS4DialogueRunner::Choose(int32 Index)
{
	const TArray<FDojoS4DialogueChoice> Visible = GetVisibleChoices();

	if (!Visible.IsValidIndex(Index))
	{
		return false;
	}

	const FDojoS4DialogueChoice Choice = Visible[Index];
	CurrentFlags->Set(Choice.SetFlag);

	const bool bContinues = !Choice.NextNode.IsNone() && CurrentData->FindNode(Choice.NextNode) != nullptr;

	if (bContinues)
	{
		CurrentNode = Choice.NextNode;
	}

	OnChoiceMade.Broadcast(Index, Choice.Text);

	if (!bContinues)
	{
		End();
	}

	return true;
}

bool UDojoS4DialogueRunner::Advance()
{
	if (State != EDojoS4DialogueState::EDS_Active || GetVisibleChoices().Num() > 0)
	{
		return false;
	}

	End();
	return true;
}

void UDojoS4DialogueRunner::End()
{
	if (State == EDojoS4DialogueState::EDS_Idle)
	{
		return;
	}

	// Become idle and let go of the conversation before telling anyone, so a listener can start the next one.
	State = EDojoS4DialogueState::EDS_Idle;
	CurrentData = nullptr;
	CurrentFlags = nullptr;
	CurrentNode = NAME_None;
	OnDialogueEnded.Broadcast();
}
