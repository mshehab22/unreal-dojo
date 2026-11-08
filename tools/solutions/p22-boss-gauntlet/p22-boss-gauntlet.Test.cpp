#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p22-boss-gauntlet/DojoP22Gauntlet.h"
#include "Quests/p22-checkpoint-desk/DojoP22CheckpointDesk.h"
#include "Quests/p22-hit-feedback/DojoP22HitFeedback.h"
#include "Quests/p22-hit-feedback/DojoP22HudTicker.h"
#include "Quests/p22-hit-feedback/DojoP22SoundDesk.h"
#include "Quests/p22-hit-feedback/DojoP22SparkPool.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoP22GauntletTest
{
	/** A runner and the gauntlet it runs. */
	struct FGauntletScene
	{
		ADojoTestActor* Runner = nullptr;
		ADojoP22Gauntlet* Gauntlet = nullptr;
	};

	/** Builds a gauntlet with a runner, wired the way a designer wires it in Details; round 1 starts at BeginPlay. */
	FGauntletScene MakeGauntlet(FDojoTestWorld& TestWorld)
	{
		FGauntletScene Scene;
		Scene.Runner = TestWorld.GetWorld()->SpawnActor<ADojoTestActor>(FVector(-500.0, 0.0, 0.0), FRotator::ZeroRotator);
		Scene.Gauntlet = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP22Gauntlet>(ADojoP22Gauntlet::StaticClass(), FTransform(FVector(0.0, 0.0, 500.0)));
		Scene.Gauntlet->Runner = Scene.Runner;
		Scene.Gauntlet->FinishSpawning(FTransform(FVector(0.0, 0.0, 500.0)));
		return Scene;
	}

	/** The label's text, or a message that says the gauntlet has no label. */
	FString LabelOf(const FGauntletScene& Scene)
	{
		if (!Scene.Gauntlet->Label) return TEXT("(the gauntlet has no Label component)");

		return Scene.Gauntlet->Label->Text.ToString();
	}

	/** What the three desks behind the facade have recorded so far. */
	struct FFeedbackCounts
	{
		int32 Hits = 0;
		int32 HeavyHits = 0;
		int32 Misses = 0;
		int32 Bursts = 0;
		int32 Lines = 0;
		int32 Flashes = 0;
		float LastVolume = 0.f;
	};

	/** Reads the desks' records. */
	FFeedbackCounts ReadFeedback(UWorld* World)
	{
		FFeedbackCounts Counts;
		for (const FDojoP22PlayedCue& Played : World->GetSubsystem<UDojoP22SoundDesk>()->GetPlayed())
		{
			if (Played.Cue == TEXT("Hit")) ++Counts.Hits;
			else if (Played.Cue == TEXT("HeavyHit")) ++Counts.HeavyHits;
			else if (Played.Cue == TEXT("Miss")) ++Counts.Misses;
			Counts.LastVolume = Played.Volume;
		}
		Counts.Bursts = World->GetSubsystem<UDojoP22SparkPool>()->GetBursts().Num();
		Counts.Lines = World->GetSubsystem<UDojoP22HudTicker>()->GetPushedCount();
		Counts.Flashes = World->GetSubsystem<UDojoP22HudTicker>()->GetFlashCount();
		return Counts;
	}

	/** Steps the runner next to dummy Index and strikes Times times, a few frames apart. */
	void StrikeDummy(FDojoTestWorld& TestWorld, const FGauntletScene& Scene, int32 Index, int32 Times)
	{
		Scene.Runner->SetActorLocation(Scene.Gauntlet->GetDummySpot(Index) + FVector(-60.0, 0.0, 0.0));
		for (int32 Strike = 0; Strike < Times; ++Strike)
		{
			Scene.Gauntlet->PressStrike();
			TestWorld.Tick(6);
		}
	}

	/** What one played round showed. */
	struct FRoundResult
	{
		bool bPlayed = false;
		FString Label;
		int32 Health = 0;
		FFeedbackCounts Feedback;
	};

	/** Plays one scripted round: a miss, gate 1, a fall back to it, gates 2 and 3. */
	FRoundResult PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FGauntletScene& Scene, const FString& Round)
	{
		const FString Prefix = Round + TEXT(": ");
		ADojoP22Gauntlet* Gauntlet = Scene.Gauntlet;
		UWorld* World = TestWorld.GetWorld();
		FRoundResult Result;

		if (!Test.TestTrue(Prefix + TEXT("the round runs"), Gauntlet->IsRunning())) return Result;
		Test.TestEqual(Prefix + TEXT("the runner starts at full health"), Gauntlet->GetHealth(), 100);
		Test.TestTrue(Prefix + TEXT("and at the start"), Scene.Runner->GetActorLocation().Equals(FVector::ZeroVector, 0.1));
		Test.TestEqual(Prefix + TEXT("no gate is open"), Gauntlet->GetGatesOpen(), 0);
		Test.TestEqual(Prefix + TEXT("no checkpoint is kept"), World->GetSubsystem<UDojoP22CheckpointDesk>()->GetCheckpointCount(), 0);
		Test.TestEqual(Prefix + TEXT("the label shows the fresh round"), LabelOf(Scene), FString(TEXT("GATE 1/3  HEALTH 100  60 s")));

		const FFeedbackCounts Before = ReadFeedback(World);

		Gauntlet->PressStrike();
		TestWorld.Tick(6);
		const FFeedbackCounts AfterMiss = ReadFeedback(World);
		Test.TestEqual(Prefix + TEXT("a strike with no dummy in reach plays the miss cue"), AfterMiss.Misses - Before.Misses, 1);
		Test.TestEqual(Prefix + TEXT("and nothing else"), AfterMiss.Bursts + AfterMiss.Lines + AfterMiss.Hits, Before.Bursts + Before.Lines + Before.Hits);

		StrikeDummy(TestWorld, Scene, 3, 1);
		Test.TestEqual(Prefix + TEXT("a dummy behind a closed gate cannot be struck"), Gauntlet->GetDummyHealth(3), 60);

		for (int32 Dummy = 0; Dummy < 3; ++Dummy) StrikeDummy(TestWorld, Scene, Dummy, 3);
		if (!Test.TestEqual(Prefix + TEXT("breaking gate 1's three dummies opens it"), Gauntlet->GetGatesOpen(), 1)) return Result;
		Test.TestEqual(Prefix + TEXT("and keeps one checkpoint"), World->GetSubsystem<UDojoP22CheckpointDesk>()->GetCheckpointCount(), 1);

		Scene.Runner->SetActorLocation(FVector(1500.0, 300.0, 0.0));
		Gauntlet->RunnerFell();
		Test.TestEqual(Prefix + TEXT("the pit takes 30 health"), Gauntlet->GetHealth(), 70);
		Test.TestTrue(Prefix + TEXT("and sends the runner back to gate 1"), Scene.Runner->GetActorLocation().Equals(FVector(1000.0, 0.0, 0.0), 0.1));

		Gauntlet->RestartRound();
		if (!Test.TestEqual(Prefix + TEXT("R does nothing mid-round"), Gauntlet->GetGatesOpen(), 1)) return Result;

		for (int32 Dummy = 3; Dummy < 9; ++Dummy) StrikeDummy(TestWorld, Scene, Dummy, 3);
		if (!Test.TestFalse(Prefix + TEXT("opening gate 3 ends the round"), Gauntlet->IsRunning())) return Result;
		Test.TestEqual(Prefix + TEXT("three checkpoints are kept"), World->GetSubsystem<UDojoP22CheckpointDesk>()->GetCheckpointCount(), 3);

		const FFeedbackCounts After = ReadFeedback(World);
		Test.TestEqual(Prefix + TEXT("eighteen strikes that did not break a dummy played the hit cue"), After.Hits - Before.Hits, 18);
		Test.TestEqual(Prefix + TEXT("nine breaking strikes played the heavy cue"), After.HeavyHits - Before.HeavyHits, 9);
		Test.TestEqual(Prefix + TEXT("and flashed the edge"), After.Flashes - Before.Flashes, 9);
		Test.TestEqual(Prefix + TEXT("every hit threw sparks"), After.Bursts - Before.Bursts, 27);
		Test.TestEqual(Prefix + TEXT("and put a line on the ticker"), After.Lines - Before.Lines, 27);
		Test.TestEqual(Prefix + TEXT("everything played on the opened effects bus"), After.LastVolume, 0.8f);

		const FString Expected = FString::Printf(TEXT("CLEAR %.1f s"), Gauntlet->GetElapsed());
		Test.TestEqual(Prefix + TEXT("the label calls the clear time"), LabelOf(Scene), Expected);

		Gauntlet->PressStrike();
		Gauntlet->RunnerFell();
		TestWorld.Tick(60);
		Test.TestEqual(Prefix + TEXT("after the round, a strike plays nothing"), ReadFeedback(World).Misses, After.Misses);
		Test.TestEqual(Prefix + TEXT("and the pit takes nothing"), Gauntlet->GetHealth(), 70);
		Test.TestEqual(Prefix + TEXT("and the label still shows the clear time"), LabelOf(Scene), Expected);

		Result.bPlayed = true;
		Result.Label = LabelOf(Scene);
		Result.Health = Gauntlet->GetHealth();
		Result.Feedback = After;
		Result.Feedback.Hits -= Before.Hits;
		Result.Feedback.HeavyHits -= Before.HeavyHits;
		Result.Feedback.Misses -= Before.Misses;
		Result.Feedback.Bursts -= Before.Bursts;
		Result.Feedback.Lines -= Before.Lines;
		Result.Feedback.Flashes -= Before.Flashes;
		return Result;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_Gauntlet_TwoRoundsPlayAlike, "Dojo.P22.Gauntlet.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a scripted round, restarts with R, plays it again, and checks the second round looks, sounds, and ends exactly like the first. */
bool FDojo_P22_Gauntlet_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoP22GauntletTest;

	FDojoTestWorld TestWorld;
	const FGauntletScene Scene = MakeGauntlet(TestWorld);
	if (!TestNotNull(TEXT("The gauntlet spawned"), Scene.Gauntlet)) return false;

	const FRoundResult First = PlayRound(*this, TestWorld, Scene, TEXT("Round 1"));
	if (!First.bPlayed) return false;

	Scene.Gauntlet->RestartRound();
	const FRoundResult Second = PlayRound(*this, TestWorld, Scene, TEXT("Round 2"));
	if (!Second.bPlayed) return false;

	TestEqual(TEXT("The second round ends with the same label"), Second.Label, First.Label);
	TestEqual(TEXT("and the same health"), Second.Health, First.Health);
	TestEqual(TEXT("and the same hits"), Second.Feedback.Hits, First.Feedback.Hits);
	TestEqual(TEXT("and the same misses"), Second.Feedback.Misses, First.Feedback.Misses);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_Gauntlet_PitAndDefeat, "Dojo.P22.Gauntlet.PitAndDefeat", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A fall before any gate sends the runner to the start, a fall after two gates goes to the newer one, and the fourth fall ends the round. */
bool FDojo_P22_Gauntlet_PitAndDefeat::RunTest(const FString& Parameters)
{
	using namespace DojoP22GauntletTest;

	FDojoTestWorld TestWorld;
	const FGauntletScene Scene = MakeGauntlet(TestWorld);
	if (!TestNotNull(TEXT("The gauntlet spawned"), Scene.Gauntlet)) return false;

	Scene.Runner->SetActorLocation(FVector(400.0, 100.0, 0.0));
	Scene.Gauntlet->RunnerFell();
	TestTrue(TEXT("Before any gate opens, the pit sends the runner to the start"), Scene.Runner->GetActorLocation().Equals(FVector::ZeroVector, 0.1));
	TestEqual(TEXT("and takes 30 health"), Scene.Gauntlet->GetHealth(), 70);

	for (int32 Dummy = 0; Dummy < 6; ++Dummy) StrikeDummy(TestWorld, Scene, Dummy, 3);
	TestEqual(TEXT("Two gates are open"), Scene.Gauntlet->GetGatesOpen(), 2);

	Scene.Gauntlet->RunnerFell();
	TestTrue(TEXT("The pit sends the runner back to the newer gate, gate 2"), Scene.Runner->GetActorLocation().Equals(FVector(2000.0, 0.0, 0.0), 0.1));

	Scene.Gauntlet->RunnerFell();
	TestEqual(TEXT("The third fall leaves 10 health"), Scene.Gauntlet->GetHealth(), 10);
	TestTrue(TEXT("and the round still runs"), Scene.Gauntlet->IsRunning());

	Scene.Gauntlet->RunnerFell();
	TestFalse(TEXT("The fourth fall ends the round"), Scene.Gauntlet->IsRunning());
	TestEqual(TEXT("at 0 health"), Scene.Gauntlet->GetHealth(), 0);
	TestEqual(TEXT("and the label says DOWN"), LabelOf(Scene), FString(TEXT("DOWN")));

	Scene.Gauntlet->RestartRound();
	TestTrue(TEXT("R starts a fresh round after DOWN"), Scene.Gauntlet->IsRunning());
	TestEqual(TEXT("with full health"), Scene.Gauntlet->GetHealth(), 100);
	TestEqual(TEXT("and no checkpoint kept"), TestWorld.GetWorld()->GetSubsystem<UDojoP22CheckpointDesk>()->GetCheckpointCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_Gauntlet_TimeRunsOut, "Dojo.P22.Gauntlet.TimeRunsOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A round with no clear ends at 60 seconds as TIME UP, and the label counts the seconds down before that. */
bool FDojo_P22_Gauntlet_TimeRunsOut::RunTest(const FString& Parameters)
{
	using namespace DojoP22GauntletTest;

	FDojoTestWorld TestWorld;
	const FGauntletScene Scene = MakeGauntlet(TestWorld);
	if (!TestNotNull(TEXT("The gauntlet spawned"), Scene.Gauntlet)) return false;

	TestWorld.Tick(60 * 30 + 42);
	TestEqual(TEXT("Thirty and seven tenths seconds in, the label shows 30 seconds left, rounded up"), LabelOf(Scene), FString(TEXT("GATE 1/3  HEALTH 100  30 s")));

	TestWorld.Tick(60 * 30);
	TestFalse(TEXT("At 60 seconds the round is over"), Scene.Gauntlet->IsRunning());
	TestEqual(TEXT("as TIME UP"), LabelOf(Scene), FString(TEXT("TIME UP")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_Gauntlet_TheEarlierDummyWinsATie, "Dojo.P22.Gauntlet.TheEarlierDummyWinsATie", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A runner the same distance from two dummies strikes the earlier one. */
bool FDojo_P22_Gauntlet_TheEarlierDummyWinsATie::RunTest(const FString& Parameters)
{
	using namespace DojoP22GauntletTest;

	FDojoTestWorld TestWorld;
	const FGauntletScene Scene = MakeGauntlet(TestWorld);
	if (!TestNotNull(TEXT("The gauntlet spawned"), Scene.Gauntlet)) return false;

	const FVector Earlier = Scene.Gauntlet->GetDummySpot(0);
	const FVector Later = Scene.Gauntlet->GetDummySpot(1);
	Scene.Runner->SetActorLocation((Earlier + Later) * 0.5);
	Scene.Gauntlet->PressStrike();
	TestWorld.Tick(6);

	TestEqual(TEXT("With two dummies the same distance away, the earlier one is struck"), Scene.Gauntlet->GetDummyHealth(0), 35);
	TestEqual(TEXT("and the later one is not"), Scene.Gauntlet->GetDummyHealth(1), 60);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_Gauntlet_LabelFollowsTheRun, "Dojo.P22.Gauntlet.LabelFollowsTheRun", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The label shows the gate ahead after a gate opens, and the lower health after a fall. */
bool FDojo_P22_Gauntlet_LabelFollowsTheRun::RunTest(const FString& Parameters)
{
	using namespace DojoP22GauntletTest;

	FDojoTestWorld TestWorld;
	const FGauntletScene Scene = MakeGauntlet(TestWorld);
	if (!TestNotNull(TEXT("The gauntlet spawned"), Scene.Gauntlet)) return false;

	for (int32 Dummy = 0; Dummy < 3; ++Dummy) StrikeDummy(TestWorld, Scene, Dummy, 3);
	if (!TestEqual(TEXT("Breaking gate 1's three dummies opens it"), Scene.Gauntlet->GetGatesOpen(), 1)) return false;

	TestWorld.Tick(2);
	TestTrue(TEXT("Once gate 1 is open, the label shows GATE 2/3 with full health"), LabelOf(Scene).StartsWith(TEXT("GATE 2/3  HEALTH 100")));

	Scene.Gauntlet->RunnerFell();
	TestWorld.Tick(2);
	TestTrue(TEXT("After a fall, the label shows the lower health"), LabelOf(Scene).StartsWith(TEXT("GATE 2/3  HEALTH 70")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_Gauntlet_FeelComesFromTheFacade, "Dojo.P22.Gauntlet.FeelComesFromTheFacade", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moving the feedback facade's heavy threshold changes how the master's 25 damage strike feels, with no change to the master. */
bool FDojo_P22_Gauntlet_FeelComesFromTheFacade::RunTest(const FString& Parameters)
{
	using namespace DojoP22GauntletTest;

	FDojoTestWorld TestWorld;
	const FGauntletScene Scene = MakeGauntlet(TestWorld);
	if (!TestNotNull(TEXT("The gauntlet spawned"), Scene.Gauntlet)) return false;

	UWorld* World = TestWorld.GetWorld();
	UDojoP22HitFeedback* Feedback = World->GetSubsystem<UDojoP22HitFeedback>();
	if (!TestNotNull(TEXT("The world has the hit feedback subsystem"), Feedback)) return false;

	Feedback->SetHeavyDamage(20.f);
	const FFeedbackCounts Before = ReadFeedback(World);
	StrikeDummy(TestWorld, Scene, 0, 1);
	const FFeedbackCounts After = ReadFeedback(World);

	TestEqual(TEXT("With the facade's threshold at 20, a strike that does not break a dummy is a heavy hit"), After.HeavyHits - Before.HeavyHits, 1);
	TestEqual(TEXT("and not a light one"), After.Hits - Before.Hits, 0);
	TestEqual(TEXT("and it flashed the edge"), After.Flashes - Before.Flashes, 1);

	return true;
}

#endif
