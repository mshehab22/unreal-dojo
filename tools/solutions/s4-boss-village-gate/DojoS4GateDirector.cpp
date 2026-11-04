#include "DojoS4GateDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Quests/s4-dialogue-runner/DojoS4DialogueRunner.h"
#include "Quests/s4-dialogue-runner/DojoS4FlagStore.h"
#include "Quests/s4-interactable/DojoS4Door.h"
#include "Quests/s4-interactor/DojoS4Interactor.h"
#include "Quests/s4-villager/DojoS4Villager.h"

ADojoS4GateDirector::ADojoS4GateDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	RootComponent = Board;
}

void ADojoS4GateDirector::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Hero) || !IsValid(Gate))
	{
		return;
	}

	HeroInteractor = Hero->FindComponentByClass<UDojoS4Interactor>();

	if (HeroInteractor == nullptr)
	{
		return;
	}

	Runner = NewObject<UDojoS4DialogueRunner>(this);
	FlagStore = NewObject<UDojoS4FlagStore>(this);

	for (ADojoS4Villager* Villager : Villagers)
	{
		if (IsValid(Villager))
		{
			Villager->Runner = Runner;
			Villager->FlagStore = FlagStore;
		}
	}

	HeroInteractor->OnFocusChanged.AddUniqueDynamic(this, &ADojoS4GateDirector::HandleFocusChanged);
	Runner->OnDialogueStarted.AddUniqueDynamic(this, &ADojoS4GateDirector::HandleStarted);
	Runner->OnChoiceMade.AddUniqueDynamic(this, &ADojoS4GateDirector::HandleChoice);
	Runner->OnDialogueEnded.AddUniqueDynamic(this, &ADojoS4GateDirector::HandleEnded);
	FlagStore->OnFlagSet.AddUniqueDynamic(this, &ADojoS4GateDirector::HandleFlagSet);

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);

		for (const FKey& Key : { EKeys::E, EKeys::R, EKeys::One, EKeys::Two, EKeys::Three })
		{
			InputComponent->BindKey(Key, IE_Pressed, this, &ADojoS4GateDirector::HandleKey);
		}
	}

	StartRound();
}

void ADojoS4GateDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (HeroInteractor != nullptr)
	{
		HeroInteractor->OnFocusChanged.RemoveDynamic(this, &ADojoS4GateDirector::HandleFocusChanged);
	}

	if (Runner != nullptr)
	{
		Runner->OnDialogueStarted.RemoveDynamic(this, &ADojoS4GateDirector::HandleStarted);
		Runner->OnChoiceMade.RemoveDynamic(this, &ADojoS4GateDirector::HandleChoice);
		Runner->OnDialogueEnded.RemoveDynamic(this, &ADojoS4GateDirector::HandleEnded);
	}

	if (FlagStore != nullptr)
	{
		FlagStore->OnFlagSet.RemoveDynamic(this, &ADojoS4GateDirector::HandleFlagSet);
	}

	Super::EndPlay(EndPlayReason);
}

void ADojoS4GateDirector::PressInteract()
{
	if (!bRunning || HeroInteractor == nullptr)
	{
		return;
	}

	if (InputMode == EDojoS4InputMode::EIM_Talking)
	{
		Runner->Advance();
		return;
	}

	HeroInteractor->TryInteract();

	if (Gate->IsOpen())
	{
		bRunning = false;
		bFinished = true;
		FinishSeconds = GetWorld()->GetTimeSeconds() - StartSeconds;
		RefreshBoard();
	}
}

void ADojoS4GateDirector::PressChoice(int32 Number)
{
	if (!bRunning || InputMode != EDojoS4InputMode::EIM_Talking)
	{
		return;
	}

	Runner->Choose(Number - 1);
}

void ADojoS4GateDirector::RestartRound()
{
	if (bRunning || HeroInteractor == nullptr)
	{
		return;
	}

	StartRound();
}

bool ADojoS4GateDirector::IsRunning() const
{
	return bRunning;
}

float ADojoS4GateDirector::GetFinishSeconds() const
{
	return FinishSeconds;
}

EDojoS4InputMode ADojoS4GateDirector::GetInputMode() const
{
	return InputMode;
}

UDojoS4DialogueRunner* ADojoS4GateDirector::GetRunner() const
{
	return Runner;
}

UDojoS4FlagStore* ADojoS4GateDirector::GetFlags() const
{
	return FlagStore;
}

void ADojoS4GateDirector::HandleFocusChanged(AActor* Focus, FText Prompt)
{
	RefreshBoard();
}

void ADojoS4GateDirector::HandleStarted(UDojoS4DialogueData* Dialogue)
{
	InputMode = EDojoS4InputMode::EIM_Talking;
	SetWalkingAllowed(false);
	RefreshBoard();
}

void ADojoS4GateDirector::HandleChoice(int32 Index, FText ChoiceText)
{
	RefreshBoard();
}

void ADojoS4GateDirector::HandleEnded()
{
	InputMode = EDojoS4InputMode::EIM_Exploring;
	SetWalkingAllowed(true);
	HeroInteractor->Refresh();
	RefreshBoard();
}

void ADojoS4GateDirector::HandleFlagSet(FName Flag)
{
	if (Flag == PassFlag)
	{
		Gate->Unlock();
		HeroInteractor->Refresh();
	}
}

void ADojoS4GateDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::E)
	{
		PressInteract();
	}

	if (Key == EKeys::R)
	{
		RestartRound();
	}

	if (Key == EKeys::One)
	{
		PressChoice(1);
	}

	if (Key == EKeys::Two)
	{
		PressChoice(2);
	}

	if (Key == EKeys::Three)
	{
		PressChoice(3);
	}
}

void ADojoS4GateDirector::StartRound()
{
	bRunning = false;
	bFinished = false;
	FinishSeconds = 0.f;

	Runner->End();
	FlagStore->Reset();
	Gate->Lock();
	Hero->SetActorLocation(StartLocation);
	HeroInteractor->Refresh();

	StartSeconds = GetWorld()->GetTimeSeconds();
	bRunning = true;
	RefreshBoard();
}

void ADojoS4GateDirector::SetWalkingAllowed(bool bAllowed)
{
	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		Player->SetIgnoreMoveInput(!bAllowed);
	}
}

void ADojoS4GateDirector::RefreshBoard()
{
	if (HeroInteractor == nullptr || Runner == nullptr)
	{
		return;
	}

	TArray<FString> Lines;

	if (InputMode == EDojoS4InputMode::EIM_Talking)
	{
		Lines.Add(Runner->GetCurrentText().ToString());

		const TArray<FDojoS4DialogueChoice> Choices = Runner->GetVisibleChoices();

		for (int32 Index = 0; Index < Choices.Num(); ++Index)
		{
			Lines.Add(FString::Printf(TEXT("%d. %s"), Index + 1, *Choices[Index].Text.ToString()));
		}

		if (Choices.Num() == 0)
		{
			Lines.Add(TEXT("(E to continue)"));
		}
	}
	else
	{
		const FText Prompt = HeroInteractor->GetFocusPrompt();
		Lines.Add(FString::Printf(TEXT("Prompt: %s"), Prompt.IsEmpty() ? TEXT("none") : *Prompt.ToString()));
	}

	if (bFinished)
	{
		Lines.Add(FString::Printf(TEXT("GATE OPEN in %.1f s"), FinishSeconds));
	}

	Board->SetText(FText::FromString(FString::Join(Lines, TEXT("\n"))));
}
