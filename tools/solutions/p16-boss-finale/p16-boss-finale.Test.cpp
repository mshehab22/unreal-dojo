#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Quests/p16-boss-finale/DojoP16ShowRunner.h"
#include "Quests/p16-rocket-rack/DojoP16Rocket.h"
#include "Quests/p16-rocket-rack/DojoP16RocketRack.h"
#include "Quests/p16-shell-fuse/DojoP16Shell.h"
#include "Quests/p16-shell-fuse/DojoP16ShellPool.h"
#include "Support/DojoTestWorld.h"

namespace DojoP16FinaleTest
{
	/** Spawns the runner with its rack size set before its BeginPlay, which starts the first show. */
	ADojoP16ShowRunner* SpawnRunner(FDojoTestWorld& TestWorld, int32 RocketsInRack)
	{
		ADojoP16ShowRunner* Runner = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP16ShowRunner>(ADojoP16ShowRunner::StaticClass(), FTransform::Identity);
		if (!Runner) return nullptr;
		Runner->RocketsInRack = RocketsInRack;
		Runner->FinishSpawning(FTransform::Identity);
		return Runner;
	}

	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** Ticks for Seconds from now. */
	void TickFor(FDojoTestWorld& TestWorld, float Seconds)
	{
		TickUntil(TestWorld, TestWorld.GetWorld()->GetTimeSeconds() + Seconds);
	}

	/** How many actors of a class stand in the world. */
	template<typename TActor>
	int32 CountActors(FDojoTestWorld& TestWorld)
	{
		int32 Count = 0;
		for (TActorIterator<TActor> Each(TestWorld.GetWorld()); Each; ++Each) Count++;
		return Count;
	}

	/** The label's text now. */
	FString LabelOf(ADojoP16ShowRunner* Runner)
	{
		return Runner->Label->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Finale_TwelveCuesTwelveBursts, "Dojo.P16.Finale.TwelveCuesTwelveBursts", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The first show starts with play, fires its twelve cues half a second apart, takes every burst back, and ends with twelve bursts and no duds. */
bool FDojo_P16_Finale_TwelveCuesTwelveBursts::RunTest(const FString& Parameters)
{
	using namespace DojoP16FinaleTest;
	FDojoTestWorld TestWorld;

	ADojoP16ShowRunner* Runner = SpawnRunner(TestWorld, 4);
	if (!TestNotNull(TEXT("Runner spawned"), Runner)) return false;
	TestTrue(TEXT("The first show starts when play begins"), Runner->IsRunning());
	if (!TestNotNull(TEXT("The runner set up a rack"), Runner->GetRack()) || !TestNotNull(TEXT("The runner set up a shell pool"), Runner->GetShellPool())) return false;

	TickFor(TestWorld, 3.f);
	TestTrue(TEXT("Three seconds in, the show runs"), Runner->IsRunning());
	TestTrue(TEXT("And the label shows its progress"), LabelOf(Runner).StartsWith(TEXT("SHOW: cue")));

	TickFor(TestWorld, 5.5f);
	TestFalse(TEXT("By 8.5 seconds the show is over"), Runner->IsRunning());
	TestEqual(TEXT("Every cue burst"), Runner->GetBurstCount(), 12);
	TestEqual(TEXT("No cue was a dud"), Runner->GetDudCount(), 0);
	TestEqual(TEXT("The label shows the result"), LabelOf(Runner), FString(TEXT("SHOW OVER: 12 bursts, 0 duds")));
	TestEqual(TEXT("Every rocket is back in the rack"), Runner->GetRack()->GetRestingCount(), 4);
	TestEqual(TEXT("Every shell is back in the pool"), Runner->GetShellPool()->GetRestingCount(), 4);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Finale_NothingSpawnsDuringTheShows, "Dojo.P16.Finale.NothingSpawnsDuringTheShows", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two full shows run on the four rockets and four shells made when play began, and no actor is spawned after that. */
bool FDojo_P16_Finale_NothingSpawnsDuringTheShows::RunTest(const FString& Parameters)
{
	using namespace DojoP16FinaleTest;
	int32 Spawned = 0;
	FDojoTestWorld TestWorld;

	ADojoP16ShowRunner* Runner = SpawnRunner(TestWorld, 4);
	if (!TestNotNull(TEXT("Runner spawned"), Runner)) return false;
	TestEqual(TEXT("Four rockets were made when play began"), CountActors<ADojoP16Rocket>(TestWorld), 4);
	TestEqual(TEXT("Four shells were made when play began"), CountActors<ADojoP16Shell>(TestWorld), 4);

	TestWorld.GetWorld()->AddOnActorSpawnedHandler(FOnActorSpawned::FDelegate::CreateLambda([&Spawned](AActor*)
	{
		Spawned++;
	}));

	TickFor(TestWorld, 8.5f);
	TestEqual(TEXT("Show 1 ends with twelve bursts"), LabelOf(Runner), FString(TEXT("SHOW OVER: 12 bursts, 0 duds")));
	TestTrue(TEXT("R starts show 2"), Runner->StartShow());
	TickFor(TestWorld, 8.5f);
	TestEqual(TEXT("Show 2 ends with twelve bursts too"), LabelOf(Runner), FString(TEXT("SHOW OVER: 12 bursts, 0 duds")));

	TestEqual(TEXT("No actor was spawned during either show"), Spawned, 0);
	TestEqual(TEXT("Still four rockets"), CountActors<ADojoP16Rocket>(TestWorld), 4);
	TestEqual(TEXT("Still four shells"), CountActors<ADojoP16Shell>(TestWorld), 4);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Finale_AnEmptyRackMakesDuds, "Dojo.P16.Finale.AnEmptyRackMakesDuds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With one rocket in the rack, every rocket cue that comes while it is still flying is a dud: three duds and nine bursts. */
bool FDojo_P16_Finale_AnEmptyRackMakesDuds::RunTest(const FString& Parameters)
{
	using namespace DojoP16FinaleTest;
	int32 Spawned = 0;
	FDojoTestWorld TestWorld;

	ADojoP16ShowRunner* Runner = SpawnRunner(TestWorld, 1);
	if (!TestNotNull(TEXT("Runner spawned"), Runner)) return false;
	TestWorld.GetWorld()->AddOnActorSpawnedHandler(FOnActorSpawned::FDelegate::CreateLambda([&Spawned](AActor*)
	{
		Spawned++;
	}));

	TickFor(TestWorld, 8.5f);
	TestFalse(TEXT("The show is over"), Runner->IsRunning());
	TestEqual(TEXT("The rocket cues at 1, 3, and 5 seconds found the rack empty"), Runner->GetDudCount(), 3);
	TestEqual(TEXT("Three rockets and six shells burst"), Runner->GetBurstCount(), 9);
	TestEqual(TEXT("The label shows the duds"), LabelOf(Runner), FString(TEXT("SHOW OVER: 9 bursts, 3 duds")));
	TestEqual(TEXT("A dud never spawns a rocket"), Spawned, 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Finale_AnAbortLeavesNothingBurning, "Dojo.P16.Finale.AnAbortLeavesNothingBurning", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Aborting mid-show takes back every rocket and shell at once; for five seconds after, nothing bursts and everything rests. */
bool FDojo_P16_Finale_AnAbortLeavesNothingBurning::RunTest(const FString& Parameters)
{
	using namespace DojoP16FinaleTest;
	FDojoTestWorld TestWorld;

	ADojoP16ShowRunner* Runner = SpawnRunner(TestWorld, 4);
	if (!TestNotNull(TEXT("Runner spawned"), Runner)) return false;
	if (!TestNotNull(TEXT("Rack set up"), Runner->GetRack()) || !TestNotNull(TEXT("Pool set up"), Runner->GetShellPool())) return false;

	TickUntil(TestWorld, 2.6f);
	TestTrue(TEXT("At 2.6 seconds the show runs"), Runner->IsRunning());
	TestTrue(TEXT("With a rocket out"), Runner->GetRack()->GetLentCount() > 0);
	TestTrue(TEXT("And shells out"), Runner->GetShellPool()->GetLentCount() > 0);
	const int32 BurstsBefore = Runner->GetBurstCount();
	TestTrue(TEXT("Some cues have burst already"), BurstsBefore > 0);

	TestTrue(TEXT("X aborts the show"), Runner->AbortShow());
	TestFalse(TEXT("The show no longer runs"), Runner->IsRunning());
	TestFalse(TEXT("A second abort changes nothing"), Runner->AbortShow());
	TestEqual(TEXT("Every rocket is back at once"), Runner->GetRack()->GetLentCount(), 0);
	TestEqual(TEXT("Every shell is back at once"), Runner->GetShellPool()->GetLentCount(), 0);
	const FString AbortedLabel = FString::Printf(TEXT("ABORTED: %d bursts, 0 duds"), BurstsBefore);
	TestEqual(TEXT("The label says the show was aborted"), LabelOf(Runner), AbortedLabel);

	TickFor(TestWorld, 5.f);
	TestEqual(TEXT("Nothing more bursts after the abort"), Runner->GetBurstCount(), BurstsBefore);
	TestEqual(TEXT("The label is unchanged"), LabelOf(Runner), AbortedLabel);
	for (TActorIterator<ADojoP16Shell> Shell(TestWorld.GetWorld()); Shell; ++Shell)
	{
		TestTrue(TEXT("Every shell rests"), Shell->IsResting());
		TestFalse(TEXT("And no shell sent back mid-fuse burst at rest"), Shell->HasBurst());
	}
	for (TActorIterator<ADojoP16Rocket> Rocket(TestWorld.GetWorld()); Rocket; ++Rocket)
	{
		TestTrue(TEXT("Every rocket is hidden"), Rocket->IsHidden());
		TestFalse(TEXT("And not ticking"), Rocket->IsActorTickEnabled());
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Finale_ARestartedShowStartsClean, "Dojo.P16.Finale.ARestartedShowStartsClean", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** After an abort, R starts a new show from its first cue with zeroed counts, refuses a second start while it runs, and plays all twelve cues. */
bool FDojo_P16_Finale_ARestartedShowStartsClean::RunTest(const FString& Parameters)
{
	using namespace DojoP16FinaleTest;
	FDojoTestWorld TestWorld;

	ADojoP16ShowRunner* Runner = SpawnRunner(TestWorld, 4);
	if (!TestNotNull(TEXT("Runner spawned"), Runner)) return false;

	TestFalse(TEXT("R does nothing while the first show runs"), Runner->StartShow());
	TickUntil(TestWorld, 2.6f);
	Runner->AbortShow();
	TickFor(TestWorld, 1.f);

	TestTrue(TEXT("R starts a new show after the abort"), Runner->StartShow());
	TestEqual(TEXT("It starts with no bursts"), Runner->GetBurstCount(), 0);
	TestEqual(TEXT("And no duds"), Runner->GetDudCount(), 0);
	TestFalse(TEXT("A second R while it runs changes nothing"), Runner->StartShow());

	TickFor(TestWorld, 8.5f);
	TestFalse(TEXT("The new show is over"), Runner->IsRunning());
	TestEqual(TEXT("It played all twelve cues"), LabelOf(Runner), FString(TEXT("SHOW OVER: 12 bursts, 0 duds")));

	return true;
}

#endif
