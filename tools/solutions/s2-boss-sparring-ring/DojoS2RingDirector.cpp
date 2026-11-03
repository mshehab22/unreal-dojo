#include "DojoS2RingDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Quests/s2-ability-component/DojoS2AbilityComponent.h"
#include "Quests/s2-ability-data/DojoS2AbilityData.h"
#include "Quests/s2-effects/DojoS2Effect.h"
#include "Quests/s2-energy/DojoS2EnergyComponent.h"

ADojoS2RingDirector::ADojoS2RingDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	RootComponent = Board;
}

void ADojoS2RingDirector::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Hero))
	{
		return;
	}

	HeroAbilities = Hero->FindComponentByClass<UDojoS2AbilityComponent>();
	HeroEnergy = Hero->FindComponentByClass<UDojoS2EnergyComponent>();

	if (HeroAbilities == nullptr || HeroEnergy == nullptr)
	{
		return;
	}

	HeroAbilities->UseEnergy(HeroEnergy);

	for (UDojoS2AbilityData* Ability : Loadout)
	{
		HeroAbilities->Grant(Ability);
	}

	HeroAbilities->OnAbilityActivated.AddUniqueDynamic(this, &ADojoS2RingDirector::HandleAbilityActivated);
	HeroAbilities->OnCooldownChanged.AddUniqueDynamic(this, &ADojoS2RingDirector::HandleCooldownChanged);
	HeroEnergy->OnEnergyChanged.AddUniqueDynamic(this, &ADojoS2RingDirector::HandleEnergyChanged);

	HeroStart = Hero->GetActorTransform();
	DummyStarts.Reset();

	for (const AActor* Dummy : Dummies)
	{
		DummyStarts.Add(IsValid(Dummy) ? Dummy->GetActorLocation() : FVector::ZeroVector);
	}

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);

		for (const FKey& Key : { EKeys::One, EKeys::Two, EKeys::Three, EKeys::Left, EKeys::Right, EKeys::R })
		{
			InputComponent->BindKey(Key, IE_Pressed, this, &ADojoS2RingDirector::HandleKey);
		}
	}

	StartRound();
}

void ADojoS2RingDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (HeroAbilities != nullptr)
	{
		HeroAbilities->OnAbilityActivated.RemoveDynamic(this, &ADojoS2RingDirector::HandleAbilityActivated);
		HeroAbilities->OnCooldownChanged.RemoveDynamic(this, &ADojoS2RingDirector::HandleCooldownChanged);
	}

	if (HeroEnergy != nullptr)
	{
		HeroEnergy->OnEnergyChanged.RemoveDynamic(this, &ADojoS2RingDirector::HandleEnergyChanged);
	}

	Super::EndPlay(EndPlayReason);
}

void ADojoS2RingDirector::PressAbility(int32 LoadoutIndex)
{
	if (!bRunning || HeroAbilities == nullptr || !Loadout.IsValidIndex(LoadoutIndex))
	{
		return;
	}

	// The ability component decides; a refused start changes nothing here either.
	HeroAbilities->TryActivate(Loadout[LoadoutIndex]);
}

void ADojoS2RingDirector::PressTurnLeft()
{
	TurnHero(-TurnDegrees);
}

void ADojoS2RingDirector::PressTurnRight()
{
	TurnHero(TurnDegrees);
}

void ADojoS2RingDirector::RestartRound()
{
	if (!bFinished || HeroAbilities == nullptr || HeroEnergy == nullptr)
	{
		return;
	}

	StartRound();
}

bool ADojoS2RingDirector::IsRunning() const
{
	return bRunning;
}

float ADojoS2RingDirector::GetFinishSeconds() const
{
	return FinishSeconds;
}

int32 ADojoS2RingDirector::CountOut() const
{
	int32 Out = 0;

	for (const AActor* Dummy : Dummies)
	{
		if (IsValid(Dummy) && FVector::Dist2D(Dummy->GetActorLocation(), RingCenter) > RingRadius)
		{
			++Out;
		}
	}

	return Out;
}

void ADojoS2RingDirector::HandleAbilityActivated(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability)
{
	if (Ability != nullptr && IsValid(Hero))
	{
		for (UDojoS2Effect* Effect : Ability->Effects)
		{
			if (Effect != nullptr)
			{
				Effect->Apply(Hero);
			}
		}
	}

	RefreshBoard();
}

void ADojoS2RingDirector::HandleCooldownChanged(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability)
{
	RefreshBoard();
}

void ADojoS2RingDirector::HandleEnergyChanged(UDojoS2EnergyComponent* EnergySource)
{
	RefreshBoard();
}

void ADojoS2RingDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::One) PressAbility(0);
	if (Key == EKeys::Two) PressAbility(1);
	if (Key == EKeys::Three) PressAbility(2);
	if (Key == EKeys::Left) PressTurnLeft();
	if (Key == EKeys::Right) PressTurnRight();
	if (Key == EKeys::R) RestartRound();
}

void ADojoS2RingDirector::TurnHero(float Degrees)
{
	if (bRunning && IsValid(Hero))
	{
		Hero->AddActorWorldRotation(FRotator(0.f, Degrees, 0.f));
	}
}

void ADojoS2RingDirector::StartRound()
{
	bRunning = false;
	bFinished = false;
	FinishSeconds = 0.f;

	Hero->SetActorTransform(HeroStart);

	for (int32 Index = 0; Index < Dummies.Num(); ++Index)
	{
		if (IsValid(Dummies[Index]) && DummyStarts.IsValidIndex(Index))
		{
			Dummies[Index]->SetActorLocation(DummyStarts[Index]);
		}
	}

	HeroAbilities->ResetAll();
	HeroEnergy->Refill();

	bRunning = true;
	StartSeconds = GetWorld()->GetTimeSeconds();
	RefreshBoard();
}

void ADojoS2RingDirector::RefreshBoard()
{
	if (HeroAbilities == nullptr || HeroEnergy == nullptr)
	{
		return;
	}

	const int32 Out = CountOut();

	if (bRunning && Dummies.Num() > 0 && Out == Dummies.Num())
	{
		bRunning = false;
		bFinished = true;
		FinishSeconds = GetWorld()->GetTimeSeconds() - StartSeconds;
	}

	TArray<FString> Lines;
	Lines.Add(FString::Printf(TEXT("Energy %d/%d"), HeroEnergy->GetEnergy(), HeroEnergy->MaxEnergy));

	for (int32 Index = 0; Index < Loadout.Num(); ++Index)
	{
		UDojoS2AbilityData* Ability = Loadout[Index];
		const FString AbilityName = Ability != nullptr ? Ability->DisplayName.ToString() : FString(TEXT("?"));
		const TCHAR* State = HeroAbilities->IsOnCooldown(Ability) ? TEXT("cooling") : TEXT("ready");
		Lines.Add(FString::Printf(TEXT("%d. %s %s"), Index + 1, *AbilityName, State));
	}

	Lines.Add(FString::Printf(TEXT("Out %d/%d"), Out, Dummies.Num()));

	if (bFinished)
	{
		Lines.Add(FString::Printf(TEXT("CLEAR in %.1f s"), FinishSeconds));
	}

	Board->SetText(FText::FromString(FString::Join(Lines, TEXT("\n"))));
}
