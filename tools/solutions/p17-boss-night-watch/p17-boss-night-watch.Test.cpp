#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p17-boss-night-watch/DojoP17NightWatch.h"
#include "Quests/p17-guard-rating/DojoP17GuardStats.h"
#include "Quests/p17-tower-rig/DojoP17TowerRig.h"
#include "Support/DojoTestWorld.h"

namespace DojoP17WatchTest
{
	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** True when the watch's label contains Part. */
	bool LabelContains(const ADojoP17NightWatch* Watch, const TCHAR* Part)
	{
		return Watch->Label->Text.ToString().Contains(Part);
	}

	/** Spawns a watch that makes its own rig, with Tune run on it before its BeginPlay starts round 1. */
	ADojoP17NightWatch* SpawnWatch(FDojoTestWorld& TestWorld, TFunctionRef<void(ADojoP17NightWatch&)> Tune)
	{
		ADojoP17NightWatch* Watch = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP17NightWatch>(ADojoP17NightWatch::StaticClass(), FTransform::Identity);
		if (Watch)
		{
			Tune(*Watch);
			Watch->FinishSpawning(FTransform::Identity);
		}
		return Watch;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_NightWatch_TwoRoundsReadOftenRecomputeRarely, "Dojo.P17.NightWatch.TwoRoundsReadOftenRecomputeRarely", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two 36 second rounds with a check every second; the guard and the tower are read 36 times a round but worked out only after a change. */
bool FDojo_P17_NightWatch_TwoRoundsReadOftenRecomputeRarely::RunTest(const FString& Parameters)
{
	using namespace DojoP17WatchTest;

	FDojoTestWorld TestWorld;

	ADojoP17NightWatch* Watch = SpawnWatch(TestWorld, [](ADojoP17NightWatch&) {});
	if (!TestNotNull(TEXT("Watch spawned"), Watch)) return false;

	ADojoP17TowerRig* Rig = Watch->Rig;
	UDojoP17GuardStats* Guard = Watch->Guard;
	if (!TestNotNull(TEXT("The watch made its tower rig"), Rig) || !TestNotNull(TEXT("The watch has its guard stats"), Guard)) return false;

	TestTrue(TEXT("Round 1 is running"), Watch->IsRunning());
	TestEqual(TEXT("It is round 1"), Watch->GetRoundNumber(), 1);
	TestEqual(TEXT("The rig has three joints"), Rig->Nodes.Num(), 3);

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 3.f);
	Watch->PressArmour();
	TickUntil(TestWorld, Start + 4.f);
	TestTrue(TEXT("Armour makes the guard 45 at the next check"), LabelContains(Watch, TEXT("Guard 45")));
	TestTrue(TEXT("The first gust at 2 seconds moved the lantern 20 along"), LabelContains(Watch, TEXT("Lantern 20,0,400")));

	TickUntil(TestWorld, Start + 9.f);
	Watch->PressOil();
	TickUntil(TestWorld, Start + 10.f);
	TestTrue(TEXT("Oil adds 10 more"), LabelContains(Watch, TEXT("Guard 55")));
	TestTrue(TEXT("Two gusts have moved the lantern 40"), LabelContains(Watch, TEXT("Lantern 40,0,400")));

	TickUntil(TestWorld, Start + 22.f);
	TestTrue(TEXT("After 12 seconds the oil has worn off"), LabelContains(Watch, TEXT("Guard 45")));

	TickUntil(TestWorld, Start + 36.5f);
	TestFalse(TEXT("The round is over at 36 seconds"), Watch->IsRunning());
	TestEqual(TEXT("Only the first three checks found the watch shaky"), Watch->GetShakyChecks(), 3);
	TestEqual(TEXT("So the watch held"), Watch->GetResult(), FString(TEXT("HELD")));
	TestEqual(TEXT("The guard was worked out four times: the first read and three changes"), Guard->GetRecomputeCount(), 4);
	TestEqual(TEXT("The tower was worked out 24 times: three joints, once at the start and once after each of seven gusts"), Rig->GetTotalRecomputeCount(), 24);
	TestTrue(TEXT("The label ends with the result"), Watch->Label->Text.ToString().EndsWith(TEXT("HELD")));
	TestTrue(TEXT("Seven gusts left the lantern at 140 along and 400 up"), Rig->GetPosition(2).Equals(FVector(140.f, 0.f, 400.f), 0.5));

	Watch->PressOil();
	Watch->PressArmour();
	TestEqual(TEXT("Oil and armour do nothing between rounds"), Guard->GetGuard(), 45);
	TestEqual(TEXT("And do not make the guard stale"), Guard->GetRecomputeCount(), 4);

	TickUntil(TestWorld, Start + 40.f);
	TestEqual(TEXT("Nothing moves the tower between rounds"), Rig->GetTotalRecomputeCount(), 24);

	const int32 GuardBefore = Guard->GetRecomputeCount();
	const int32 RigBefore = Rig->GetTotalRecomputeCount();
	Watch->PressNextRound();
	TestTrue(TEXT("Round 2 is running"), Watch->IsRunning());
	TestEqual(TEXT("It is round 2"), Watch->GetRoundNumber(), 2);
	TestEqual(TEXT("The shaky checks start again"), Watch->GetShakyChecks(), 0);
	TestTrue(TEXT("And the result is empty"), Watch->GetResult().IsEmpty());

	const float SecondStart = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, SecondStart + 3.f);
	Watch->PressArmour();
	TickUntil(TestWorld, SecondStart + 9.f);
	Watch->PressOil();
	TickUntil(TestWorld, SecondStart + 29.f);
	Watch->PressArmour();

	TickUntil(TestWorld, SecondStart + 36.5f);
	TestFalse(TEXT("Round 2 is over"), Watch->IsRunning());
	TestEqual(TEXT("Taking the armour off at 29 seconds left seven shaky checks at the end"), Watch->GetShakyChecks(), 10);
	TestEqual(TEXT("So the watch fell"), Watch->GetResult(), FString(TEXT("FELL")));
	TestEqual(TEXT("Round 2 worked the guard out five times"), Guard->GetRecomputeCount() - GuardBefore, 5);
	TestEqual(TEXT("And the tower 24 times"), Rig->GetTotalRecomputeCount() - RigBefore, 24);
	TestTrue(TEXT("The base went back to its start, so seven gusts again left the lantern at 140"), Rig->GetPosition(2).Equals(FVector(140.f, 0.f, 400.f), 0.5));
	TestTrue(TEXT("The label ends with the result"), Watch->Label->Text.ToString().EndsWith(TEXT("FELL")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_NightWatch_QuietWatchRecomputesOnce, "Dojo.P17.NightWatch.QuietWatchRecomputesOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With no gust, no armour, and no oil for 20 seconds, twenty checks read the guard and the lantern and each is worked out once. */
bool FDojo_P17_NightWatch_QuietWatchRecomputesOnce::RunTest(const FString& Parameters)
{
	using namespace DojoP17WatchTest;

	FDojoTestWorld TestWorld;

	ADojoP17NightWatch* Watch = SpawnWatch(TestWorld, [](ADojoP17NightWatch& Tuned)
	{
		Tuned.FirstGustSeconds = 1000.f;
		Tuned.GustInterval = 1000.f;
	});
	if (!TestNotNull(TEXT("Watch spawned"), Watch)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 20.f);

	TestTrue(TEXT("The round is still running"), Watch->IsRunning());
	TestEqual(TEXT("Twenty checks found the watch shaky at 30 guard"), Watch->GetShakyChecks(), 20);
	TestEqual(TEXT("The guard was worked out once"), Watch->Guard->GetRecomputeCount(), 1);
	TestEqual(TEXT("The tower was worked out once for each of its three joints"), Watch->Rig->GetTotalRecomputeCount(), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_NightWatch_KeysAndRestartRules, "Dojo.P17.NightWatch.KeysAndRestartRules", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** R is ignored while a round runs, armour toggles, and oil, armour, and R behave as the spec says before and after a round. */
bool FDojo_P17_NightWatch_KeysAndRestartRules::RunTest(const FString& Parameters)
{
	using namespace DojoP17WatchTest;

	FDojoTestWorld TestWorld;

	ADojoP17NightWatch* Watch = SpawnWatch(TestWorld, [](ADojoP17NightWatch&) {});
	if (!TestNotNull(TEXT("Watch spawned"), Watch)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 1.f);
	Watch->PressNextRound();
	TestEqual(TEXT("R is ignored while a round runs"), Watch->GetRoundNumber(), 1);

	TickUntil(TestWorld, Start + 3.f);
	Watch->PressArmour();
	TickUntil(TestWorld, Start + 4.f);
	TestTrue(TEXT("Armour makes the guard 45"), LabelContains(Watch, TEXT("Guard 45")));

	Watch->PressArmour();
	TickUntil(TestWorld, Start + 5.f);
	TestTrue(TEXT("Pressing armour again takes it off"), LabelContains(Watch, TEXT("Guard 30")));

	TickUntil(TestWorld, Start + 36.5f);
	TestFalse(TEXT("The round is over"), Watch->IsRunning());
	TestEqual(TEXT("Round 1 is still round 1"), Watch->GetRoundNumber(), 1);

	Watch->PressNextRound();
	TestTrue(TEXT("R starts round 2 once round 1 is over"), Watch->IsRunning() && Watch->GetRoundNumber() == 2);
	TestTrue(TEXT("A new round begins at the starting guard"), LabelContains(Watch, TEXT("Round 2  Guard 30")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_NightWatch_TunablesAreHonoured, "Dojo.P17.NightWatch.TunablesAreHonoured", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The starting guard, the steady guard, the round length, and the most shaky checks come from the watch's properties and not from fixed numbers. */
bool FDojo_P17_NightWatch_TunablesAreHonoured::RunTest(const FString& Parameters)
{
	using namespace DojoP17WatchTest;

	FDojoTestWorld TestWorld;

	ADojoP17NightWatch* Watch = SpawnWatch(TestWorld, [](ADojoP17NightWatch& Tuned)
	{
		Tuned.RoundSeconds = 10.f;
		Tuned.StartingGuard = 50;
		Tuned.MostShakyChecks = 0;
	});
	if (!TestNotNull(TEXT("Watch spawned"), Watch)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 9.f);
	TestTrue(TEXT("The shorter round is still running at 9 seconds"), Watch->IsRunning());

	TickUntil(TestWorld, Start + 10.5f);
	TestFalse(TEXT("It is over after 10 seconds"), Watch->IsRunning());
	TestEqual(TEXT("A guard of 50 is steady at every check"), Watch->GetShakyChecks(), 0);
	TestEqual(TEXT("So the watch held"), Watch->GetResult(), FString(TEXT("HELD")));
	TestTrue(TEXT("The label shows the starting guard"), LabelContains(Watch, TEXT("Guard 50")));

	return true;
}

#endif
