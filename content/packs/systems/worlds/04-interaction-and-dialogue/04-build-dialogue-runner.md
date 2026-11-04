---
id: s4-dialogue-runner
title: A runner that plays conversations from assets
order: 4
kind: build
scaffold: stub
difficulty: 4
patterns: [state, observer, type-object]
skills: [data, delegates, state]
terms: [data-asset, ustruct, uenum, fname, ftext, tset, dynamic-multicast-delegate, broadcast]
prerequisites: [s4-interactor, p7-state-when-not]
xp: 110
estimatedMinutes: 30
concepts:
  - Conversations as data in nodes, choices, and flags, with no story in the runner
  - A runner that is idle or active and answers questions about the conversation it is playing
  - Choices that appear only once a flag is set, picked by their position among those shown
---

# Brief

When you start the gate conversation, its greeting shows two choices; after the password flag is set it shows three; picking a choice sets its flag, moves on, and announces it; and a choice with no next node ends the conversation.

The conversation asset, its nodes and choices, the flag store, and two ready-made listeners are given: `UDojoS4DialogueSpy` and `UDojoS4DialogueChain`; the tests use both. The runner's declaration is given; every body in `DojoS4DialogueRunner.cpp` is yours:

- `Start` starts a conversation on its start node and announces `OnDialogueStarted`. It returns false, announcing nothing, when a conversation is already playing or the asset, its start node, or the flag store is missing.
- `GetState`, `GetCurrentText`, and `GetVisibleChoices` answer questions. Visible choices are those with no required flag, or whose required flag is set, in the order they are written. An idle runner shows no text and no choices.
- `Choose(Index)` picks the choice at that position among the visible ones and returns false for any other number. It sets the choice's flag, moves to its next node when there is one, announces `OnChoiceMade` with the position and the choice's text, and ends the conversation when there is no next node.
- `Advance` ends the conversation at a closing line, a node with nothing to choose, and returns whether it did.
- `End` ends the conversation and announces `OnDialogueEnded` once; nothing happens when the runner is idle.

Dependency direction: the runner reads the asset and the flags and knows no story; the asset knows nothing about code; listeners subscribe to the three events.

Write it the obvious way first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

This is the third piece of the Village Gate boss.

## See it in the editor

Make a Dojo S4 Dialogue Data asset `DA_Gate` with Start Node `greet` and one node, `greet`, whose text is `Halt.` and which has one choice, `Leave`, with no next node. In the level Blueprint, on BeginPlay create a Dojo S4 Flag Store and a Dojo S4 Dialogue Runner with Construct Object from Class and store both in variables, bind a custom event to On Dialogue Ended that prints `ended`, and call Start with `DA_Gate`. On the 1 key call Choose with 0 and print Get State. Press Play and press 1: `ended` prints and the state is Idle.

# Files

## DojoS4DialogueChoice.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoS4DialogueChoice.generated.h"

/** One thing the player can say at a node; it may need a flag to be shown, set a flag when chosen, and lead to another node. */
USTRUCT(BlueprintType)
struct FDojoS4DialogueChoice
{
	GENERATED_BODY()

	/** What the player says. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FText Text;

	/** The node this choice leads to; none ends the conversation. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FName NextNode;

	/** The choice is shown only once this flag is set; none means always shown. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FName RequiredFlag;

	/** Set when this choice is made; none sets nothing. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FName SetFlag;
};
```

## DojoS4DialogueNode.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoS4DialogueChoice.h"
#include "DojoS4DialogueNode.generated.h"

/** One moment of a conversation: what the speaker says and what the player may answer. */
USTRUCT(BlueprintType)
struct FDojoS4DialogueNode
{
	GENERATED_BODY()

	/** The name other nodes use to lead here. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FName Id;

	/** What the speaker says. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	FText Text;

	/** The answers; a node with none is a closing line. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue")
	TArray<FDojoS4DialogueChoice> Choices;
};
```

## DojoS4DialogueData.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoS4DialogueNode.h"
#include "Engine/DataAsset.h"
#include "DojoS4DialogueData.generated.h"

/** One conversation kept in an asset, so designers write dialogue without code; the runner only plays it. */
UCLASS(BlueprintType)
class UDojoS4DialogueData : public UDataAsset
{
	GENERATED_BODY()

public:
	/** The node the conversation opens on. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Dialogue")
	FName StartNode;

	/** Every node of the conversation. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Dialogue")
	TArray<FDojoS4DialogueNode> Nodes;

	/** The node with this id, or null when there is none. */
	const FDojoS4DialogueNode* FindNode(FName NodeId) const;
};
```

## DojoS4DialogueData.cpp

```cpp
#include "DojoS4DialogueData.h"

const FDojoS4DialogueNode* UDojoS4DialogueData::FindNode(FName NodeId) const
{
	return Nodes.FindByPredicate([NodeId](const FDojoS4DialogueNode& Node) { return Node.Id == NodeId; });
}
```

## DojoS4FlagStore.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS4FlagStore.generated.h"

/** Broadcast when a flag becomes set; setting a flag that is already set announces nothing. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS4OnFlagSet, FName, Flag);

/** The story so far as a set of named flags that choices set and other choices, doors, and quests read. */
UCLASS(BlueprintType)
class UDojoS4FlagStore : public UObject
{
	GENERATED_BODY()

public:
	/** Fires when a flag becomes set. */
	UPROPERTY(BlueprintAssignable, Category = "Flags")
	FDojoS4OnFlagSet OnFlagSet;

	/** Sets a flag; the none name is not a flag and is ignored. */
	UFUNCTION(BlueprintCallable, Category = "Flags")
	void Set(FName Flag);

	/** True when the flag is set. */
	UFUNCTION(BlueprintPure, Category = "Flags")
	bool Has(FName Flag) const;

	/** Clears every flag without announcing anything. */
	UFUNCTION(BlueprintCallable, Category = "Flags")
	void Reset();

private:
	UPROPERTY()
	TSet<FName> RaisedFlags;
};
```

## DojoS4FlagStore.cpp

```cpp
#include "DojoS4FlagStore.h"

void UDojoS4FlagStore::Set(FName Flag)
{
	if (Flag.IsNone() || RaisedFlags.Contains(Flag))
	{
		return;
	}

	RaisedFlags.Add(Flag);
	OnFlagSet.Broadcast(Flag);
}

bool UDojoS4FlagStore::Has(FName Flag) const
{
	return RaisedFlags.Contains(Flag);
}

void UDojoS4FlagStore::Reset()
{
	RaisedFlags.Reset();
}
```

## DojoS4DialogueRunner.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoS4DialogueChoice.h"
#include "UObject/Object.h"
#include "DojoS4DialogueRunner.generated.h"

class UDojoS4DialogueData;
class UDojoS4FlagStore;

/** Whether a conversation is being played. */
UENUM(BlueprintType)
enum class EDojoS4DialogueState : uint8
{
	EDS_Idle UMETA(DisplayName = "Idle"),
	EDS_Active UMETA(DisplayName = "Active")
};

/** Broadcast when a conversation starts. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS4OnDialogueStarted, UDojoS4DialogueData*, Dialogue);

/** Broadcast when a choice has been made: its number among the visible choices and its text. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS4OnChoiceMade, int32, Index, FText, ChoiceText);

/** Broadcast when a conversation has ended. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoS4OnDialogueEnded);

/** Plays one conversation at a time from a dialogue asset: it is idle or active, shows the choices that are allowed, sets flags, and announces each step to listeners. */
UCLASS(BlueprintType)
class UDojoS4DialogueRunner : public UObject
{
	GENERATED_BODY()

public:
	/** Fires once when a conversation starts. */
	UPROPERTY(BlueprintAssignable, Category = "Dialogue")
	FDojoS4OnDialogueStarted OnDialogueStarted;

	/** Fires for each choice made, after its flag is set and the runner has moved on. */
	UPROPERTY(BlueprintAssignable, Category = "Dialogue")
	FDojoS4OnChoiceMade OnChoiceMade;

	/** Fires once when a conversation ends. */
	UPROPERTY(BlueprintAssignable, Category = "Dialogue")
	FDojoS4OnDialogueEnded OnDialogueEnded;

	/** Starts a conversation on its start node; false when one is already playing or the asset, its start node, or the flag store is missing. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue")
	bool Start(UDojoS4DialogueData* Data, UDojoS4FlagStore* FlagStore);

	/** Idle or Active. */
	UFUNCTION(BlueprintPure, Category = "Dialogue")
	EDojoS4DialogueState GetState() const;

	/** What the speaker says at the current node, or empty text when idle. */
	UFUNCTION(BlueprintPure, Category = "Dialogue")
	FText GetCurrentText() const;

	/** The choices the player may pick now, in order: those with no required flag or whose flag is set. Empty when idle. */
	UFUNCTION(BlueprintPure, Category = "Dialogue")
	TArray<FDojoS4DialogueChoice> GetVisibleChoices() const;

	/** Makes the choice at this position in the visible choices; false when idle or there is no such choice. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue")
	bool Choose(int32 Index);

	/** Ends the conversation at a closing line, a node with nothing to choose; false when there is something to choose or nothing is playing. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue")
	bool Advance();

	/** Ends the conversation now; nothing happens when it is idle. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue")
	void End();

private:
	UPROPERTY()
	TObjectPtr<UDojoS4DialogueData> CurrentData;

	UPROPERTY()
	TObjectPtr<UDojoS4FlagStore> CurrentFlags;

	FName CurrentNode;
	EDojoS4DialogueState State = EDojoS4DialogueState::EDS_Idle;
};
```

## DojoS4DialogueRunner.cpp

```cpp
#include "DojoS4DialogueRunner.h"

#include "DojoS4DialogueData.h"
#include "DojoS4FlagStore.h"

/** Starts a conversation on its start node. */
bool UDojoS4DialogueRunner::Start(UDojoS4DialogueData* Data, UDojoS4FlagStore* FlagStore)
{
	return false;
}

/** Idle or Active. */
EDojoS4DialogueState UDojoS4DialogueRunner::GetState() const
{
	return EDojoS4DialogueState::EDS_Idle;
}

/** What the speaker says at the current node. */
FText UDojoS4DialogueRunner::GetCurrentText() const
{
	return FText::GetEmpty();
}

/** The choices the player may pick now. */
TArray<FDojoS4DialogueChoice> UDojoS4DialogueRunner::GetVisibleChoices() const
{
	return TArray<FDojoS4DialogueChoice>();
}

/** Makes the choice at this position in the visible choices. */
bool UDojoS4DialogueRunner::Choose(int32 Index)
{
	return false;
}

/** Ends the conversation at a closing line. */
bool UDojoS4DialogueRunner::Advance()
{
	return false;
}

/** Ends the conversation now. */
void UDojoS4DialogueRunner::End()
{
}
```

## DojoS4DialogueSpy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS4DialogueSpy.generated.h"

class UDojoS4DialogueData;
class UDojoS4DialogueRunner;
class UDojoS4FlagStore;

/** A listener that writes down every event a runner announces, in order, and whether a watched flag was set at each choice; it only subscribes. */
UCLASS()
class UDojoS4DialogueSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the runner, once however many times it is called; Store and WatchedFlag say which flag to read at each choice. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue Spy")
	void Watch(UDojoS4DialogueRunner* Runner, UDojoS4FlagStore* Store, FName WatchedFlag);

	/** The events so far as one line, such as "started, choice 0 Yes, ended". */
	UFUNCTION(BlueprintPure, Category = "Dialogue Spy")
	FString GetLog() const;

	/** The runner's current text at the moment of the last choice notice. */
	UFUNCTION(BlueprintPure, Category = "Dialogue Spy")
	FString GetTextAtLastChoice() const;

	/** True when the watched flag was set at the moment of the last choice notice. */
	UFUNCTION(BlueprintPure, Category = "Dialogue Spy")
	bool WasFlagSetAtLastChoice() const;

private:
	/** Writes "started". */
	UFUNCTION()
	void HandleStarted(UDojoS4DialogueData* Dialogue);

	/** Writes the choice and reads the watched flag. */
	UFUNCTION()
	void HandleChoice(int32 Index, FText ChoiceText);

	/** Writes "ended". */
	UFUNCTION()
	void HandleEnded();

	TArray<FString> Log;

	UPROPERTY()
	TObjectPtr<UDojoS4DialogueRunner> WatchedRunner;

	FString TextAtLastChoice;

	UPROPERTY()
	TObjectPtr<UDojoS4FlagStore> WatchedStore;

	FName FlagName;
	bool bFlagSetAtLastChoice = false;
};
```

## DojoS4DialogueSpy.cpp

```cpp
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
```

## DojoS4DialogueChain.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS4DialogueChain.generated.h"

class UDojoS4DialogueData;
class UDojoS4DialogueRunner;
class UDojoS4FlagStore;

/** A listener that starts a follow-up conversation as soon as the current one ends, the way a story beat chains into the next; it only subscribes. */
UCLASS()
class UDojoS4DialogueChain : public UObject
{
	GENERATED_BODY()

public:
	/** Arms the chain: when the runner announces an end, the follow-up is started once. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue Chain")
	void Arm(UDojoS4DialogueRunner* Runner, UDojoS4DialogueData* FollowUp, UDojoS4FlagStore* Store);

	/** True when the follow-up was started by the chain. */
	UFUNCTION(BlueprintPure, Category = "Dialogue Chain")
	bool DidStartFollowUp() const;

private:
	/** Starts the follow-up on the runner that just ended. */
	UFUNCTION()
	void HandleEnded();

	UPROPERTY()
	TObjectPtr<UDojoS4DialogueRunner> WatchedRunner;

	UPROPERTY()
	TObjectPtr<UDojoS4DialogueData> NextDialogue;

	UPROPERTY()
	TObjectPtr<UDojoS4FlagStore> NextFlags;

	bool bStartedFollowUp = false;
	bool bArmed = false;
};
```

## DojoS4DialogueChain.cpp

```cpp
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
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s4-dialogue-runner/DojoS4DialogueChain.h"
#include "Quests/s4-dialogue-runner/DojoS4DialogueData.h"
#include "Quests/s4-dialogue-runner/DojoS4DialogueRunner.h"
#include "Quests/s4-dialogue-runner/DojoS4DialogueSpy.h"
#include "Quests/s4-dialogue-runner/DojoS4FlagStore.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS4RunnerTest
{
	/** One choice of a node. */
	FDojoS4DialogueChoice MakeChoice(const TCHAR* Text, const TCHAR* Next, const TCHAR* Required = TEXT(""), const TCHAR* Sets = TEXT(""))
	{
		FDojoS4DialogueChoice Choice;
		Choice.Text = FText::FromString(Text);
		Choice.NextNode = FName(Next);
		Choice.RequiredFlag = FName(Required);
		Choice.SetFlag = FName(Sets);
		return Choice;
	}

	/** One node with its choices. */
	FDojoS4DialogueNode MakeNode(const TCHAR* Id, const TCHAR* Text, const TArray<FDojoS4DialogueChoice>& Choices)
	{
		FDojoS4DialogueNode Node;
		Node.Id = FName(Id);
		Node.Text = FText::FromString(Text);
		Node.Choices = Choices;
		return Node;
	}

	/** The gate conversation: a message, a password that is only offered once it is known, and a way to leave. */
	TStrongObjectPtr<UDojoS4DialogueData> MakeGateTalk()
	{
		TStrongObjectPtr<UDojoS4DialogueData> Talk(NewObject<UDojoS4DialogueData>());
		Talk->StartNode = FName(TEXT("greet"));
		Talk->Nodes.Add(MakeNode(TEXT("greet"), TEXT("Halt."), { MakeChoice(TEXT("Message"), TEXT("message")), MakeChoice(TEXT("Password"), TEXT("welcome"), TEXT("knows"), TEXT("pass")), MakeChoice(TEXT("Leave"), TEXT("")) }));
		Talk->Nodes.Add(MakeNode(TEXT("message"), TEXT("Not me."), { MakeChoice(TEXT("OK"), TEXT("")) }));
		Talk->Nodes.Add(MakeNode(TEXT("welcome"), TEXT("Pass."), {}));
		return Talk;
	}

	/** A one line conversation with one way out. */
	TStrongObjectPtr<UDojoS4DialogueData> MakeShortTalk(const TCHAR* Line, const TCHAR* Answer)
	{
		TStrongObjectPtr<UDojoS4DialogueData> Talk(NewObject<UDojoS4DialogueData>());
		Talk->StartNode = FName(TEXT("only"));
		Talk->Nodes.Add(MakeNode(TEXT("only"), Line, { MakeChoice(Answer, TEXT("")) }));
		return Talk;
	}

	/** The visible choice texts joined by commas. */
	FString VisibleOf(const UDojoS4DialogueRunner* Runner)
	{
		TArray<FString> Texts;

		for (const FDojoS4DialogueChoice& Choice : Runner->GetVisibleChoices())
		{
			Texts.Add(Choice.Text.ToString());
		}

		return FString::Join(Texts, TEXT(","));
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Runner_FlowsThroughNodes, "Dojo.S4.Runner.FlowsThroughNodes", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays the gate talk from the greeting to the end and checks the state, the text, the refusals, and the order of the events. */
bool FDojo_S4_Runner_FlowsThroughNodes::RunTest(const FString& Parameters)
{
	using namespace DojoS4RunnerTest;

	TStrongObjectPtr<UDojoS4DialogueData> Talk = MakeGateTalk();
	TStrongObjectPtr<UDojoS4DialogueRunner> Runner(NewObject<UDojoS4DialogueRunner>());
	TStrongObjectPtr<UDojoS4FlagStore> Store(NewObject<UDojoS4FlagStore>());
	TStrongObjectPtr<UDojoS4DialogueSpy> Spy(NewObject<UDojoS4DialogueSpy>());
	Spy->Watch(Runner.Get(), Store.Get(), FName(TEXT("pass")));
	Spy->Watch(Runner.Get(), Store.Get(), FName(TEXT("pass")));

	TestTrue(TEXT("A new runner is idle"), Runner->GetState() == EDojoS4DialogueState::EDS_Idle);
	TestEqual(TEXT("An idle runner has no text"), Runner->GetCurrentText().ToString(), FString());
	TestEqual(TEXT("An idle runner offers no choices"), Runner->GetVisibleChoices().Num(), 0);
	TestFalse(TEXT("An idle runner cannot choose"), Runner->Choose(0));
	TestFalse(TEXT("An idle runner cannot advance"), Runner->Advance());
	Runner->End();
	TestEqual(TEXT("Ending an idle runner announces nothing"), Spy->GetLog(), FString());

	TStrongObjectPtr<UDojoS4DialogueData> NoStart(NewObject<UDojoS4DialogueData>());
	NoStart->StartNode = FName(TEXT("nowhere"));
	TestFalse(TEXT("No asset, no conversation"), Runner->Start(nullptr, Store.Get()));
	TestFalse(TEXT("No flag store, no conversation"), Runner->Start(Talk.Get(), nullptr));
	TestFalse(TEXT("A start node that does not exist, no conversation"), Runner->Start(NoStart.Get(), Store.Get()));
	TestEqual(TEXT("Refused starts announce nothing"), Spy->GetLog(), FString());

	TestTrue(TEXT("The gate talk starts"), Runner->Start(Talk.Get(), Store.Get()));
	TestTrue(TEXT("The runner is active"), Runner->GetState() == EDojoS4DialogueState::EDS_Active);
	TestEqual(TEXT("The greeting is shown"), Runner->GetCurrentText().ToString(), FString(TEXT("Halt.")));
	TestEqual(TEXT("The password is hidden until it is known"), VisibleOf(Runner.Get()), FString(TEXT("Message,Leave")));
	TestFalse(TEXT("A second conversation cannot start on top"), Runner->Start(Talk.Get(), Store.Get()));
	TestEqual(TEXT("A refused start changes nothing"), Spy->GetLog(), FString(TEXT("started")));

	TestFalse(TEXT("A choice past the end does not exist"), Runner->Choose(2));
	TestFalse(TEXT("A negative choice does not exist"), Runner->Choose(-1));
	TestFalse(TEXT("A greeting with choices cannot be advanced"), Runner->Advance());
	TestEqual(TEXT("Refused calls announce nothing"), Spy->GetLog(), FString(TEXT("started")));

	TestTrue(TEXT("The first choice works"), Runner->Choose(0));
	TestEqual(TEXT("The conversation moved to the next node"), Runner->GetCurrentText().ToString(), FString(TEXT("Not me.")));
	TestEqual(TEXT("A listener read the new node when the choice was announced"), Spy->GetTextAtLastChoice(), FString(TEXT("Not me.")));
	TestTrue(TEXT("Still active"), Runner->GetState() == EDojoS4DialogueState::EDS_Active);

	TestTrue(TEXT("The last choice works"), Runner->Choose(0));
	TestTrue(TEXT("A choice with no next node ends the conversation"), Runner->GetState() == EDojoS4DialogueState::EDS_Idle);
	TestEqual(TEXT("The events came in order, and the choice before the end"), Spy->GetLog(), FString(TEXT("started, choice 0 Message, choice 0 OK, ended")));
	TestFalse(TEXT("An ended runner cannot choose"), Runner->Choose(0));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Runner_ChoicesFollowFlags, "Dojo.S4.Runner.ChoicesFollowFlags", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays the gate talk without and with the flag the password needs, picking by position, and ends on a closing line. */
bool FDojo_S4_Runner_ChoicesFollowFlags::RunTest(const FString& Parameters)
{
	using namespace DojoS4RunnerTest;

	TStrongObjectPtr<UDojoS4DialogueData> Talk = MakeGateTalk();
	TStrongObjectPtr<UDojoS4DialogueRunner> Runner(NewObject<UDojoS4DialogueRunner>());
	TStrongObjectPtr<UDojoS4FlagStore> Store(NewObject<UDojoS4FlagStore>());
	TStrongObjectPtr<UDojoS4DialogueSpy> Spy(NewObject<UDojoS4DialogueSpy>());
	Spy->Watch(Runner.Get(), Store.Get(), FName(TEXT("pass")));

	Runner->Start(Talk.Get(), Store.Get());
	TestEqual(TEXT("Without the flag two choices are shown"), VisibleOf(Runner.Get()), FString(TEXT("Message,Leave")));
	TestTrue(TEXT("The second shown choice is Leave"), Runner->Choose(1));
	TestTrue(TEXT("Leave ends the conversation"), Runner->GetState() == EDojoS4DialogueState::EDS_Idle);
	TestEqual(TEXT("The choice that ends it is announced while the last node is still current"), Spy->GetTextAtLastChoice(), FString(TEXT("Halt.")));
	TestEqual(TEXT("The log shows Leave, not the hidden choice"), Spy->GetLog(), FString(TEXT("started, choice 1 Leave, ended")));
	TestFalse(TEXT("The password flag was never set"), Store->Has(FName(TEXT("pass"))));

	Store->Set(FName(TEXT("knows")));
	Runner->Start(Talk.Get(), Store.Get());
	TestEqual(TEXT("With the flag all three are shown, in the written order"), VisibleOf(Runner.Get()), FString(TEXT("Message,Password,Leave")));
	TestTrue(TEXT("The second shown choice is now the password"), Runner->Choose(1));
	TestTrue(TEXT("Choosing it set its flag"), Store->Has(FName(TEXT("pass"))));
	TestEqual(TEXT("A listener read the closing line when the choice was announced"), Spy->GetTextAtLastChoice(), FString(TEXT("Pass.")));
	TestTrue(TEXT("The flag was set when the choice was announced"), Spy->WasFlagSetAtLastChoice());
	TestEqual(TEXT("The conversation reached the closing line"), Runner->GetCurrentText().ToString(), FString(TEXT("Pass.")));
	TestEqual(TEXT("A closing line offers nothing to choose"), Runner->GetVisibleChoices().Num(), 0);
	TestFalse(TEXT("Choosing at a closing line does nothing"), Runner->Choose(0));
	TestTrue(TEXT("Advancing ends it"), Runner->Advance());
	TestTrue(TEXT("The runner is idle"), Runner->GetState() == EDojoS4DialogueState::EDS_Idle);
	TestFalse(TEXT("There is nothing left to advance"), Runner->Advance());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Runner_FlagsOpenNewChoices, "Dojo.S4.Runner.FlagsOpenNewChoices", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Answers a question that sends the conversation back to the same node, and checks the flag it set shows a new choice at once. */
bool FDojo_S4_Runner_FlagsOpenNewChoices::RunTest(const FString& Parameters)
{
	using namespace DojoS4RunnerTest;

	TStrongObjectPtr<UDojoS4DialogueData> Talk(NewObject<UDojoS4DialogueData>());
	Talk->StartNode = FName(TEXT("ask"));
	Talk->Nodes.Add(MakeNode(TEXT("ask"), TEXT("Well?"), { MakeChoice(TEXT("Ask about it"), TEXT("ask"), TEXT(""), TEXT("learned")), MakeChoice(TEXT("Say the word"), TEXT(""), TEXT("learned"), TEXT("said")) }));

	TStrongObjectPtr<UDojoS4DialogueRunner> Runner(NewObject<UDojoS4DialogueRunner>());
	TStrongObjectPtr<UDojoS4FlagStore> Store(NewObject<UDojoS4FlagStore>());
	TStrongObjectPtr<UDojoS4DialogueSpy> Spy(NewObject<UDojoS4DialogueSpy>());
	Spy->Watch(Runner.Get(), Store.Get(), FName(TEXT("learned")));

	Runner->Start(Talk.Get(), Store.Get());
	TestEqual(TEXT("Only the question is offered at first"), VisibleOf(Runner.Get()), FString(TEXT("Ask about it")));

	TestTrue(TEXT("Asking works"), Runner->Choose(0));
	TestTrue(TEXT("The flag was set before the choice was announced"), Spy->WasFlagSetAtLastChoice());
	TestEqual(TEXT("The same node now offers the new choice"), VisibleOf(Runner.Get()), FString(TEXT("Ask about it,Say the word")));
	TestTrue(TEXT("The conversation is still going"), Runner->GetState() == EDojoS4DialogueState::EDS_Active);

	TestTrue(TEXT("Saying the word works"), Runner->Choose(1));
	TestTrue(TEXT("Its flag is set"), Store->Has(FName(TEXT("said"))));
	TestTrue(TEXT("The conversation ended"), Runner->GetState() == EDojoS4DialogueState::EDS_Idle);

	Store->Reset();
	TestFalse(TEXT("Resetting the store clears the flags"), Store->Has(FName(TEXT("learned"))));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Runner_OneAfterAnother, "Dojo.S4.Runner.OneAfterAnother", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Arms a chain that starts a second conversation when the first ends, and checks the second is playing and the events are in order. */
bool FDojo_S4_Runner_OneAfterAnother::RunTest(const FString& Parameters)
{
	using namespace DojoS4RunnerTest;

	TStrongObjectPtr<UDojoS4DialogueData> First = MakeShortTalk(TEXT("First."), TEXT("Go on"));
	TStrongObjectPtr<UDojoS4DialogueData> Second = MakeShortTalk(TEXT("Second."), TEXT("Done"));
	TStrongObjectPtr<UDojoS4DialogueRunner> Runner(NewObject<UDojoS4DialogueRunner>());
	TStrongObjectPtr<UDojoS4FlagStore> Store(NewObject<UDojoS4FlagStore>());
	TStrongObjectPtr<UDojoS4DialogueSpy> Spy(NewObject<UDojoS4DialogueSpy>());
	TStrongObjectPtr<UDojoS4DialogueChain> Chain(NewObject<UDojoS4DialogueChain>());
	// The spy is bound first, so for this test its "ended" line is written before the chain starts the follow-up and the log below is written for that order; a real listener must not depend on it.
	Spy->Watch(Runner.Get(), Store.Get(), FName(TEXT("none")));
	Chain->Arm(Runner.Get(), Second.Get(), Store.Get());

	TestTrue(TEXT("The first conversation starts"), Runner->Start(First.Get(), Store.Get()));
	TestTrue(TEXT("Its only choice works"), Runner->Choose(0));

	TestTrue(TEXT("The chain started the follow-up from the end notice"), Chain->DidStartFollowUp());
	TestTrue(TEXT("The runner is playing the second conversation"), Runner->GetState() == EDojoS4DialogueState::EDS_Active);
	TestEqual(TEXT("It shows the second conversation's line"), Runner->GetCurrentText().ToString(), FString(TEXT("Second.")));
	TestEqual(TEXT("The first ended before the second started"), Spy->GetLog(), FString(TEXT("started, choice 0 Go on, ended, started")));

	TestTrue(TEXT("The second conversation can be played"), Runner->Choose(0));
	TestTrue(TEXT("It ends and nothing else starts"), Runner->GetState() == EDojoS4DialogueState::EDS_Idle);
	TestEqual(TEXT("The whole story is in order"), Spy->GetLog(), FString(TEXT("started, choice 0 Go on, ended, started, choice 0 Done, ended")));

	return true;
}

#endif
```

# Hints

- Run the first failing test and read its message: the spy's log shows the events in the order they arrived, and the assertions name what the runner should be doing at each point.
- A listener is called from inside the call that announces, so ask what state the runner is in, and what it still holds, while it calls them.
- Change the state, and let go of the conversation, before you announce the end, so a listener meets the runner as it will be after the call.

# Rubric

- The runner is idle or active, and a second `Start` on an active runner is refused without any event.
- Visible choices are filtered by their required flag in written order, and `Choose` counts positions among the visible ones.
- A choice sets its flag before it is announced, and a choice whose flag was just set shows up at once on the node it returns to.
- Each of the three events is broadcast exactly once per occurrence, in the order started, choice, ended.
- Everything the runner needs is in its asset and its flags; it holds no story, and it holds no pointer to any listener, villager or hero.

# Alternative

The runner could hold a table of states and transitions, one function per node, and the assets could name the function to call. That would let a conversation run code, such as giving the player an item, but it puts story back into code and every new effect needs a programmer. Keeping choices as data that only set flags, and letting other pieces react to flags, keeps the runner small and lets a designer change a conversation without a compile. The runner itself is a small state machine, as in the State pattern of Pack 2's "One mode at a time" world; its two states are the whole of it, and the conversation's data is the Type Object pattern from "Kinds as data". Whatever the runner announces, it announces last: a notice is a moment when any other code may run, so the runner should already be finished with its own state.

# Parsons

```yaml
- id: runner-visible-choices
  prompt: Put the filter in GetVisibleChoices in order.
  lines:
    - "TArray<FDojoS4DialogueChoice> Visible;"
    - "for (const FDojoS4DialogueChoice& Choice : Node->Choices)"
    - "{"
    - "	if (Choice.RequiredFlag.IsNone() || CurrentFlags->Has(Choice.RequiredFlag))"
    - "	{"
    - "		Visible.Add(Choice);"
    - "	}"
    - "}"
    - "return Visible;"
  distractors:
    - line: "	if (Choice.RequiredFlag == NAME_None && CurrentFlags->Has(Choice.RequiredFlag))"
      mistake: A choice with no required flag has the none name, and none is never a set flag, so joining the tests with and hides every choice.
    - line: "		Visible.Insert(Choice, 0);"
      mistake: Inserting at the front reverses the order, and the numbers the player sees must follow the order the designer wrote.
```
