#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p9-arena-parts/DojoP9HealthComponent.h"
#include "Quests/p9-arena-parts/DojoP9LootComponent.h"
#include "Quests/p9-boss-prop-gauntlet/DojoP9GauntletMaster.h"
#include "Quests/p9-gladiator-refactor/DojoP9Gladiator.h"
#include "Quests/p9-sprint-parts/DojoP9StaminaComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoP9GauntletTest
{
	/** A crate with loot, a jar with more loot, a statue with no loot, and a banner with no parts at all. */
	TArray<FDojoP9PropRecipe> StandardRecipes()
	{
		TArray<FDojoP9PropRecipe> Recipes;

		FDojoP9PropRecipe Crate;
		Crate.Name = TEXT("Crate");
		Crate.Spot = FVector(100.f, 0.f, 0.f);
		Crate.MaxHealth = 40.f;
		Crate.bHasLoot = true;
		Crate.LootItem = TEXT("Bandage");
		Crate.LootCount = 1;
		Recipes.Add(Crate);

		FDojoP9PropRecipe Jar;
		Jar.Name = TEXT("Jar");
		Jar.Spot = FVector(400.f, 0.f, 0.f);
		Jar.MaxHealth = 40.f;
		Jar.bHasLoot = true;
		Jar.LootItem = TEXT("Coin");
		Jar.LootCount = 2;
		Recipes.Add(Jar);

		FDojoP9PropRecipe Statue;
		Statue.Name = TEXT("Statue");
		Statue.Spot = FVector(700.f, 0.f, 0.f);
		Statue.MaxHealth = 50.f;
		Recipes.Add(Statue);

		FDojoP9PropRecipe Banner;
		Banner.Name = TEXT("Banner");
		Banner.Spot = FVector(1000.f, 0.f, 0.f);
		Banner.bHasHealth = false;
		Recipes.Add(Banner);

		return Recipes;
	}

	/** Spawns the master last, with the recipes and champion set before its BeginPlay. */
	ADojoP9GauntletMaster* SpawnMaster(FDojoTestWorld& TestWorld, AActor* Champion, const TArray<FDojoP9PropRecipe>& Recipes)
	{
		ADojoP9GauntletMaster* Master = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP9GauntletMaster>(ADojoP9GauntletMaster::StaticClass(), FTransform::Identity);
		Master->Recipes = Recipes;
		Master->Champion = Champion;
		Master->FinishSpawning(FTransform::Identity);
		return Master;
	}

	/** The health part of the round's prop at Index, or nullptr. */
	UDojoP9HealthComponent* PropHealth(ADojoP9GauntletMaster* Master, int32 Index)
	{
		const TArray<AActor*> Props = Master->GetProps();
		return Props.IsValidIndex(Index) && IsValid(Props[Index]) ? Props[Index]->FindComponentByClass<UDojoP9HealthComponent>() : nullptr;
	}

	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** Plays one full round from a fresh start and checks every step; Round names the round in messages. */
	void PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, ADojoP9GauntletMaster* Master, ADojoP9Gladiator* Champion, const FString& Round)
	{
		const auto Say = [&Round](const TCHAR* Text) { return FString::Printf(TEXT("%s: %s"), *Round, Text); };

		Test.TestTrue(Say(TEXT("The round is running")), Master->IsRunning());
		Test.TestEqual(Say(TEXT("Four props were built")), Master->GetProps().Num(), 4);
		Test.TestEqual(Say(TEXT("Three of them can break")), Master->GetBreakableCount(), 3);
		Test.TestEqual(Say(TEXT("Nothing is broken yet")), Master->GetBrokenCount(), 0);
		Test.TestEqual(Say(TEXT("No loot yet")), Master->GetLootCount(), 0);
		Test.TestEqual(Say(TEXT("The champion starts full")), Champion->GetStamina(), 100.f);

		const TArray<AActor*> Props = Master->GetProps();
		Test.TestTrue(Say(TEXT("The crate stands at its spot")), Props.IsValidIndex(0) && IsValid(Props[0]) && Props[0]->GetActorLocation().Equals(FVector(100.f, 0.f, 0.f)));
		Test.TestNull(Say(TEXT("The banner has no health part")), PropHealth(Master, 3));
		Test.TestTrue(Say(TEXT("The jar has a loot part")), Props.IsValidIndex(1) && IsValid(Props[1]) && Props[1]->FindComponentByClass<UDojoP9LootComponent>() != nullptr);
		Test.TestTrue(Say(TEXT("The statue has no loot part")), Props.IsValidIndex(2) && IsValid(Props[2]) && Props[2]->FindComponentByClass<UDojoP9LootComponent>() == nullptr);

		Champion->SetActorLocation(FVector(-500.f, 0.f, 0.f));
		Master->PressStrike();
		Test.TestEqual(Say(TEXT("Nothing in range: no stamina spent")), Champion->GetStamina(), 100.f);

		Champion->SetActorLocation(FVector::ZeroVector);
		Master->PressStrike();
		Master->PressStrike();
		UDojoP9HealthComponent* Crate = PropHealth(Master, 0);
		Test.TestTrue(Say(TEXT("Two strikes break the crate")), Crate && Crate->IsDepleted());
		Test.TestEqual(Say(TEXT("The crate's loot counted")), Master->GetLootCount(), 1);
		Test.TestEqual(Say(TEXT("One broken")), Master->GetBrokenCount(), 1);
		Test.TestTrue(Say(TEXT("The round goes on")), Master->IsRunning());

		Master->PressStrike();
		Test.TestEqual(Say(TEXT("A broken crate is not struck again, so no stamina is spent")), Champion->GetStamina(), 60.f);

		Champion->SetActorLocation(FVector(400.f, 0.f, 0.f));
		Master->PressStrike();
		Master->PressStrike();
		Test.TestEqual(Say(TEXT("The jar's two coins counted")), Master->GetLootCount(), 3);
		Test.TestEqual(Say(TEXT("Two broken")), Master->GetBrokenCount(), 2);

		Champion->SetActorLocation(FVector(700.f, 0.f, 0.f));
		Master->PressStrike();
		Test.TestTrue(Say(TEXT("The last of the stamina went on the statue")), Champion->GetStamina() <= 0.f);
		Master->PressStrike();
		UDojoP9HealthComponent* Statue = PropHealth(Master, 2);
		Test.TestTrue(Say(TEXT("No stamina, no strike")), Statue && FMath::IsNearlyEqual(Statue->GetHealth(), 25.f));

		TestWorld.Tick(60);
		Master->PressStrike();
		Test.TestFalse(Say(TEXT("Breaking the statue wins")), Master->IsRunning());
		Test.TestEqual(Say(TEXT("Three broken")), Master->GetBrokenCount(), 3);
		Test.TestEqual(Say(TEXT("Loot stays at three; the statue has none")), Master->GetLootCount(), 3);
		Test.TestTrue(Say(TEXT("The win took about a second")), Master->GetWinSeconds() > 0.5f && Master->GetWinSeconds() < 2.f);
		Test.TestTrue(Say(TEXT("The label shows the win")), Master->Label->Text.ToString().StartsWith(TEXT("WIN")));
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_PropGauntlet_TwoRoundsPlayAlike, "Dojo.P9.PropGauntlet.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays the same round twice with the gladiator as champion, and checks R is ignored mid-round and a new round starts clean. */
bool FDojo_P9_PropGauntlet_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoP9GauntletTest;

	FDojoTestWorld TestWorld;

	ADojoP9Gladiator* Champion = TestWorld.SpawnActor<ADojoP9Gladiator>();
	if (!TestNotNull(TEXT("Champion spawned"), Champion)) return false;

	ADojoP9GauntletMaster* Master = SpawnMaster(TestWorld, Champion, StandardRecipes());
	if (!TestNotNull(TEXT("Master spawned"), Master)) return false;

	PlayRound(*this, TestWorld, Master, Champion, TEXT("Round 1"));

	const TArray<AActor*> RoundOneProps = Master->GetProps();
	Champion->SetActorLocation(FVector(700.f, 0.f, 0.f));
	const float StaminaBetweenRounds = Champion->GetStamina();
	Master->PressStrike();
	TestEqual(TEXT("Strikes cost nothing between rounds"), Champion->GetStamina(), StaminaBetweenRounds);
	TestEqual(TEXT("And break nothing more"), Master->GetBrokenCount(), 3);

	Master->RestartRound();
	for (AActor* Prop : RoundOneProps) TestFalse(TEXT("Round 1's props are gone"), IsValid(Prop));

	const TArray<AActor*> RoundTwoProps = Master->GetProps();
	Master->RestartRound();
	TestTrue(TEXT("R is ignored while a round runs"), Master->GetProps() == RoundTwoProps);

	PlayRound(*this, TestWorld, Master, Champion, TEXT("Round 2"));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_PropGauntlet_TimeRunsOut, "Dojo.P9.PropGauntlet.TimeRunsOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A round with no strikes ends as TIME UP at 45 seconds; strikes then do nothing, and R gives a full new 45 seconds. */
bool FDojo_P9_PropGauntlet_TimeRunsOut::RunTest(const FString& Parameters)
{
	using namespace DojoP9GauntletTest;

	FDojoTestWorld TestWorld;

	ADojoP9Gladiator* Champion = TestWorld.SpawnActor<ADojoP9Gladiator>();
	if (!TestNotNull(TEXT("Champion spawned"), Champion)) return false;

	ADojoP9GauntletMaster* Master = SpawnMaster(TestWorld, Champion, StandardRecipes());
	if (!TestNotNull(TEXT("Master spawned"), Master)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 44.f);
	TestTrue(TEXT("Still running at 44 seconds"), Master->IsRunning());

	TickUntil(TestWorld, Start + 45.5f);
	TestFalse(TEXT("Time is up at 45 seconds"), Master->IsRunning());
	TestEqual(TEXT("The label says so"), Master->Label->Text.ToString(), FString(TEXT("TIME UP")));

	Champion->SetActorLocation(FVector::ZeroVector);
	Master->PressStrike();
	TestEqual(TEXT("No strikes after time is up"), PropHealth(Master, 0) ? PropHealth(Master, 0)->GetHealth() : -1.f, 40.f);

	Master->RestartRound();
	const float Restart = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Restart + 44.f);
	TestTrue(TEXT("The new round has its own 45 seconds"), Master->IsRunning());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_PropGauntlet_AnyActorCanBeChampion, "Dojo.P9.PropGauntlet.AnyActorCanBeChampion", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A champion with no stamina part is given one at play, and its strikes stop when it runs out. */
bool FDojo_P9_PropGauntlet_AnyActorCanBeChampion::RunTest(const FString& Parameters)
{
	using namespace DojoP9GauntletTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Champion = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Champion spawned"), Champion)) return false;
	TestNull(TEXT("The champion starts with no stamina part"), Champion->FindComponentByClass<UDojoP9StaminaComponent>());

	FDojoP9PropRecipe Pillar;
	Pillar.Name = TEXT("Pillar");
	Pillar.Spot = FVector(50.f, 0.f, 0.f);
	Pillar.MaxHealth = 1000.f;

	ADojoP9GauntletMaster* Master = SpawnMaster(TestWorld, Champion, { Pillar });
	if (!TestNotNull(TEXT("Master spawned"), Master)) return false;

	UDojoP9StaminaComponent* Stamina = Champion->FindComponentByClass<UDojoP9StaminaComponent>();
	if (!TestNotNull(TEXT("The master gave the champion a stamina part"), Stamina)) return false;
	TestEqual(TEXT("And it starts full"), Stamina->GetStamina(), 100.f);

	for (int32 Strike = 0; Strike < 6; Strike++) Master->PressStrike();
	TestEqual(TEXT("Five strikes landed and the sixth had no stamina"), PropHealth(Master, 0) ? PropHealth(Master, 0)->GetHealth() : -1.f, 875.f);

	return true;
}

#endif
