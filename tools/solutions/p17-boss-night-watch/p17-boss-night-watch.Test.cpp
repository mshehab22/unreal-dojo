#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
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
	TestTrue(TEXT("The first gust at 2 seconds has moved the lantern 20 along by the check at 2.5"), LabelContains(Watch, TEXT("Lantern 20,0,400")));
	Watch->PressArmour();
	TickUntil(TestWorld, Start + 4.f);
	TestEqual(TEXT("Armour makes the guard 45 at the next check, with three shaky checks behind it"), Watch->Label->Text.ToString(), FString(TEXT("Round 1  Guard 45  Lantern 20,0,400  Shaky 3")));

	TickUntil(TestWorld, Start + 9.f);
	Watch->PressOil();
	TickUntil(TestWorld, Start + 10.f);
	TestTrue(TEXT("Oil adds 10 more"), LabelContains(Watch, TEXT("Guard 55")));
	TestTrue(TEXT("Two gusts have moved the lantern 40"), LabelContains(Watch, TEXT("Lantern 40,0,400")));

	TickUntil(TestWorld, Start + 21.f);
	TestTrue(TEXT("The oil is still working at 21 seconds"), LabelContains(Watch, TEXT("Guard 55")));

	TickUntil(TestWorld, Start + 22.f);
	TestTrue(TEXT("After 12 seconds the oil has worn off"), LabelContains(Watch, TEXT("Guard 45")));

	TickUntil(TestWorld, Start + 36.5f);
	TestFalse(TEXT("The round is over at 36 seconds"), Watch->IsRunning());
	TestEqual(TEXT("Only the first three checks found the watch shaky"), Watch->GetShakyChecks(), 3);
	TestEqual(TEXT("So the watch held"), Watch->GetResult(), FString(TEXT("HELD")));
	TestEqual(TEXT("The guard was worked out four times: the first read and three changes"), Guard->GetRecomputeCount(), 4);
	TestEqual(TEXT("The tower was worked out 24 times: three joints, once at the start and once after each of seven gusts"), Rig->GetTotalRecomputeCount(), 24);
	TestEqual(TEXT("The label shows the round, the guard, the lantern, the shaky checks, and the result"), Watch->Label->Text.ToString(), FString(TEXT("Round 1  Guard 45  Lantern 140,0,400  Shaky 3  HELD")));
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
	TestEqual(TEXT("The label shows round 2 and its result"), Watch->Label->Text.ToString(), FString(TEXT("Round 2  Guard 30  Lantern 140,0,400  Shaky 10  FELL")));

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

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_NightWatch_OilWearsOffInTheCheckThatReadsTheGuard, "Dojo.P17.NightWatch.OilWearsOffInTheCheckThatReadsTheGuard", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A guard of exactly 40 is steady, and the check after the oil wears off removes it before reading the guard, so that same check is shaky. */
bool FDojo_P17_NightWatch_OilWearsOffInTheCheckThatReadsTheGuard::RunTest(const FString& Parameters)
{
	using namespace DojoP17WatchTest;

	FDojoTestWorld TestWorld;

	ADojoP17NightWatch* Watch = SpawnWatch(TestWorld, [](ADojoP17NightWatch&) {});
	if (!TestNotNull(TEXT("Watch spawned"), Watch)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 3.f);
	Watch->PressOil();

	TickUntil(TestWorld, Start + 14.f);
	TestEqual(TEXT("Oil alone makes the guard exactly 40, which is steady"), Watch->Label->Text.ToString(), FString(TEXT("Round 1  Guard 40  Lantern 60,0,400  Shaky 3")));

	TickUntil(TestWorld, Start + 16.f);
	TestEqual(TEXT("The check after the oil wore off read the guard without it and counted itself shaky"), Watch->Label->Text.ToString(), FString(TEXT("Round 1  Guard 30  Lantern 60,0,400  Shaky 4")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_NightWatch_DrinksStackAndWearOffOnTheirOwn, "Dojo.P17.NightWatch.DrinksStackAndWearOffOnTheirOwn", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two drinks add together, and each wears off 12 seconds after it was drunk. */
bool FDojo_P17_NightWatch_DrinksStackAndWearOffOnTheirOwn::RunTest(const FString& Parameters)
{
	using namespace DojoP17WatchTest;

	FDojoTestWorld TestWorld;

	ADojoP17NightWatch* Watch = SpawnWatch(TestWorld, [](ADojoP17NightWatch&) {});
	if (!TestNotNull(TEXT("Watch spawned"), Watch)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 3.f);
	Watch->PressOil();
	TickUntil(TestWorld, Start + 8.f);
	Watch->PressOil();

	TickUntil(TestWorld, Start + 9.f);
	TestEqual(TEXT("Two drinks add 20"), Watch->Label->Text.ToString(), FString(TEXT("Round 1  Guard 50  Lantern 40,0,400  Shaky 3")));

	TickUntil(TestWorld, Start + 16.f);
	TestEqual(TEXT("The first drink has worn off and the second has not"), Watch->Label->Text.ToString(), FString(TEXT("Round 1  Guard 40  Lantern 60,0,400  Shaky 3")));

	TickUntil(TestWorld, Start + 21.f);
	TestEqual(TEXT("Then the second wears off"), Watch->Label->Text.ToString(), FString(TEXT("Round 1  Guard 30  Lantern 80,0,400  Shaky 4")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_NightWatch_ResetClearsDrinksStillActive, "Dojo.P17.NightWatch.ResetClearsDrinksStillActive", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A drink still working when the round ends does not carry into the next round. */
bool FDojo_P17_NightWatch_ResetClearsDrinksStillActive::RunTest(const FString& Parameters)
{
	using namespace DojoP17WatchTest;

	FDojoTestWorld TestWorld;

	ADojoP17NightWatch* Watch = SpawnWatch(TestWorld, [](ADojoP17NightWatch&) {});
	if (!TestNotNull(TEXT("Watch spawned"), Watch)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 34.f);
	Watch->PressOil();
	TickUntil(TestWorld, Start + 36.5f);
	TestFalse(TEXT("The round is over"), Watch->IsRunning());
	TestTrue(TEXT("The drink was still working at the end"), LabelContains(Watch, TEXT("Guard 40")));

	Watch->PressNextRound();
	const float SecondStart = TestWorld.GetWorld()->GetTimeSeconds();
	TestTrue(TEXT("Round 2 starts at the base guard, without the drink"), LabelContains(Watch, TEXT("Round 2  Guard 30")));

	TickUntil(TestWorld, SecondStart + 8.f);
	TestTrue(TEXT("And still without it later in the round"), LabelContains(Watch, TEXT("Guard 30")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_NightWatch_AGivenRigIsUsed, "Dojo.P17.NightWatch.AGivenRigIsUsed", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A rig the watch is given is used as it is, including a base that does not start at zero, and no second rig is made. */
bool FDojo_P17_NightWatch_AGivenRigIsUsed::RunTest(const FString& Parameters)
{
	using namespace DojoP17WatchTest;

	FDojoTestWorld TestWorld;

	ADojoP17TowerRig* Given = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP17TowerRig>(ADojoP17TowerRig::StaticClass(), FTransform::Identity);
	if (!TestNotNull(TEXT("Rig spawned"), Given)) return false;

	FDojoP17RigNode BaseNode;
	BaseNode.LocalOffset = FVector(1000.f, 0.f, 0.f);

	FDojoP17RigNode PlatformNode;
	PlatformNode.ParentIndex = 0;
	PlatformNode.LocalOffset = FVector(0.f, 0.f, 50.f);

	FDojoP17RigNode LanternNode;
	LanternNode.ParentIndex = 1;
	LanternNode.LocalOffset = FVector(0.f, 0.f, 10.f);

	Given->Nodes = { BaseNode, PlatformNode, LanternNode };
	Given->FinishSpawning(FTransform::Identity);

	ADojoP17NightWatch* Watch = SpawnWatch(TestWorld, [Given](ADojoP17NightWatch& Tuned) { Tuned.Rig = Given; });
	if (!TestNotNull(TEXT("Watch spawned"), Watch)) return false;

	int32 RigCount = 0;
	for (TActorIterator<ADojoP17TowerRig> It(TestWorld.GetWorld()); It; ++It) RigCount++;
	TestEqual(TEXT("The watch made no rig of its own"), RigCount, 1);
	TestTrue(TEXT("It uses the rig it was given"), Watch->Rig == Given);
	TestTrue(TEXT("The lantern is where the given rig puts it"), LabelContains(Watch, TEXT("Lantern 1000,0,60")));

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 3.f);
	TestTrue(TEXT("A gust pushes the given base 20 along"), LabelContains(Watch, TEXT("Lantern 1020,0,60")));

	TickUntil(TestWorld, Start + 36.5f);
	Watch->PressNextRound();
	TestTrue(TEXT("A new round puts the given base back where it began"), LabelContains(Watch, TEXT("Round 2  Guard 30  Lantern 1000,0,60")));

	return true;
}

#endif
