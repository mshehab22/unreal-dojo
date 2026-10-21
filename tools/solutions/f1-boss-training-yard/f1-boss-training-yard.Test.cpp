#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f1-boss-training-yard/DojoF1YardDirector.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f1-practice-bell/DojoF1PracticeBell.h"
#include "Quests/f1-score-keeper/DojoF1ScoreKeeper.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Support/DojoTestWorld.h"

namespace DojoF1YardTest
{
	/** Everything one yard needs, spawned and wired the way a designer would in the level. */
	struct FYard
	{
		TArray<ADojoF1PopupTarget*> Targets;
		TArray<ADojoF1TrainingDummy*> Dummies;
		ADojoF1ScoreKeeper* Keeper = nullptr;
		ADojoF1PracticeBell* Bell = nullptr;
		ADojoF1YardDirector* Director = nullptr;
	};

	/** Spawns 6 targets, 2 dummies, a keeper, a bell, and a director; the director starts round 1 in its BeginPlay. */
	FYard SpawnYard(FDojoTestWorld& TestWorld)
	{
		FYard Yard;

		for (int32 Index = 0; Index < 6; ++Index) Yard.Targets.Add(TestWorld.SpawnActor<ADojoF1PopupTarget>());
		for (int32 Index = 0; Index < 2; ++Index) Yard.Dummies.Add(TestWorld.SpawnActor<ADojoF1TrainingDummy>());
		Yard.Keeper = TestWorld.SpawnActor<ADojoF1ScoreKeeper>();
		Yard.Bell = TestWorld.SpawnActor<ADojoF1PracticeBell>();

		for (ADojoF1PopupTarget* Target : Yard.Targets) Yard.Keeper->Targets.Add(Target);
		for (ADojoF1TrainingDummy* Dummy : Yard.Dummies) Yard.Keeper->Targets.Add(Dummy);

		// Deferred so the designer's wiring is in place before BeginPlay starts round 1.
		Yard.Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoF1YardDirector>(ADojoF1YardDirector::StaticClass(), FTransform::Identity);
		for (ADojoF1PopupTarget* Target : Yard.Targets) Yard.Director->Targets.Add(Target);
		for (ADojoF1TrainingDummy* Dummy : Yard.Dummies) Yard.Director->Dummies.Add(Dummy);
		Yard.Director->Keeper = Yard.Keeper;
		Yard.Director->Bell = Yard.Bell;
		Yard.Director->FinishSpawning(FTransform::Identity);

		return Yard;
	}

	/** Index of a target in the given state, or INDEX_NONE. */
	int32 FindTarget(const FYard& Yard, EDojoF1TargetState State)
	{
		for (int32 Index = 0; Index < Yard.Targets.Num(); ++Index)
		{
			if (Yard.Targets[Index]->GetState() == State) return Index;
		}
		return INDEX_NONE;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F1_TrainingYard_RhythmAndLimits, "Dojo.F1.TrainingYard.RhythmAndLimits", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Leaves the yard alone for a whole round and checks the up limit, the auto lower, the round end, and that keys do nothing after it. */
bool FDojo_F1_TrainingYard_RhythmAndLimits::RunTest(const FString& Parameters)
{
	using namespace DojoF1YardTest;

	FDojoTestWorld TestWorld;
	FYard Yard = SpawnYard(TestWorld);

	TestTrue(TEXT("Round 1 starts on BeginPlay"), Yard.Director->IsRoundRunning());

	TArray<int32> FramesUp;
	FramesUp.Init(0, Yard.Targets.Num());
	int32 MostRaised = 0;
	int32 LongestUp = 0;

	// 44 seconds: still inside the 45 second round.
	for (int32 Frame = 0; Frame < 60 * 44; ++Frame)
	{
		TestWorld.Tick(1);

		MostRaised = FMath::Max(MostRaised, Yard.Director->CountRaised());
		for (int32 Index = 0; Index < Yard.Targets.Num(); ++Index)
		{
			const bool bUp = Yard.Targets[Index]->GetState() == EDojoF1TargetState::ETS_Raised;
			FramesUp[Index] = bUp ? FramesUp[Index] + 1 : 0;
			LongestUp = FMath::Max(LongestUp, FramesUp[Index]);
		}
	}

	TestEqual(TEXT("Never more than 2 targets up, and the limit is reached"), MostRaised, 2);
	TestTrue(TEXT("No target stays up much past 2.5 seconds"), LongestUp <= FMath::CeilToInt((2.5f + 0.1f) * 60.f) + 2);
	TestTrue(TEXT("Targets do stay up for most of the 2.5 seconds"), LongestUp >= FMath::FloorToInt(2.4f * 60.f));
	TestTrue(TEXT("Still running at 44 seconds"), Yard.Director->IsRoundRunning());

	TestWorld.Tick(120);
	TestFalse(TEXT("The round ends after 45 seconds"), Yard.Director->IsRoundRunning());

	const int32 RaisedAtEnd = Yard.Director->CountRaised();
	TestWorld.Tick(180);
	TestEqual(TEXT("Nothing rises or drops between rounds"), Yard.Director->CountRaised(), RaisedAtEnd);

	Yard.Director->HitTarget(0);
	Yard.Director->StrikeDummy(0);
	TestEqual(TEXT("Keys between rounds add no misses"), Yard.Targets[0]->GetMissCount(), 0);
	TestEqual(TEXT("Keys between rounds strike nothing"), Yard.Dummies[0]->GetHitsTaken(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F1_TrainingYard_TwoRoundsPlayAlike, "Dojo.F1.TrainingYard.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two strong rounds with one miss each and checks the score, the miss floor, the bell once per round, and the full reset. */
bool FDojo_F1_TrainingYard_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoF1YardTest;

	FDojoTestWorld TestWorld;
	FYard Yard = SpawnYard(TestWorld);

	for (int32 Round = 1; Round <= 2; ++Round)
	{
		const FString Prefix = FString::Printf(TEXT("Round %d: "), Round);

		TestTrue(Prefix + TEXT("running"), Yard.Director->IsRoundRunning());
		TestEqual(Prefix + TEXT("starts at 0"), Yard.Keeper->CountScore(), 0);
		TestEqual(Prefix + TEXT("keeper label reset to 0"), Yard.Keeper->Label->Text.ToString(), FString(TEXT("0")));

		const int32 FirstMiss = FindTarget(Yard, EDojoF1TargetState::ETS_Lowered);
		Yard.Director->HitTarget(FirstMiss);
		TestEqual(Prefix + TEXT("a hit on a lowered target is a miss"), Yard.Targets[FirstMiss]->GetMissCount(), 1);
		TestEqual(Prefix + TEXT("the miss shows on the target"), Yard.Targets[FirstMiss]->Label->Text.ToString(), FString(TEXT("MISS")));
		TestEqual(Prefix + TEXT("a miss at 0 keeps the score at 0"), Yard.Keeper->CountScore(), 0);

		// Break all six targets: 150 earned, minus the miss, is 145; no bell yet.
		int32 Frames = 0;
		while (FindTarget(Yard, EDojoF1TargetState::ETS_Lowered) != INDEX_NONE || FindTarget(Yard, EDojoF1TargetState::ETS_Raised) != INDEX_NONE)
		{
			const int32 Raised = FindTarget(Yard, EDojoF1TargetState::ETS_Raised);
			if (Raised != INDEX_NONE) Yard.Director->HitTarget(Raised);

			TestWorld.Tick(1);
			if (++Frames > 60 * 40) break;
		}

		TestEqual(Prefix + TEXT("all six broken, minus the earlier miss"), Yard.Keeper->CountScore(), 145);
		TestEqual(Prefix + TEXT("the bell has not rung below 150"), Yard.Bell->GetRingCount(), Round - 1);

		Yard.Director->StrikeDummy(0);
		TestEqual(Prefix + TEXT("one strike reaches 150"), Yard.Keeper->CountScore(), 150);
		TestEqual(Prefix + TEXT("the bell rings once at 150"), Yard.Bell->GetRingCount(), Round);

		Yard.Director->StrikeDummy(0);
		Yard.Director->StrikeDummy(0);
		Yard.Director->StrikeDummy(1);
		TestEqual(Prefix + TEXT("the bell does not ring again in the same round"), Yard.Bell->GetRingCount(), Round);
		TestEqual(Prefix + TEXT("four strikes and six broken targets minus one miss"), Yard.Keeper->CountScore(), 165);

		Yard.Director->RestartRound();
		TestTrue(Prefix + TEXT("R does nothing while a round runs"), Yard.Keeper->CountScore() == 165);

		TestWorld.Tick(60 * 46);
		TestFalse(Prefix + TEXT("over after 45 seconds"), Yard.Director->IsRoundRunning());
		TestEqual(Prefix + TEXT("the final score stays on the keeper's label"), Yard.Keeper->Label->Text.ToString(), FString(TEXT("165")));

		Yard.Director->HitTarget(0);
		TestEqual(Prefix + TEXT("a key between rounds changes nothing"), Yard.Keeper->CountScore(), 165);

		if (Round == 1)
		{
			Yard.Director->RestartRound();

			bool bAllReset = true;
			for (ADojoF1PopupTarget* Target : Yard.Targets)
			{
				bAllReset &= Target->GetState() == EDojoF1TargetState::ETS_Lowered && Target->GetMissCount() == 0;
			}
			TestTrue(TEXT("R between rounds resets every target to lowered with no misses"), bAllReset);
			TestFalse(TEXT("R between rounds stands every dummy up"), Yard.Dummies[0]->IsKnockedDown());
		}
	}

	return true;
}

#endif
