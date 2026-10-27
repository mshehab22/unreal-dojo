#include "DojoP9GauntletMaster.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/p9-arena-parts/DojoP9HealthComponent.h"
#include "Quests/p9-arena-parts/DojoP9LootComponent.h"
#include "Quests/p9-sprint-parts/DojoP9StaminaComponent.h"
#include "TimerManager.h"

ADojoP9GauntletMaster::ADojoP9GauntletMaster()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP9GauntletMaster::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Champion)) Champion = UGameplayStatics::GetPlayerPawn(this, 0);

	if (IsValid(Champion) && !Champion->FindComponentByClass<UDojoP9StaminaComponent>())
	{
		UDojoP9StaminaComponent* Stamina = NewObject<UDojoP9StaminaComponent>(Champion);
		Champion->AddInstanceComponent(Stamina);
		Stamina->RegisterComponent();
	}

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::E, IE_Pressed, this, &ADojoP9GauntletMaster::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP9GauntletMaster::HandleKey);
	}

	StartRound();
}

void ADojoP9GauntletMaster::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (AActor* Prop : Props)
	{
		if (!IsValid(Prop)) continue;

		if (UDojoP9HealthComponent* Health = Prop->FindComponentByClass<UDojoP9HealthComponent>()) Health->OnDepleted.RemoveDynamic(this, &ADojoP9GauntletMaster::HandlePropBroken);
		if (UDojoP9LootComponent* Loot = Prop->FindComponentByClass<UDojoP9LootComponent>()) Loot->OnLootDropped.RemoveDynamic(this, &ADojoP9GauntletMaster::HandleLootDropped);
	}

	GetWorldTimerManager().ClearTimer(RoundTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoP9GauntletMaster::PressStrike()
{
	if (!bRunning || !IsValid(Champion)) return;

	UDojoP9HealthComponent* Target = nullptr;
	float NearestDistance = StrikeRange;

	for (AActor* Prop : Props)
	{
		UDojoP9HealthComponent* Health = IsValid(Prop) ? Prop->FindComponentByClass<UDojoP9HealthComponent>() : nullptr;
		if (!Health || Health->IsDepleted()) continue;

		// Strictly nearer only, so the earlier recipe keeps a tie.
		const float Distance = FVector::Dist(Champion->GetActorLocation(), Prop->GetActorLocation());
		if (Distance > NearestDistance || (Target && Distance == NearestDistance)) continue;

		Target = Health;
		NearestDistance = Distance;
	}

	if (!Target) return;

	UDojoP9StaminaComponent* Stamina = Champion->FindComponentByClass<UDojoP9StaminaComponent>();
	if (!Stamina || !Stamina->TrySpend(StrikeStamina)) return;

	Target->ApplyDamage(StrikeDamage);
}

void ADojoP9GauntletMaster::RestartRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoP9GauntletMaster::IsRunning() const
{
	return bRunning;
}

TArray<AActor*> ADojoP9GauntletMaster::GetProps() const
{
	TArray<AActor*> Result;
	for (AActor* Prop : Props) Result.Add(Prop);
	return Result;
}

int32 ADojoP9GauntletMaster::GetBrokenCount() const
{
	return BrokenCount;
}

int32 ADojoP9GauntletMaster::GetBreakableCount() const
{
	return BreakableCount;
}

int32 ADojoP9GauntletMaster::GetLootCount() const
{
	return LootCount;
}

float ADojoP9GauntletMaster::GetWinSeconds() const
{
	return WinSeconds;
}

void ADojoP9GauntletMaster::StartRound()
{
	ClearProps();

	if (IsValid(Champion))
	{
		if (UDojoP9StaminaComponent* Stamina = Champion->FindComponentByClass<UDojoP9StaminaComponent>()) Stamina->Refill();
	}

	BrokenCount = 0;
	BreakableCount = 0;
	LootCount = 0;
	WinSeconds = 0.f;
	bWon = false;

	for (const FDojoP9PropRecipe& Recipe : Recipes)
	{
		Props.Add(BuildProp(Recipe));
		if (Recipe.bHasHealth) BreakableCount++;
	}

	bRunning = true;
	StartedAt = GetWorld()->GetTimeSeconds();
	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP9GauntletMaster::HandleTimeUp, RoundSeconds, false);
	RefreshLabel();
}

void ADojoP9GauntletMaster::EndRound(bool bRoundWon)
{
	bRunning = false;
	bWon = bRoundWon;
	GetWorldTimerManager().ClearTimer(RoundTimer);

	if (bRoundWon) WinSeconds = GetWorld()->GetTimeSeconds() - StartedAt;

	RefreshLabel();
}

template<typename TPart>
TPart* ADojoP9GauntletMaster::AddPart(AActor* Prop, TFunctionRef<void(TPart&)> Setup)
{
	TPart* Part = NewObject<TPart>(Prop);
	Setup(*Part);
	Prop->AddInstanceComponent(Part);
	Part->RegisterComponent();
	return Part;
}

AActor* ADojoP9GauntletMaster::BuildProp(const FDojoP9PropRecipe& Recipe)
{
	AActor* Prop = GetWorld()->SpawnActor<AActor>(AActor::StaticClass(), FTransform::Identity);

	// A plain actor has no transform until it gets a scene component as its root.
	UTextRenderComponent* Tag = AddPart<UTextRenderComponent>(Prop, [&Recipe](UTextRenderComponent& Part)
	{
		Part.SetText(FText::FromString(Recipe.Name));
		Part.SetHorizontalAlignment(EHTA_Center);
	});
	Prop->SetRootComponent(Tag);
	Prop->SetActorLocation(Recipe.Spot);

	UDojoP9HealthComponent* Health = nullptr;
	if (Recipe.bHasHealth) Health = AddPart<UDojoP9HealthComponent>(Prop, [&Recipe](UDojoP9HealthComponent& Part) { Part.MaxHealth = Recipe.MaxHealth; });

	if (Recipe.bHasLoot)
	{
		UDojoP9LootComponent* Loot = AddPart<UDojoP9LootComponent>(Prop, [&Recipe](UDojoP9LootComponent& Part)
		{
			Part.LootItem = Recipe.LootItem;
			Part.LootCount = Recipe.LootCount;
		});
		Loot->ListenTo(Health);
		Loot->OnLootDropped.AddDynamic(this, &ADojoP9GauntletMaster::HandleLootDropped);
	}

	if (Health) Health->OnDepleted.AddDynamic(this, &ADojoP9GauntletMaster::HandlePropBroken);

	return Prop;
}

void ADojoP9GauntletMaster::ClearProps()
{
	for (AActor* Prop : Props)
	{
		if (!IsValid(Prop)) continue;

		if (UDojoP9HealthComponent* Health = Prop->FindComponentByClass<UDojoP9HealthComponent>()) Health->OnDepleted.RemoveDynamic(this, &ADojoP9GauntletMaster::HandlePropBroken);
		if (UDojoP9LootComponent* Loot = Prop->FindComponentByClass<UDojoP9LootComponent>()) Loot->OnLootDropped.RemoveDynamic(this, &ADojoP9GauntletMaster::HandleLootDropped);

		Prop->Destroy();
	}

	Props.Reset();
}

void ADojoP9GauntletMaster::HandlePropBroken(UDojoP9HealthComponent* Health)
{
	if (!bRunning) return;

	BrokenCount++;

	if (UTextRenderComponent* Tag = Health->GetOwner()->FindComponentByClass<UTextRenderComponent>()) Tag->SetText(FText::FromString(TEXT("Broken")));

	if (BrokenCount >= BreakableCount)
	{
		EndRound(true);
		return;
	}

	RefreshLabel();
}

void ADojoP9GauntletMaster::HandleLootDropped(FName Item, int32 Count)
{
	LootCount += Count;
	RefreshLabel();
}

void ADojoP9GauntletMaster::HandleTimeUp()
{
	EndRound(false);
}

void ADojoP9GauntletMaster::HandleKey(FKey Key)
{
	if (Key == EKeys::E) PressStrike();
	else if (Key == EKeys::R) RestartRound();
}

void ADojoP9GauntletMaster::RefreshLabel()
{
	FString Text;

	if (bRunning) Text = FString::Printf(TEXT("Broken %d/%d  Loot %d"), BrokenCount, BreakableCount, LootCount);
	else if (bWon) Text = FString::Printf(TEXT("WIN %.1f  Loot %d"), WinSeconds, LootCount);
	else Text = TEXT("TIME UP");

	Label->SetText(FText::FromString(Text));
}
