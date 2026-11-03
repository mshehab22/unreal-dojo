#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p13-boss-modded-vault/DojoP13VaultMaster.h"
#include "Quests/p13-door-conditions/DojoP13VaultDoor.h"
#include "Quests/p13-potion-recipes/DojoP13Potion.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoP13VaultTest
{
	/** A recipe step with no number or stat. */
	FDojoP13Instruction RecipeOp(EDojoP13Op Op)
	{
		FDojoP13Instruction Result;
		Result.Op = Op;
		return Result;
	}

	/** A recipe step that pushes Number. */
	FDojoP13Instruction RecipeNumber(int32 Number)
	{
		FDojoP13Instruction Result = RecipeOp(EDojoP13Op::PushNumber);
		Result.Number = Number;
		return Result;
	}

	/** A recipe step that reads or writes Stat. */
	FDojoP13Instruction RecipeStat(EDojoP13Op Op, EDojoP13Stat Stat)
	{
		FDojoP13Instruction Result = RecipeOp(Op);
		Result.Stat = Stat;
		return Result;
	}

	/** A condition step with no number or stat. */
	FDojoP13CheckStep CheckOp(EDojoP13CheckOp Op)
	{
		FDojoP13CheckStep Result;
		Result.Op = Op;
		return Result;
	}

	/** A condition step that pushes Number. */
	FDojoP13CheckStep CheckNumber(int32 Number)
	{
		FDojoP13CheckStep Result = CheckOp(EDojoP13CheckOp::PushNumber);
		Result.Number = Number;
		return Result;
	}

	/** A condition step that reads Stat. */
	FDojoP13CheckStep CheckStat(EDojoP13Stat Stat)
	{
		FDojoP13CheckStep Result = CheckOp(EDojoP13CheckOp::ReadStat);
		Result.Stat = Stat;
		return Result;
	}

	/** A potion entry. */
	FDojoP13ModEntry PotionEntry(const TCHAR* Name, float X, const TArray<FDojoP13Instruction>& Recipe)
	{
		FDojoP13ModEntry Entry;
		Entry.Name = Name;
		Entry.Kind = EDojoP13StationKind::Potion;
		Entry.Spot = FVector(X, 0.f, 0.f);
		Entry.Recipe = Recipe;
		return Entry;
	}

	/** A door entry. */
	FDojoP13ModEntry DoorEntry(const TCHAR* Name, float X, const TArray<FDojoP13CheckStep>& Condition)
	{
		FDojoP13ModEntry Entry;
		Entry.Name = Name;
		Entry.Kind = EDojoP13StationKind::Door;
		Entry.Spot = FVector(X, 0.f, 0.f);
		Entry.Condition = Condition;
		return Entry;
	}

	/** The spec's mod: Purse, Cursed brew, Key brew, the Treasurer's door, Second Wind, and the Vault door. */
	TArray<FDojoP13ModEntry> StandardMod()
	{
		TArray<FDojoP13ModEntry> Mod;

		Mod.Add(PotionEntry(TEXT("Purse"), 100.f, {
			RecipeStat(EDojoP13Op::ReadStat, EDojoP13Stat::Gold), RecipeNumber(12), RecipeOp(EDojoP13Op::Add), RecipeStat(EDojoP13Op::WriteStat, EDojoP13Stat::Gold) }));

		Mod.Add(PotionEntry(TEXT("Cursed brew"), 300.f, {
			RecipeOp(EDojoP13Op::Add), RecipeStat(EDojoP13Op::WriteStat, EDojoP13Stat::Health) }));

		Mod.Add(PotionEntry(TEXT("Key brew"), 500.f, {
			RecipeStat(EDojoP13Op::ReadStat, EDojoP13Stat::Keys), RecipeNumber(1), RecipeOp(EDojoP13Op::Add), RecipeStat(EDojoP13Op::WriteStat, EDojoP13Stat::Keys) }));

		Mod.Add(DoorEntry(TEXT("Treasurer's door"), 700.f, {
			CheckStat(EDojoP13Stat::Gold), CheckNumber(9), CheckOp(EDojoP13CheckOp::Greater),
			CheckStat(EDojoP13Stat::Keys), CheckNumber(0), CheckOp(EDojoP13CheckOp::Equal), CheckOp(EDojoP13CheckOp::Not),
			CheckOp(EDojoP13CheckOp::And) }));

		Mod.Add(PotionEntry(TEXT("Second Wind"), 900.f, {
			RecipeStat(EDojoP13Op::ReadStat, EDojoP13Stat::Health), RecipeStat(EDojoP13Op::ReadStat, EDojoP13Stat::Stamina), RecipeNumber(2),
			RecipeOp(EDojoP13Op::Multiply), RecipeOp(EDojoP13Op::Add), RecipeStat(EDojoP13Op::WriteStat, EDojoP13Stat::Health) }));

		Mod.Add(DoorEntry(TEXT("Vault door"), 1100.f, {
			CheckStat(EDojoP13Stat::Health), CheckNumber(80), CheckOp(EDojoP13CheckOp::Greater) }));

		return Mod;
	}

	/** Spawns the master last, with the mod and champion set before its BeginPlay. */
	ADojoP13VaultMaster* SpawnMaster(FDojoTestWorld& TestWorld, AActor* Champion, const TArray<FDojoP13ModEntry>& Mod)
	{
		ADojoP13VaultMaster* Master = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP13VaultMaster>(ADojoP13VaultMaster::StaticClass(), FTransform::Identity);
		Master->Mod = Mod;
		Master->Champion = Champion;
		Master->FinishSpawning(FTransform::Identity);
		return Master;
	}

	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** Moves the champion to X and presses E. */
	void UseAt(ADojoP13VaultMaster* Master, AActor* Champion, float X)
	{
		Champion->SetActorLocation(FVector(X, 0.f, 0.f));
		Master->PressUse();
	}

	/** Plays one full round from a fresh start and checks every step; Round names the round in messages. */
	void PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, ADojoP13VaultMaster* Master, AActor* Champion, const FString& Round)
	{
		const auto Say = [&Round](const TCHAR* Text) { return FString::Printf(TEXT("%s: %s"), *Round, Text); };

		Test.TestTrue(Say(TEXT("The round is running")), Master->IsRunning());
		Test.TestEqual(Say(TEXT("Six stations were built")), Master->GetStations().Num(), 6);
		Test.TestEqual(Say(TEXT("Two of them are doors")), Master->GetDoorCount(), 2);
		Test.TestEqual(Say(TEXT("No door is open yet")), Master->GetOpenDoorCount(), 0);
		Test.TestEqual(Say(TEXT("Nothing has fizzled yet")), Master->GetFizzleCount(), 0);
		Test.TestEqual(Say(TEXT("The champion starts with 50 health")), Master->GetChampionStats().Health, 50);
		Test.TestEqual(Say(TEXT("And 20 stamina")), Master->GetChampionStats().Stamina, 20);
		Test.TestEqual(Say(TEXT("And no gold")), Master->GetChampionStats().Gold, 0);
		Test.TestEqual(Say(TEXT("And no keys")), Master->GetChampionStats().Keys, 0);
		Test.TestTrue(Say(TEXT("The label counts the doors")), Master->Label->Text.ToString().StartsWith(TEXT("Doors 0/2")));

		const TArray<AActor*> Stations = Master->GetStations();
		Test.TestTrue(Say(TEXT("The first station is a potion at its spot")), Stations.IsValidIndex(0) && Cast<ADojoP13Potion>(Stations[0]) && Stations[0]->GetActorLocation().Equals(FVector(100.f, 0.f, 0.f)));
		Test.TestTrue(Say(TEXT("The fourth station is a door at its spot")), Stations.IsValidIndex(3) && Cast<ADojoP13VaultDoor>(Stations[3]) && Stations[3]->GetActorLocation().Equals(FVector(700.f, 0.f, 0.f)));

		UseAt(Master, Champion, -500.f);
		Test.TestEqual(Say(TEXT("Nothing in range: nothing changes")), Master->GetChampionStats().Gold, 0);

		UseAt(Master, Champion, 1100.f);
		Test.TestEqual(Say(TEXT("The vault door stays shut at 50 health")), Master->GetOpenDoorCount(), 0);
		Test.TestTrue(Say(TEXT("A shut door does not end the round")), Master->IsRunning());

		UseAt(Master, Champion, 200.f);
		Test.TestEqual(Say(TEXT("A tie between the purse and the cursed brew goes to the purse, the earlier entry")), Master->GetChampionStats().Gold, 12);
		Test.TestEqual(Say(TEXT("The purse did not fizzle")), Master->GetFizzleCount(), 0);

		UseAt(Master, Champion, 200.f);
		Test.TestEqual(Say(TEXT("The drunk purse is skipped and the cursed brew fizzles")), Master->GetFizzleCount(), 1);
		Test.TestEqual(Say(TEXT("The fizzle left health alone")), Master->GetChampionStats().Health, 50);
		Test.TestEqual(Say(TEXT("And gold alone")), Master->GetChampionStats().Gold, 12);
		Test.TestTrue(Say(TEXT("A fizzle does not stop the round")), Master->IsRunning());

		UseAt(Master, Champion, 200.f);
		Test.TestEqual(Say(TEXT("Both potions in range are used: nothing more happens")), Master->GetFizzleCount(), 1);

		UseAt(Master, Champion, 700.f);
		Test.TestEqual(Say(TEXT("The treasurer's door stays shut without a key")), Master->GetOpenDoorCount(), 0);

		UseAt(Master, Champion, 500.f);
		Test.TestEqual(Say(TEXT("The key brew gives a key")), Master->GetChampionStats().Keys, 1);

		UseAt(Master, Champion, 700.f);
		Test.TestEqual(Say(TEXT("With 12 gold and a key the treasurer's door opens")), Master->GetOpenDoorCount(), 1);
		ADojoP13VaultDoor* Treasurer = Stations.IsValidIndex(3) ? Cast<ADojoP13VaultDoor>(Stations[3]) : nullptr;
		Test.TestTrue(Say(TEXT("The door itself is open")), Treasurer && Treasurer->IsOpen());
		Test.TestTrue(Say(TEXT("The label counts it")), Master->Label->Text.ToString().StartsWith(TEXT("Doors 1/2")));

		UseAt(Master, Champion, 700.f);
		Test.TestEqual(Say(TEXT("At the open door nothing else is in range, so health is unchanged")), Master->GetChampionStats().Health, 50);

		UseAt(Master, Champion, 900.f);
		Test.TestEqual(Say(TEXT("Second Wind raises health to 50 plus twice 20")), Master->GetChampionStats().Health, 90);
		Test.TestEqual(Say(TEXT("Stamina is only read")), Master->GetChampionStats().Stamina, 20);

		TestWorld.Tick(60);
		UseAt(Master, Champion, 1100.f);
		Test.TestEqual(Say(TEXT("At 90 health the vault door opens")), Master->GetOpenDoorCount(), 2);
		Test.TestFalse(Say(TEXT("Every door open wins")), Master->IsRunning());
		Test.TestTrue(Say(TEXT("The win took about a second")), Master->GetWinSeconds() > 0.5f && Master->GetWinSeconds() < 2.f);
		Test.TestTrue(Say(TEXT("The label shows the win")), Master->Label->Text.ToString().StartsWith(TEXT("WIN")));
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_ModdedVault_TwoRoundsPlayAlike, "Dojo.P13.ModdedVault.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays the same round twice, and checks nothing can be used between rounds, R is ignored mid-round, and a new round starts clean. */
bool FDojo_P13_ModdedVault_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoP13VaultTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Champion = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Champion spawned"), Champion)) return false;

	ADojoP13VaultMaster* Master = SpawnMaster(TestWorld, Champion, StandardMod());
	if (!TestNotNull(TEXT("Master spawned"), Master)) return false;

	PlayRound(*this, TestWorld, Master, Champion, TEXT("Round 1"));

	const TArray<AActor*> RoundOneStations = Master->GetStations();
	const FDojoP13Stats StatsBetweenRounds = Master->GetChampionStats();
	UseAt(Master, Champion, 100.f);
	TestEqual(TEXT("Nothing is used between rounds"), Master->GetChampionStats().Gold, StatsBetweenRounds.Gold);

	Master->RestartRound();
	for (AActor* Station : RoundOneStations) TestFalse(TEXT("Round 1's stations are gone"), IsValid(Station));

	const TArray<AActor*> RoundTwoStations = Master->GetStations();
	Master->RestartRound();
	TestTrue(TEXT("R is ignored while a round runs"), Master->GetStations() == RoundTwoStations);

	PlayRound(*this, TestWorld, Master, Champion, TEXT("Round 2"));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P13_ModdedVault_TimeRunsOut, "Dojo.P13.ModdedVault.TimeRunsOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A round with no doors opened ends as TIME UP at 60 seconds; nothing can be used then, and R gives a full new 60 seconds. */
bool FDojo_P13_ModdedVault_TimeRunsOut::RunTest(const FString& Parameters)
{
	using namespace DojoP13VaultTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Champion = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Champion spawned"), Champion)) return false;

	ADojoP13VaultMaster* Master = SpawnMaster(TestWorld, Champion, StandardMod());
	if (!TestNotNull(TEXT("Master spawned"), Master)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 59.f);
	TestTrue(TEXT("Still running at 59 seconds"), Master->IsRunning());

	TickUntil(TestWorld, Start + 60.5f);
	TestFalse(TEXT("Time is up at 60 seconds"), Master->IsRunning());
	TestEqual(TEXT("The label says so"), Master->Label->Text.ToString(), FString(TEXT("TIME UP")));

	UseAt(Master, Champion, 100.f);
	TestEqual(TEXT("Nothing is drunk after time is up"), Master->GetChampionStats().Gold, 0);

	Master->RestartRound();
	const float Restart = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Restart + 59.f);
	TestTrue(TEXT("A new round runs a full 60 seconds"), Master->IsRunning());

	UseAt(Master, Champion, 100.f);
	TestEqual(TEXT("And its purse can be drunk"), Master->GetChampionStats().Gold, 12);

	TickUntil(TestWorld, Restart + 60.5f);
	TestFalse(TEXT("And then ends"), Master->IsRunning());

	return true;
}

#endif
