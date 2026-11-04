#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p23-boss-arena-night/DojoP23ArenaNight.h"
#include "Quests/p6-knockout-herald/DojoP6Fighter.h"
#include "Quests/p9-arena-parts/DojoP9HealthComponent.h"
#include "Quests/p9-arena-parts/DojoP9LootComponent.h"
#include "Support/DojoTestWorld.h"

namespace DojoP23NightTest
{
	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** One fighter of the roster. */
	FDojoP23FighterPlan MakePlan(const TCHAR* PlanName, int32 PlanTeam, float PlanHealth, const TCHAR* Item, int32 Count, float AlongX)
	{
		FDojoP23FighterPlan Plan;
		Plan.FighterName = PlanName;
		Plan.Team = PlanTeam;
		Plan.MaxHealth = PlanHealth;
		Plan.LootItem = Item;
		Plan.LootCount = Count;
		Plan.StartLocation = FVector(AlongX, 0.f, 0.f);
		return Plan;
	}

	/** One blow of a script. */
	FDojoP23ScriptedStrike MakeBlow(int32 BlowTurn, const TCHAR* Striker, const TCHAR* Struck, float BlowDamage)
	{
		FDojoP23ScriptedStrike Blow;
		Blow.Turn = BlowTurn;
		Blow.Attacker = Striker;
		Blow.Target = Struck;
		Blow.Damage = BlowDamage;
		return Blow;
	}

	/** Spawns a night with the four-fighter roster and the first script, with Tune run on it before its BeginPlay starts night 1. */
	ADojoP23ArenaNight* SpawnNight(FDojoTestWorld& TestWorld, TFunctionRef<void(ADojoP23ArenaNight&)> Tune)
	{
		ADojoP23ArenaNight* Night = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP23ArenaNight>(ADojoP23ArenaNight::StaticClass(), FTransform::Identity);
		if (Night)
		{
			Night->Roster = { MakePlan(TEXT("Ash"), 1, 40.f, TEXT("Bandage"), 1, 0.f), MakePlan(TEXT("Birch"), 1, 30.f, TEXT("Coin"), 2, 100.f), MakePlan(TEXT("Cedar"), 2, 30.f, TEXT("Coin"), 3, 200.f), MakePlan(TEXT("Dune"), 2, 50.f, TEXT("Bandage"), 2, 300.f) };
			Night->Script = { MakeBlow(1, TEXT("Ash"), TEXT("Cedar"), 20.f), MakeBlow(2, TEXT("Ash"), TEXT("Cedar"), 20.f), MakeBlow(2, TEXT("Birch"), TEXT("Dune"), 25.f), MakeBlow(3, TEXT("Dune"), TEXT("Ash"), 40.f), MakeBlow(3, TEXT("Dune"), TEXT("Birch"), 30.f), MakeBlow(4, TEXT("Birch"), TEXT("Dune"), 25.f), MakeBlow(5, TEXT("Cedar"), TEXT("Dune"), 10.f) };
			Tune(*Night);
			Night->FinishSpawning(FTransform::Identity);
		}
		return Night;
	}

	/** The health a fighter has left, or -1 when it is out of the arena. */
	float HealthOf(const ADojoP23ArenaNight* Night, const TCHAR* FighterName)
	{
		const ADojoP6Fighter* Fighter = Night->GetFighter(FighterName);
		const UDojoP9HealthComponent* Health = Fighter ? Fighter->FindComponentByClass<UDojoP9HealthComponent>() : nullptr;
		return Health ? Health->GetHealth() : -1.f;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_ArenaNight_TwoNightsOfBlowsAndKnockouts, "Dojo.P23.ArenaNight.TwoNightsOfBlowsAndKnockouts", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two nights: blows land turn by turn, loot drops once, and knockouts in one turn are announced together after the turn. */
bool FDojo_P23_ArenaNight_TwoNightsOfBlowsAndKnockouts::RunTest(const FString& Parameters)
{
	using namespace DojoP23NightTest;

	FDojoTestWorld TestWorld;

	ADojoP23ArenaNight* Night = SpawnNight(TestWorld, [](ADojoP23ArenaNight&) {});
	if (!TestNotNull(TEXT("Night spawned"), Night)) return false;
	if (!TestNotNull(TEXT("The night made its herald"), Night->GetHerald())) return false;

	TestTrue(TEXT("Night 1 is running"), Night->IsRunning());
	TestEqual(TEXT("It is night 1"), Night->GetRoundNumber(), 1);
	TestEqual(TEXT("Four fighters stand"), Night->GetStandingCount(), 4);
	TestEqual(TEXT("The label shows the night, the knockouts, and the fighters standing"), Night->Label->Text.ToString(), FString(TEXT("Night 1  Team 1: 0  Team 2: 0  Standing 4")));

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 1.5f);
	TestEqual(TEXT("Turn 1 took 20 from Cedar"), HealthOf(Night, TEXT("Cedar")), 10.f);
	TestEqual(TEXT("Nobody has gone down"), Night->GetStandingCount(), 4);
	TestEqual(TEXT("So nothing was announced"), Night->GetAnnouncements().Num(), 0);

	TickUntil(TestWorld, Start + 2.5f);
	TestEqual(TEXT("Turn 2 took Cedar out of the arena"), Night->GetStandingCount(), 3);
	TestTrue(TEXT("Cedar is gone"), Night->GetFighter(TEXT("Cedar")) == nullptr);
	TestEqual(TEXT("Birch's blow took 25 from Dune"), HealthOf(Night, TEXT("Dune")), 25.f);
	if (!TestEqual(TEXT("One knockout was announced"), Night->GetAnnouncements().Num(), 1)) return false;
	TestEqual(TEXT("It names Cedar"), Night->GetAnnouncements()[0].Fallen, FName(TEXT("Cedar")));
	TestEqual(TEXT("And Ash"), Night->GetAnnouncements()[0].Winner, FName(TEXT("Ash")));
	TestEqual(TEXT("Cedar's three coins dropped once"), Night->GetPurse(TEXT("Coin")), 3);
	TestEqual(TEXT("Ash's team has one knockout"), Night->GetKnockoutsFor(1), 1);

	TickUntil(TestWorld, Start + 3.5f);
	TestEqual(TEXT("Turn 3 took Ash and Birch out of the arena"), Night->GetStandingCount(), 1);
	if (!TestEqual(TEXT("Three knockouts have been announced"), Night->GetAnnouncements().Num(), 3)) return false;
	TestEqual(TEXT("Ash was announced first"), Night->GetAnnouncements()[1].Fallen, FName(TEXT("Ash")));
	TestEqual(TEXT("Then Birch"), Night->GetAnnouncements()[2].Fallen, FName(TEXT("Birch")));
	TestEqual(TEXT("Both by Dune"), Night->GetAnnouncements()[2].Winner, FName(TEXT("Dune")));
	TestEqual(TEXT("The two knockouts of one turn were announced in the same frame"), Night->GetAnnouncements()[1].Seconds, Night->GetAnnouncements()[2].Seconds);
	TestTrue(TEXT("And a turn later than the first"), Night->GetAnnouncements()[1].Seconds > Night->GetAnnouncements()[0].Seconds + 0.5);
	TestEqual(TEXT("The herald holds nothing back"), Night->GetHerald()->GetWaitingCount(), 0);
	TestEqual(TEXT("The coins of Cedar and Birch are five in all"), Night->GetPurse(TEXT("Coin")), 5);
	TestEqual(TEXT("Ash dropped one bandage"), Night->GetPurse(TEXT("Bandage")), 1);
	TestEqual(TEXT("Dune's team has two knockouts"), Night->GetKnockoutsFor(2), 2);

	TickUntil(TestWorld, Start + 5.5f);
	TestEqual(TEXT("Blows from fighters who are out do nothing"), HealthOf(Night, TEXT("Dune")), 25.f);
	TestEqual(TEXT("And announce nothing"), Night->GetAnnouncements().Num(), 3);

	TickUntil(TestWorld, Start + 6.2f);
	TestTrue(TEXT("The night is still running after the sixth turn"), Night->IsRunning());
	TestTrue(TEXT("With no result yet"), Night->GetResult().IsEmpty());

	TickUntil(TestWorld, Start + 7.f);
	TestFalse(TEXT("The night is over half a second after the sixth turn"), Night->IsRunning());
	TestEqual(TEXT("Team 2 has more knockouts"), Night->GetResult(), FString(TEXT("TEAM 2 WINS")));
	TestEqual(TEXT("The label shows the result"), Night->Label->Text.ToString(), FString(TEXT("Night 1  Team 1: 1  Team 2: 2  Standing 1  TEAM 2 WINS")));

	Night->Script = { MakeBlow(1, TEXT("Ash"), TEXT("Cedar"), 30.f), MakeBlow(2, TEXT("Birch"), TEXT("Dune"), 50.f) };
	TickUntil(TestWorld, Start + 7.5f);
	Night->PressNextRound();
	TestTrue(TEXT("Night 2 is running"), Night->IsRunning());
	TestEqual(TEXT("It is night 2"), Night->GetRoundNumber(), 2);
	TestEqual(TEXT("Every fighter is back"), Night->GetStandingCount(), 4);
	TestEqual(TEXT("Ash has full health again"), HealthOf(Night, TEXT("Ash")), 40.f);
	TestEqual(TEXT("The log is empty"), Night->GetAnnouncements().Num(), 0);
	TestEqual(TEXT("The purse is empty"), Night->GetPurse(TEXT("Coin")), 0);
	TestTrue(TEXT("And the result is empty"), Night->GetResult().IsEmpty());

	const float SecondStart = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, SecondStart + 3.f);
	Night->PressNextRound();
	TestEqual(TEXT("R does nothing while a night runs"), Night->GetRoundNumber(), 2);
	TestEqual(TEXT("Cedar and Dune are out"), Night->GetStandingCount(), 2);
	TestEqual(TEXT("Cedar's coins and Dune's bandages dropped"), Night->GetPurse(TEXT("Coin")) * 10 + Night->GetPurse(TEXT("Bandage")), 32);

	TickUntil(TestWorld, SecondStart + 7.f);
	TestEqual(TEXT("Both knockouts went to team 1"), Night->GetKnockoutsFor(1), 2);
	TestEqual(TEXT("So team 1 wins"), Night->GetResult(), FString(TEXT("TEAM 1 WINS")));
	TestEqual(TEXT("The label shows night 2 and its result"), Night->Label->Text.ToString(), FString(TEXT("Night 2  Team 1: 2  Team 2: 0  Standing 2  TEAM 1 WINS")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_ArenaNight_OneTurnTwoKnockoutsDraw, "Dojo.P23.ArenaNight.OneTurnTwoKnockoutsDraw", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two knockouts in one turn, one for each team, are announced together and leave the night a draw. */
bool FDojo_P23_ArenaNight_OneTurnTwoKnockoutsDraw::RunTest(const FString& Parameters)
{
	using namespace DojoP23NightTest;

	FDojoTestWorld TestWorld;

	ADojoP23ArenaNight* Night = SpawnNight(TestWorld, [](ADojoP23ArenaNight& Tuned)
	{
		Tuned.Script = { MakeBlow(1, TEXT("Ash"), TEXT("Cedar"), 30.f), MakeBlow(1, TEXT("Dune"), TEXT("Birch"), 30.f) };
	});
	if (!TestNotNull(TEXT("Night spawned"), Night)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 1.5f);

	if (!TestEqual(TEXT("Both knockouts were announced"), Night->GetAnnouncements().Num(), 2)) return false;
	TestEqual(TEXT("In the order the blows landed"), Night->GetAnnouncements()[0].Fallen, FName(TEXT("Cedar")));
	TestEqual(TEXT("Then"), Night->GetAnnouncements()[1].Fallen, FName(TEXT("Birch")));
	TestEqual(TEXT("In the same frame"), Night->GetAnnouncements()[0].Seconds, Night->GetAnnouncements()[1].Seconds);
	TestEqual(TEXT("Birch's coins and Cedar's coins dropped"), Night->GetPurse(TEXT("Coin")), 5);

	TickUntil(TestWorld, Start + 7.f);
	TestEqual(TEXT("One knockout for each team is a draw"), Night->GetResult(), FString(TEXT("DRAW")));
	TestEqual(TEXT("Two fighters are left"), Night->GetStandingCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_ArenaNight_BlowsThatCannotLandChangeNothing, "Dojo.P23.ArenaNight.BlowsThatCannotLandChangeNothing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Blows from or at a name that is not in the arena change nothing and announce nothing, and a night without a knockout is a draw. */
bool FDojo_P23_ArenaNight_BlowsThatCannotLandChangeNothing::RunTest(const FString& Parameters)
{
	using namespace DojoP23NightTest;

	FDojoTestWorld TestWorld;

	ADojoP23ArenaNight* Night = SpawnNight(TestWorld, [](ADojoP23ArenaNight& Tuned)
	{
		Tuned.Script = { MakeBlow(1, TEXT("Ash"), TEXT("Nobody"), 50.f), MakeBlow(1, TEXT("Nobody"), TEXT("Ash"), 50.f), MakeBlow(2, TEXT("Ash"), TEXT("Birch"), 10.f) };
	});
	if (!TestNotNull(TEXT("Night spawned"), Night)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 1.5f);
	TestEqual(TEXT("Ash is untouched"), HealthOf(Night, TEXT("Ash")), 40.f);
	TestEqual(TEXT("Nothing was announced"), Night->GetAnnouncements().Num(), 0);

	TickUntil(TestWorld, Start + 2.5f);
	TestEqual(TEXT("A real blow still lands"), HealthOf(Night, TEXT("Birch")), 20.f);

	TickUntil(TestWorld, Start + 7.f);
	TestEqual(TEXT("A night with no knockout is a draw"), Night->GetResult(), FString(TEXT("DRAW")));
	TestEqual(TEXT("Everyone is still standing"), Night->GetStandingCount(), 4);
	TestEqual(TEXT("The label shows the draw"), Night->Label->Text.ToString(), FString(TEXT("Night 1  Team 1: 0  Team 2: 0  Standing 4  DRAW")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_ArenaNight_FightersAreBuiltFromParts, "Dojo.P23.ArenaNight.FightersAreBuiltFromParts", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Each fighter is the earlier quest's fighter actor with a health part and a loot part set from its plan, posting to the night's herald. */
bool FDojo_P23_ArenaNight_FightersAreBuiltFromParts::RunTest(const FString& Parameters)
{
	using namespace DojoP23NightTest;

	FDojoTestWorld TestWorld;

	ADojoP23ArenaNight* Night = SpawnNight(TestWorld, [](ADojoP23ArenaNight&) {});
	if (!TestNotNull(TEXT("Night spawned"), Night)) return false;

	ADojoP6Fighter* Birch = Night->GetFighter(TEXT("Birch"));
	if (!TestNotNull(TEXT("Birch is in the arena"), Birch)) return false;

	TestEqual(TEXT("Birch has its name"), Birch->FighterName, FName(TEXT("Birch")));
	TestEqual(TEXT("And its team"), Birch->Team, 1);
	TestTrue(TEXT("And posts to the night's herald"), Birch->Herald == Night->GetHerald());
	TestTrue(TEXT("It stands where its plan says"), Birch->GetActorLocation().Equals(FVector(100.f, 0.f, 0.f), 0.01));

	const UDojoP9HealthComponent* Health = Birch->FindComponentByClass<UDojoP9HealthComponent>();
	const UDojoP9LootComponent* Loot = Birch->FindComponentByClass<UDojoP9LootComponent>();
	if (!TestNotNull(TEXT("Birch has a health part"), Health) || !TestNotNull(TEXT("And a loot part"), Loot)) return false;

	TestEqual(TEXT("Its health is the plan's 30"), Health->GetHealth(), 30.f);
	TestEqual(TEXT("It drops the plan's item"), Loot->LootItem, FName(TEXT("Coin")));
	TestEqual(TEXT("In the plan's number"), Loot->LootCount, 2);
	TestFalse(TEXT("Nothing has dropped yet"), Loot->HasDropped());

	return true;
}

#endif
