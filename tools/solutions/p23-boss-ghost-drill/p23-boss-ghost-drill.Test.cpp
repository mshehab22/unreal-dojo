#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p23-boss-ghost-drill/DojoP23GhostDrill.h"
#include "Quests/p4-drum-pad/DojoP4DrumPad.h"
#include "Quests/p5-drill-orders/DojoP5DrillDummy.h"
#include "Support/DojoTestWorld.h"

namespace DojoP23DrillTest
{
	/** Ticks frames of FrameSeconds until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds, float FrameSeconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1, FrameSeconds);
	}

	/** Ticks until Start plus At, then presses a move. */
	void PressAt(FDojoTestWorld& TestWorld, ADojoP23GhostDrill* Drill, float Start, float At, EDojoP5DrillMove Move, float FrameSeconds)
	{
		TickUntil(TestWorld, Start + At, FrameSeconds);
		Drill->PressMove(Move);
	}

	/** The first round's moves, pressed in the middle of fixed steps: left, block, right twice at once, and block. */
	void PlayFirstScript(FDojoTestWorld& TestWorld, ADojoP23GhostDrill* Drill, float Start, float FrameSeconds)
	{
		PressAt(TestWorld, Drill, Start, 0.55f, EDojoP5DrillMove::EDM_StepLeft, FrameSeconds);
		PressAt(TestWorld, Drill, Start, 1.25f, EDojoP5DrillMove::EDM_Block, FrameSeconds);
		PressAt(TestWorld, Drill, Start, 2.35f, EDojoP5DrillMove::EDM_StepRight, FrameSeconds);
		Drill->PressMove(EDojoP5DrillMove::EDM_StepRight);
		PressAt(TestWorld, Drill, Start, 3.85f, EDojoP5DrillMove::EDM_Block, FrameSeconds);
	}

	/** The recording as text: the step and a letter for each move, such as 6L 13B. */
	FString RecordingText(const ADojoP23GhostDrill* Drill)
	{
		FString Text;
		for (const FDojoP23RecordedCommand& Command : Drill->GetRecording())
		{
			const TCHAR* Letter = Command.Move == EDojoP5DrillMove::EDM_StepLeft ? TEXT("L") : (Command.Move == EDojoP5DrillMove::EDM_StepRight ? TEXT("R") : TEXT("B"));
			Text += (Text.IsEmpty() ? TEXT("") : TEXT(" ")) + FString::Printf(TEXT("%d%s"), Command.Step, Letter);
		}
		return Text;
	}

	/** Plays the first round at one frame rate and returns the ending: the live lane, blocks, both scores, the recording, and the result. */
	FString PlayFirstRoundAt(float FrameSeconds)
	{
		FDojoTestWorld TestWorld;

		ADojoP23GhostDrill* Drill = TestWorld.SpawnActor<ADojoP23GhostDrill>();
		if (!Drill) return FString(TEXT("no drill"));

		const float Start = TestWorld.GetWorld()->GetTimeSeconds();
		PlayFirstScript(TestWorld, Drill, Start, FrameSeconds);
		TickUntil(TestWorld, Start + 10.6f, FrameSeconds);

		return FString::Printf(TEXT("%d,%d,%d,%d|%s|%s"), Drill->GetLiveDummy()->GetLane(), Drill->GetLiveDummy()->GetBlocks(), Drill->GetLivePad()->GetScore(), Drill->GetGhostPad()->GetScore(), *RecordingText(Drill), *Drill->GetResult());
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_GhostDrill_TwoRoundsRecordThenReplay, "Dojo.P23.GhostDrill.TwoRoundsRecordThenReplay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two rounds at 30 frames a second: the live run is recorded by fixed step, the ghost replays it, and the two end the same. */
bool FDojo_P23_GhostDrill_TwoRoundsRecordThenReplay::RunTest(const FString& Parameters)
{
	using namespace DojoP23DrillTest;

	const float Frame = 1.f / 30.f;
	FDojoTestWorld TestWorld;

	ADojoP23GhostDrill* Drill = TestWorld.SpawnActor<ADojoP23GhostDrill>();
	if (!TestNotNull(TEXT("Drill spawned"), Drill)) return false;
	if (!TestNotNull(TEXT("The live dummy"), Drill->GetLiveDummy()) || !TestNotNull(TEXT("The ghost dummy"), Drill->GetGhostDummy())) return false;
	if (!TestNotNull(TEXT("The live pad"), Drill->GetLivePad()) || !TestNotNull(TEXT("The ghost pad"), Drill->GetGhostPad())) return false;

	TestTrue(TEXT("Round 1 is running"), Drill->IsRunning());
	TestTrue(TEXT("In its live run"), Drill->IsLive());
	TestEqual(TEXT("It is round 1"), Drill->GetRoundNumber(), 1);
	TestEqual(TEXT("The label shows the round, the phase, and both scores"), Drill->Label->Text.ToString(), FString(TEXT("Round 1  LIVE  Live 0  Ghost 0")));

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	PlayFirstScript(TestWorld, Drill, Start, Frame);

	TickUntil(TestWorld, Start + 5.5f, Frame);
	TestFalse(TEXT("The live run is over after 50 steps"), Drill->IsLive());
	TestEqual(TEXT("Five commands ran in the middle of their fixed steps; the two rights shared a step"), RecordingText(Drill), FString(TEXT("6L 13B 24R 24R 39B")));
	TestEqual(TEXT("The live dummy ended in lane 2"), Drill->GetLiveDummy()->GetLane(), 2);
	TestEqual(TEXT("With two blocks"), Drill->GetLiveDummy()->GetBlocks(), 2);
	TestEqual(TEXT("Five hits scored 50 on the live pad"), Drill->GetLivePad()->GetScore(), 50);
	TestEqual(TEXT("The ghost has not moved before its first recorded step"), Drill->GetGhostDummy()->GetLane(), 1);
	TestEqual(TEXT("And has scored nothing"), Drill->GetGhostPad()->GetScore(), 0);

	Drill->PressMove(EDojoP5DrillMove::EDM_StepLeft);
	TickUntil(TestWorld, Start + 6.55f, Frame);
	TestEqual(TEXT("A move pressed during the replay did nothing"), Drill->GetRecording().Num(), 5);
	TestEqual(TEXT("And the live dummy stayed in lane 2"), Drill->GetLiveDummy()->GetLane(), 2);
	TestEqual(TEXT("Midway through the replay the ghost has stepped left"), Drill->GetGhostDummy()->GetLane(), 0);
	TestEqual(TEXT("And blocked once"), Drill->GetGhostDummy()->GetBlocks(), 1);

	TickUntil(TestWorld, Start + 10.6f, Frame);
	TestFalse(TEXT("The round is over"), Drill->IsRunning());
	TestEqual(TEXT("The ghost ended in lane 2"), Drill->GetGhostDummy()->GetLane(), 2);
	TestEqual(TEXT("With two blocks"), Drill->GetGhostDummy()->GetBlocks(), 2);
	TestEqual(TEXT("And the same 50 points"), Drill->GetGhostPad()->GetScore(), 50);
	TestEqual(TEXT("So the ghost matches"), Drill->GetResult(), FString(TEXT("GHOST MATCHES")));
	TestEqual(TEXT("The label shows the result"), Drill->Label->Text.ToString(), FString(TEXT("Round 1  DONE  Live 50  Ghost 50  GHOST MATCHES")));

	Drill->PressNextRound();
	TestTrue(TEXT("Round 2 is running"), Drill->IsRunning());
	TestEqual(TEXT("It is round 2"), Drill->GetRoundNumber(), 2);
	TestEqual(TEXT("The recording starts again"), Drill->GetRecording().Num(), 0);
	TestEqual(TEXT("The dummies are fresh"), Drill->GetLiveDummy()->GetBlocks() + Drill->GetGhostDummy()->GetBlocks(), 0);
	TestEqual(TEXT("And so are the pads"), Drill->GetLivePad()->GetScore() + Drill->GetGhostPad()->GetScore(), 0);
	TestTrue(TEXT("And the result is empty"), Drill->GetResult().IsEmpty());

	const float SecondStart = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, SecondStart + 1.f, Frame);
	Drill->PressNextRound();
	TestEqual(TEXT("R does nothing while a round runs"), Drill->GetRoundNumber(), 2);

	PressAt(TestWorld, Drill, SecondStart, 1.05f, EDojoP5DrillMove::EDM_StepRight, Frame);
	PressAt(TestWorld, Drill, SecondStart, 1.55f, EDojoP5DrillMove::EDM_StepRight, Frame);
	PressAt(TestWorld, Drill, SecondStart, 4.95f, EDojoP5DrillMove::EDM_Block, Frame);
	PressAt(TestWorld, Drill, SecondStart, 5.05f, EDojoP5DrillMove::EDM_StepLeft, Frame);

	TickUntil(TestWorld, SecondStart + 10.6f, Frame);
	TestEqual(TEXT("Round 2 recorded three commands, the last on the very last live step; the move after it was ignored"), RecordingText(Drill), FString(TEXT("11R 16R 50B")));
	TestEqual(TEXT("The live dummy is in lane 2 with one block"), Drill->GetLiveDummy()->GetLane() * 10 + Drill->GetLiveDummy()->GetBlocks(), 21);
	TestEqual(TEXT("The ghost ended the same way"), Drill->GetGhostDummy()->GetLane() * 10 + Drill->GetGhostDummy()->GetBlocks(), 21);
	TestEqual(TEXT("Three hits, 30 points on each pad"), Drill->GetLivePad()->GetScore() + Drill->GetGhostPad()->GetScore(), 60);
	TestEqual(TEXT("The label shows round 2 and its result"), Drill->Label->Text.ToString(), FString(TEXT("Round 2  DONE  Live 30  Ghost 30  GHOST MATCHES")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_GhostDrill_FrameRateDoesNotChangeTheRun, "Dojo.P23.GhostDrill.FrameRateDoesNotChangeTheRun", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The same moves at 30, 60, and 144 frames a second give the same recording, the same ending, and the same scores. */
bool FDojo_P23_GhostDrill_FrameRateDoesNotChangeTheRun::RunTest(const FString& Parameters)
{
	using namespace DojoP23DrillTest;

	const FString Expected(TEXT("2,2,50,50|6L 13B 24R 24R 39B|GHOST MATCHES"));

	TestEqual(TEXT("At 30 frames a second"), PlayFirstRoundAt(1.f / 30.f), Expected);
	TestEqual(TEXT("At 60 frames a second"), PlayFirstRoundAt(1.f / 60.f), Expected);
	TestEqual(TEXT("At 144 frames a second"), PlayFirstRoundAt(1.f / 144.f), Expected);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_GhostDrill_ALongFrameCannotStartASpiral, "Dojo.P23.GhostDrill.ALongFrameCannotStartASpiral", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A stall of five seconds, handed straight to Tick because the engine caps a real frame at 0.4 seconds, runs only the most steps allowed and forgets the rest, so the next ordinary frame runs just its own. */
bool FDojo_P23_GhostDrill_ALongFrameCannotStartASpiral::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP23GhostDrill* Drill = TestWorld.SpawnActor<ADojoP23GhostDrill>();
	if (!TestNotNull(TEXT("Drill spawned"), Drill)) return false;

	TestWorld.Tick(1, 0.4f);
	TestEqual(TEXT("The longest frame the engine delivers, 0.4 seconds, runs four steps"), Drill->GetStepCount(), 4);

	Drill->Tick(5.f);
	TestEqual(TEXT("A stall of five seconds is fifty steps, but only eight may run in a frame"), Drill->GetStepCount(), 12);

	TestWorld.Tick(1, 0.15f);
	TestEqual(TEXT("The next frame runs the two steps it holds and none of the debt"), Drill->GetStepCount(), 14);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_GhostDrill_TunablesAreHonoured, "Dojo.P23.GhostDrill.TunablesAreHonoured", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A shorter live run and a longer step change when the live run ends and when the round is scored. */
bool FDojo_P23_GhostDrill_TunablesAreHonoured::RunTest(const FString& Parameters)
{
	using namespace DojoP23DrillTest;

	FDojoTestWorld TestWorld;

	ADojoP23GhostDrill* Drill = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP23GhostDrill>(ADojoP23GhostDrill::StaticClass(), FTransform::Identity);
	if (!TestNotNull(TEXT("Drill spawned"), Drill)) return false;

	Drill->LiveSteps = 10;
	Drill->FixedStepSeconds = 0.2f;
	Drill->FinishSpawning(FTransform::Identity);

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 1.5f, 1.f / 60.f);
	TestTrue(TEXT("The live run of ten 0.2 second steps lasts two seconds, so it is still going at 1.5"), Drill->IsLive());

	PressAt(TestWorld, Drill, Start, 1.7f, EDojoP5DrillMove::EDM_Block, 1.f / 60.f);
	TickUntil(TestWorld, Start + 2.3f, 1.f / 60.f);
	TestFalse(TEXT("It is over after two seconds"), Drill->IsLive());
	TestEqual(TEXT("The block at 1.7 ran on step 9, the one that ends at 1.8"), RecordingText(Drill), FString(TEXT("9B")));

	TickUntil(TestWorld, Start + 4.2f, 1.f / 60.f);
	TestTrue(TEXT("The replay and its scoring last four and a half seconds in all, so the round still runs at 4.2"), Drill->IsRunning());

	TickUntil(TestWorld, Start + 4.7f, 1.f / 60.f);
	TestFalse(TEXT("The round is scored at 4.5"), Drill->IsRunning());
	TestEqual(TEXT("And the ghost matches"), Drill->GetResult(), FString(TEXT("GHOST MATCHES")));

	return true;
}

#endif
