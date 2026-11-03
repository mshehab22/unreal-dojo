#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Quests/p14-boss-time-trial/DojoP14TrialDirector.h"
#include "Quests/p14-lap-log/DojoP14FinishLine.h"
#include "Quests/p14-lap-log/DojoP14LapLog.h"
#include "Quests/p14-start-lights/DojoP14StartLights.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoP14TrialTest
{
	/** The name the director writes the champion's laps under. */
	FName Driver()
	{
		return TEXT("Champion");
	}

	/** Spawns the champion behind the line. */
	AActor* SpawnChampion(FDojoTestWorld& TestWorld)
	{
		AActor* Champion = TestWorld.SpawnActor<ADojoTestActor>();
		if (Champion) Champion->SetActorLocation(FVector(-200.f, 0.f, 0.f));
		return Champion;
	}

	/** Spawns the director last, with the champion set before its BeginPlay. */
	ADojoP14TrialDirector* SpawnDirector(FDojoTestWorld& TestWorld, AActor* Champion)
	{
		ADojoP14TrialDirector* Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP14TrialDirector>(ADojoP14TrialDirector::StaticClass(), FTransform(FVector(0.f, 500.f, 0.f)));
		Director->Champion = Champion;
		Director->FinishSpawning(FTransform(FVector(0.f, 500.f, 0.f)));
		return Director;
	}

	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** Drives one lap of about Seconds: behind the line for the whole lap, then across it. */
	void DriveLap(FDojoTestWorld& TestWorld, AActor* Champion, float Seconds)
	{
		Champion->SetActorLocation(FVector(-200.f, 0.f, 0.f));
		TickUntil(TestWorld, TestWorld.GetWorld()->GetTimeSeconds() + Seconds - FDojoTestWorld::DefaultFrameSeconds);
		Champion->SetActorLocation(FVector(200.f, 0.f, 0.f));
		TestWorld.Tick(1);
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
	FString LabelOf(ADojoP14TrialDirector* Director)
	{
		return Director->Label->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_TimeTrial_RankedAndPracticeKeptApart, "Dojo.P14.TimeTrial.RankedAndPracticeKeptApart", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A ranked round of three 10 second laps, then a practice round of three 8 second laps: each round's laps land only in its own log, both logs are kept, and the label's best ranked lap ignores practice. */
bool FDojo_P14_TimeTrial_RankedAndPracticeKeptApart::RunTest(const FString& Parameters)
{
	using namespace DojoP14TrialTest;

	FDojoTestWorld TestWorld;
	AActor* Champion = SpawnChampion(TestWorld);
	ADojoP14TrialDirector* Director = SpawnDirector(TestWorld, Champion);
	if (!TestNotNull(TEXT("Champion spawned"), Champion) || !TestNotNull(TEXT("Director spawned"), Director)) return false;

	TestTrue(TEXT("Round 1 starts with play"), Director->IsRunning());
	TestFalse(TEXT("Round 1 is ranked"), Director->IsPractice());
	TestTrue(TEXT("The label shows the mode"), LabelOf(Director).StartsWith(TEXT("RANKED")));

	TickUntil(TestWorld, 3.5f);
	DriveLap(TestWorld, Champion, 10.f);
	DriveLap(TestWorld, Champion, 10.f);
	TestTrue(TEXT("Two laps in, the round still runs"), Director->IsRunning());
	TestTrue(TEXT("The label counts the laps"), LabelOf(Director).Contains(TEXT("Lap 2/3")));
	DriveLap(TestWorld, Champion, 10.f);

	TestFalse(TEXT("Three laps finish the round"), Director->IsRunning());
	TestEqual(TEXT("Three ranked laps"), Director->GetRankedLog()->GetLapCountFor(Driver()), 3);
	TestEqual(TEXT("No practice laps"), Director->GetPracticeLog()->GetLapCountFor(Driver()), 0);
	TestEqual(TEXT("The best ranked lap is 10 seconds"), Director->GetRankedLog()->GetBestFor(Driver()), 10.f, 0.05f);
	TestTrue(TEXT("Green to the last lap is a little over 30 seconds"), Director->GetFinishSeconds() > 30.f && Director->GetFinishSeconds() < 31.f);
	TestTrue(TEXT("The label shows the finish"), LabelOf(Director).StartsWith(TEXT("FINISH")));
	TestTrue(TEXT("With the best ranked lap"), LabelOf(Director).Contains(TEXT("Best ranked 10.0")));

	Director->TogglePractice();
	TestTrue(TEXT("P between rounds switches to practice"), Director->IsPractice());
	Director->RestartRound();
	TestTrue(TEXT("R starts round 2"), Director->IsRunning());
	TestEqual(TEXT("Round 2 starts with no laps"), Director->GetLapsThisRound(), 0);
	Director->TogglePractice();
	TestTrue(TEXT("P during a round changes nothing"), Director->IsPractice());
	TestTrue(TEXT("The label shows practice"), LabelOf(Director).StartsWith(TEXT("PRACTICE")));
	TestEqual(TEXT("One finish line stands"), CountActors<ADojoP14FinishLine>(TestWorld), 1);

	TickUntil(TestWorld, TestWorld.GetWorld()->GetTimeSeconds() + 3.5f);
	DriveLap(TestWorld, Champion, 8.f);
	DriveLap(TestWorld, Champion, 8.f);
	DriveLap(TestWorld, Champion, 8.f);

	TestFalse(TEXT("Round 2 finishes"), Director->IsRunning());
	TestEqual(TEXT("Three practice laps"), Director->GetPracticeLog()->GetLapCountFor(Driver()), 3);
	TestEqual(TEXT("The ranked log still holds round 1's three laps"), Director->GetRankedLog()->GetLapCountFor(Driver()), 3);
	TestEqual(TEXT("The best practice lap is 8 seconds"), Director->GetPracticeLog()->GetBestFor(Driver()), 8.f, 0.05f);
	TestEqual(TEXT("The best ranked lap is still 10 seconds"), Director->GetRankedLog()->GetBestFor(Driver()), 10.f, 0.05f);
	TestTrue(TEXT("The label's best ranked lap ignores practice"), LabelOf(Director).Contains(TEXT("Best ranked 10.0")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_TimeTrial_FalseStartsAreNotTimed, "Dojo.P14.TimeTrial.FalseStartsAreNotTimed", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Crossing the line on red counts a false start and times nothing; the first lap is timed from green. */
bool FDojo_P14_TimeTrial_FalseStartsAreNotTimed::RunTest(const FString& Parameters)
{
	using namespace DojoP14TrialTest;

	FDojoTestWorld TestWorld;
	AActor* Champion = SpawnChampion(TestWorld);
	ADojoP14TrialDirector* Director = SpawnDirector(TestWorld, Champion);
	if (!TestNotNull(TEXT("Champion spawned"), Champion) || !TestNotNull(TEXT("Director spawned"), Director)) return false;

	TickUntil(TestWorld, 1.f);
	Champion->SetActorLocation(FVector(200.f, 0.f, 0.f));
	TestWorld.Tick(1);
	Champion->SetActorLocation(FVector(-200.f, 0.f, 0.f));
	TestWorld.Tick(1);

	TestEqual(TEXT("Crossing on red is a false start"), Director->GetFalseStarts(), 1);
	TestEqual(TEXT("It finishes no lap"), Director->GetLapsThisRound(), 0);
	TestEqual(TEXT("And writes nothing in the log"), Director->GetRankedLog()->GetLaps().Num(), 0);
	TestTrue(TEXT("The label counts it"), LabelOf(Director).Contains(TEXT("False starts 1")));

	Champion->SetActorLocation(FVector(200.f, 0.f, 0.f));
	TestWorld.Tick(1);
	Champion->SetActorLocation(FVector(-200.f, 0.f, 0.f));
	TestWorld.Tick(1);
	TestEqual(TEXT("A second crossing on red is another false start"), Director->GetFalseStarts(), 2);

	TickUntil(TestWorld, 4.f);
	TestTrue(TEXT("The lights are green by 4 seconds"), Director->GetLights()->IsGreen());
	DriveLap(TestWorld, Champion, 10.f);

	TestEqual(TEXT("One lap after green"), Director->GetLapsThisRound(), 1);
	TestEqual(TEXT("One lap in the log"), Director->GetRankedLog()->GetLapCountFor(Driver()), 1);
	const float FirstLap = Director->GetRankedLog()->GetBestFor(Driver());
	TestTrue(TEXT("The first lap is timed from green, about 3 seconds in, not from a false start"), FirstLap > 10.5f && FirstLap < 11.5f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_TimeTrial_TrackKeepsOneSetOfLights, "Dojo.P14.TimeTrial.TrackKeepsOneSetOfLights", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A director on a track with lights already placed counts down on those; on a bare track it places one set and keeps using it, round after round. */
bool FDojo_P14_TimeTrial_TrackKeepsOneSetOfLights::RunTest(const FString& Parameters)
{
	using namespace DojoP14TrialTest;

	{
		FDojoTestWorld PlacedTrack;
		ADojoP14StartLights* Placed = PlacedTrack.SpawnActor<ADojoP14StartLights>();
		AActor* Champion = SpawnChampion(PlacedTrack);
		ADojoP14TrialDirector* Director = SpawnDirector(PlacedTrack, Champion);
		if (!TestNotNull(TEXT("Placed lights spawned"), Placed) || !TestNotNull(TEXT("Director spawned"), Director)) return false;

		TestTrue(TEXT("The director uses the lights already on the track"), Director->GetLights() == Placed);
		TestEqual(TEXT("And adds none"), CountActors<ADojoP14StartLights>(PlacedTrack), 1);
		TickUntil(PlacedTrack, 3.5f);
		TestTrue(TEXT("The placed lights counted down"), Placed->IsGreen());
	}

	FDojoTestWorld BareTrack;
	AActor* Champion = SpawnChampion(BareTrack);
	ADojoP14TrialDirector* Director = SpawnDirector(BareTrack, Champion);
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	TestNotNull(TEXT("On a bare track the director places lights"), Director->GetLights());
	TestEqual(TEXT("One set"), CountActors<ADojoP14StartLights>(BareTrack), 1);

	TickUntil(BareTrack, 121.f);
	TestFalse(TEXT("Round 1 timed out"), Director->IsRunning());
	Director->RestartRound();
	TickUntil(BareTrack, 125.f);

	TestEqual(TEXT("Still one set of lights after a restart"), CountActors<ADojoP14StartLights>(BareTrack), 1);
	TestTrue(TEXT("The same lights turned green for round 2"), Director->GetLights()->IsGreen());
	TestEqual(TEXT("Still one finish line"), CountActors<ADojoP14FinishLine>(BareTrack), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_TimeTrial_TimeRunsOut, "Dojo.P14.TimeTrial.TimeRunsOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** 120 seconds without three laps is TIME UP; the laps already finished stay in the log, and R starts a clean round. */
bool FDojo_P14_TimeTrial_TimeRunsOut::RunTest(const FString& Parameters)
{
	using namespace DojoP14TrialTest;

	FDojoTestWorld TestWorld;
	AActor* Champion = SpawnChampion(TestWorld);
	ADojoP14TrialDirector* Director = SpawnDirector(TestWorld, Champion);
	if (!TestNotNull(TEXT("Champion spawned"), Champion) || !TestNotNull(TEXT("Director spawned"), Director)) return false;

	TickUntil(TestWorld, 3.5f);
	DriveLap(TestWorld, Champion, 10.f);
	Director->RestartRound();
	TestEqual(TEXT("R during a round changes nothing"), Director->GetLapsThisRound(), 1);

	TickUntil(TestWorld, 119.f);
	TestTrue(TEXT("At 119 seconds the round still runs"), Director->IsRunning());
	TickUntil(TestWorld, 121.f);
	TestFalse(TEXT("At 121 seconds it has timed out"), Director->IsRunning());
	TestEqual(TEXT("The label says TIME UP"), LabelOf(Director), FString(TEXT("TIME UP")));
	TestEqual(TEXT("The finished lap stays in the log"), Director->GetRankedLog()->GetLapCountFor(Driver()), 1);

	Champion->SetActorLocation(FVector(-200.f, 0.f, 0.f));
	TestWorld.Tick(1);
	Champion->SetActorLocation(FVector(200.f, 0.f, 0.f));
	TestWorld.Tick(1);
	TestEqual(TEXT("Between rounds a crossing counts nothing"), Director->GetFalseStarts(), 0);

	Director->RestartRound();
	TestTrue(TEXT("R starts round 2"), Director->IsRunning());
	TestEqual(TEXT("With no laps"), Director->GetLapsThisRound(), 0);
	TestEqual(TEXT("And no false starts"), Director->GetFalseStarts(), 0);
	TestTrue(TEXT("The lights are red again"), !Director->GetLights()->IsGreen());
	TestEqual(TEXT("One finish line stands"), CountActors<ADojoP14FinishLine>(TestWorld), 1);

	return true;
}

#endif
