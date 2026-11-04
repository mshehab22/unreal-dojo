#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "EngineUtils.h"
#include "Quests/p18-boss-moth-meadow/DojoP18Meadow.h"
#include "Quests/p18-lantern-grid/DojoP18Lantern.h"
#include "Quests/p18-moth-swarm/DojoP18MothSwarm.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoP18MeadowTest
{
	/** A keeper and the meadow it walks. */
	struct FMeadowScene
	{
		ADojoTestActor* Keeper = nullptr;
		ADojoP18Meadow* Meadow = nullptr;
	};

	/** Builds a meadow with a keeper far outside it, wired the way a designer wires it in Details; round 1 starts at BeginPlay. */
	FMeadowScene MakeMeadow(FDojoTestWorld& TestWorld)
	{
		FMeadowScene Scene;
		Scene.Keeper = TestWorld.GetWorld()->SpawnActor<ADojoTestActor>(FVector(9000.0, 9000.0, 0.0), FRotator::ZeroRotator);
		Scene.Meadow = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP18Meadow>(ADojoP18Meadow::StaticClass(), FTransform::Identity);
		Scene.Meadow->Keeper = Scene.Keeper;
		Scene.Meadow->FinishSpawning(FTransform::Identity);
		return Scene;
	}

	/** The label's text. */
	FString LabelOf(const FMeadowScene& Scene)
	{
		return Scene.Meadow->Label->Text.ToString();
	}

	/** How many live actors of a class the world holds. */
	template<typename TActor>
	int32 CountActors(FDojoTestWorld& TestWorld)
	{
		int32 Count = 0;
		for (TActorIterator<TActor> It(TestWorld.GetWorld()); It; ++It) ++Count;
		return Count;
	}

	/** How many lanterns burn. */
	int32 CountLit(const TArray<ADojoP18Lantern*>& Lanterns)
	{
		int32 Lit = 0;
		for (const ADojoP18Lantern* Lantern : Lanterns)
		{
			if (Lantern->bLit) ++Lit;
		}
		return Lit;
	}

	/** The lantern E should light from From, by measuring every lantern: the nearest unlit one within Range, the earlier on a tie; INDEX_NONE when none. */
	int32 ExpectedLight(const TArray<ADojoP18Lantern*>& Lanterns, const FVector& From, double Range)
	{
		int32 Best = INDEX_NONE;
		double BestDistance = TNumericLimits<double>::Max();
		for (int32 Index = 0; Index < Lanterns.Num(); ++Index)
		{
			const double Distance = FVector::Dist2D(Lanterns[Index]->GetActorLocation(), From);
			if (Lanterns[Index]->bLit || Distance > Range) continue;
			if (Distance < BestDistance)
			{
				Best = Index;
				BestDistance = Distance;
			}
		}
		return Best;
	}

	/** Moths within Range of at least one burning lantern, each counted once, by measuring every moth against every lantern. */
	int32 ExpectedDrawn(const ADojoP18Meadow* Meadow, double Range)
	{
		const TArray<ADojoP18Lantern*> Lanterns = Meadow->GetLanterns();
		int32 Drawn = 0;
		for (const FDojoP18Moth& Moth : Meadow->GetSwarm()->GetMoths())
		{
			for (const ADojoP18Lantern* Lantern : Lanterns)
			{
				const FVector Spot = Lantern->GetActorLocation();
				if (Lantern->bLit && FVector2D::Distance(Moth.Position, FVector2D(Spot.X, Spot.Y)) <= Range)
				{
					++Drawn;
					break;
				}
			}
		}
		return Drawn;
	}

	/** Moths within Range of each burning lantern, added up lantern by lantern, so a moth near two lanterns counts twice. */
	int32 DrawnSummedPerLantern(const ADojoP18Meadow* Meadow, double Range)
	{
		int32 Sum = 0;
		for (const ADojoP18Lantern* Lantern : Meadow->GetLanterns())
		{
			if (!Lantern->bLit) continue;
			const FVector Spot = Lantern->GetActorLocation();
			for (const FDojoP18Moth& Moth : Meadow->GetSwarm()->GetMoths())
			{
				if (FVector2D::Distance(Moth.Position, FVector2D(Spot.X, Spot.Y)) <= Range) ++Sum;
			}
		}
		return Sum;
	}

	/** Ticks one frame and, when a whole second was scored in it, checks the moths drawn against a full count; false when the count was wrong. */
	bool TickAndCheck(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FMeadowScene& Scene, const FString& Prefix, int32& OutScored)
	{
		const int32 Before = Scene.Meadow->GetScoredSeconds();
		TestWorld.Tick(1);
		const int32 After = Scene.Meadow->GetScoredSeconds();
		if (After == Before) return true;

		OutScored += Scene.Meadow->GetLastDrawn();
		const int32 Expected = ExpectedDrawn(Scene.Meadow, 250.0);
		return Test.TestEqual(Prefix + FString::Printf(TEXT("second %d draws every moth within 250 of a burning lantern, once each"), After), Scene.Meadow->GetLastDrawn(), Expected);
	}

	/** Moves the keeper onto Spot and presses E; returns the lantern that lit, or INDEX_NONE. */
	int32 LightAt(const FMeadowScene& Scene, const FVector& Spot)
	{
		const TArray<ADojoP18Lantern*> Before = Scene.Meadow->GetLanterns();
		TArray<bool> WasLit;
		for (const ADojoP18Lantern* Lantern : Before) WasLit.Add(Lantern->bLit);

		Scene.Keeper->SetActorLocation(Spot);
		Scene.Meadow->PressLight();

		for (int32 Index = 0; Index < Before.Num(); ++Index)
		{
			if (Before[Index]->bLit && !WasLit[Index]) return Index;
		}
		return INDEX_NONE;
	}

	/** What one played round showed: where the lanterns stood, where the moths started, and the score. */
	struct FRoundResult
	{
		TArray<FVector> LanternSpots;
		TArray<FVector2D> MothStarts;
		int32 Score = INDEX_NONE;
	};

	/** Plays one scripted round: three lanterns lit at fixed times, every scored second checked against a full count, then the end. */
	FRoundResult PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FMeadowScene& Scene, const FString& Round)
	{
		const FString Prefix = Round + TEXT(": ");
		ADojoP18Meadow* Meadow = Scene.Meadow;
		FRoundResult Result;

		const TArray<ADojoP18Lantern*> Lanterns = Meadow->GetLanterns();
		if (!Test.TestEqual(Prefix + TEXT("300 lanterns stand in the meadow"), Lanterns.Num(), 300)) return Result;
		if (!Test.TestNotNull(Prefix + TEXT("the meadow has a swarm"), Meadow->GetSwarm())) return Result;
		Test.TestEqual(Prefix + TEXT("and no more lantern actors than that"), CountActors<ADojoP18Lantern>(TestWorld), 300);
		Test.TestEqual(Prefix + TEXT("one swarm"), CountActors<ADojoP18MothSwarm>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("2000 moths"), Meadow->GetSwarm()->GetMoths().Num(), 2000);
		Test.TestTrue(Prefix + TEXT("the round runs"), Meadow->IsRunning());
		Test.TestEqual(Prefix + TEXT("nothing burns yet"), CountLit(Lanterns), 0);
		Test.TestEqual(Prefix + TEXT("the label shows the fresh round"), LabelOf(Scene), FString(TEXT("SCORE 0  LIT 0  30 s")));

		for (const ADojoP18Lantern* Lantern : Lanterns) Result.LanternSpots.Add(Lantern->GetActorLocation());
		for (const FDojoP18Moth& Moth : Meadow->GetSwarm()->GetMoths()) Result.MothStarts.Add(Moth.Position);

		int32 Scored = 0;
		const FVector Plan[] = { Lanterns[0]->GetActorLocation() + FVector(40.0, 0.0, 0.0), Lanterns[1]->GetActorLocation() + FVector(0.0, -60.0, 0.0), Lanterns[2]->GetActorLocation() };
		const int32 PlanFrames[] = { 6, 180, 600 };

		int32 Frame = 0;
		int32 LitByPress[3] = { INDEX_NONE, INDEX_NONE, INDEX_NONE };
		for (int32 Press = 0; Press < 3; ++Press)
		{
			while (Frame < PlanFrames[Press])
			{
				if (!TickAndCheck(Test, TestWorld, Scene, Prefix, Scored)) return Result;
				++Frame;
			}

			if (Press == 2 && LitByPress[0] != INDEX_NONE && LitByPress[1] != INDEX_NONE)
			{
				Test.TestFalse(Prefix + TEXT("the first lantern lit has burnt out after 8 seconds"), Lanterns[LitByPress[0]]->bLit);
				Test.TestTrue(Prefix + TEXT("while the second, lit 3 seconds in, still burns"), Lanterns[LitByPress[1]]->bLit);
			}

			const int32 Expected = ExpectedLight(Lanterns, Plan[Press], 150.0);
			LitByPress[Press] = LightAt(Scene, Plan[Press]);
			Test.TestEqual(Prefix + FString::Printf(TEXT("press %d lights the nearest unlit lantern within 150"), Press + 1), LitByPress[Press], Expected);
			Test.TestTrue(Prefix + FString::Printf(TEXT("press %d finds one"), Press + 1), LitByPress[Press] != INDEX_NONE);
		}

		Meadow->RestartRound();
		if (!Test.TestTrue(Prefix + TEXT("R does nothing mid-round: the same lanterns still stand"), Meadow->GetLanterns() == Lanterns)) return Result;

		while (Meadow->IsRunning() && Frame < 2400)
		{
			if (!TickAndCheck(Test, TestWorld, Scene, Prefix, Scored)) return Result;
			++Frame;
		}

		if (!Test.TestFalse(Prefix + TEXT("the round ends at dusk, 30 seconds in"), Meadow->IsRunning())) return Result;
		Test.TestEqual(Prefix + TEXT("every whole second was scored"), Meadow->GetScoredSeconds(), 30);
		Test.TestEqual(Prefix + TEXT("the score is the moths drawn, summed over the seconds"), Meadow->GetScore(), Scored);
		Test.TestTrue(Prefix + TEXT("some moths were drawn"), Scored > 0);
		Test.TestEqual(Prefix + TEXT("the label calls dusk"), LabelOf(Scene), FString::Printf(TEXT("DUSK  SCORE %d"), Scored));

		Scene.Keeper->SetActorLocation(Lanterns[5]->GetActorLocation());
		Meadow->PressLight();
		TestWorld.Tick(120);
		Test.TestEqual(Prefix + TEXT("after dusk E lights nothing"), CountLit(Lanterns), 0);
		Test.TestEqual(Prefix + TEXT("and the score stays"), Meadow->GetScore(), Scored);

		Result.Score = Scored;
		return Result;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_MothMeadow_TwoRoundsPlayAlike, "Dojo.P18.MothMeadow.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a scripted round, restarts with R, plays it again, and checks the second round is laid out, flown, and scored exactly like the first. */
bool FDojo_P18_MothMeadow_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoP18MeadowTest;

	FDojoTestWorld TestWorld;
	const FMeadowScene Scene = MakeMeadow(TestWorld);
	if (!TestNotNull(TEXT("The meadow spawned"), Scene.Meadow)) return false;

	const FRoundResult First = PlayRound(*this, TestWorld, Scene, TEXT("Round 1"));
	if (First.Score == INDEX_NONE) return false;

	Scene.Meadow->RestartRound();
	if (!TestTrue(TEXT("R starts a fresh round after dusk"), Scene.Meadow->IsRunning())) return false;
	TestEqual(TEXT("The fresh round has scored nothing"), Scene.Meadow->GetScore(), 0);

	const FRoundResult Second = PlayRound(*this, TestWorld, Scene, TEXT("Round 2"));
	if (Second.Score == INDEX_NONE) return false;

	bool bSameLanterns = First.LanternSpots.Num() == Second.LanternSpots.Num();
	for (int32 Index = 0; bSameLanterns && Index < First.LanternSpots.Num(); ++Index) bSameLanterns = First.LanternSpots[Index].Equals(Second.LanternSpots[Index], 0.01);

	bool bSameMoths = First.MothStarts.Num() == Second.MothStarts.Num();
	for (int32 Index = 0; bSameMoths && Index < First.MothStarts.Num(); ++Index) bSameMoths = First.MothStarts[Index].Equals(Second.MothStarts[Index], 0.01);

	TestTrue(TEXT("The second round's lanterns stand exactly where the first round's did"), bSameLanterns);
	TestTrue(TEXT("and its moths start exactly where the first round's did"), bSameMoths);
	TestEqual(TEXT("so the same play scores the same"), Second.Score, First.Score);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_MothMeadow_LightsTheNearestUnlit, "Dojo.P18.MothMeadow.LightsTheNearestUnlit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** E with no lantern in range does nothing, lights only the nearest unlit lantern in range, never relights a burning one, and a burnt out lantern can be lit again. */
bool FDojo_P18_MothMeadow_LightsTheNearestUnlit::RunTest(const FString& Parameters)
{
	using namespace DojoP18MeadowTest;

	FDojoTestWorld TestWorld;
	const FMeadowScene Scene = MakeMeadow(TestWorld);
	if (!TestNotNull(TEXT("The meadow spawned"), Scene.Meadow)) return false;

	const TArray<ADojoP18Lantern*> Lanterns = Scene.Meadow->GetLanterns();
	if (!TestEqual(TEXT("300 lanterns"), Lanterns.Num(), 300)) return false;

	Scene.Meadow->PressLight();
	TestEqual(TEXT("E with the keeper far outside the meadow lights nothing"), CountLit(Lanterns), 0);

	const FVector Far(5000.0, 5000.0, 0.0);
	TestEqual(TEXT("E with no lantern within 150 lights nothing"), LightAt(Scene, Far), int32(INDEX_NONE));

	const FVector OnTen = Lanterns[10]->GetActorLocation();
	TestEqual(TEXT("E standing on lantern 10 lights lantern 10"), LightAt(Scene, OnTen), 10);
	TestTrue(TEXT("and it burns"), Lanterns[10]->bLit);

	const int32 Next = ExpectedLight(Lanterns, OnTen, 150.0);
	TestEqual(TEXT("E again lights the next nearest unlit lantern in range, or nothing"), LightAt(Scene, OnTen), Next);
	TestEqual(TEXT("lantern 10 was not lit twice"), CountLit(Lanterns), Next == INDEX_NONE ? 1 : 2);

	TestWorld.Tick(8 * 60 + 30);
	TestFalse(TEXT("lantern 10 burnt out after 8 seconds"), Lanterns[10]->bLit);
	TestEqual(TEXT("and can be lit again"), LightAt(Scene, OnTen), 10);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_MothMeadow_CountsEachMothOnce, "Dojo.P18.MothMeadow.CountsEachMothOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lights two lanterns whose glow overlaps and checks a moth near both is drawn once, not twice. */
bool FDojo_P18_MothMeadow_CountsEachMothOnce::RunTest(const FString& Parameters)
{
	using namespace DojoP18MeadowTest;

	FDojoTestWorld TestWorld;
	const FMeadowScene Scene = MakeMeadow(TestWorld);
	if (!TestNotNull(TEXT("The meadow spawned"), Scene.Meadow)) return false;

	const TArray<ADojoP18Lantern*> Lanterns = Scene.Meadow->GetLanterns();
	int32 One = INDEX_NONE;
	int32 Other = INDEX_NONE;
	for (int32 First = 0; First < Lanterns.Num() && One == INDEX_NONE; ++First)
	{
		for (int32 Second = First + 1; Second < Lanterns.Num(); ++Second)
		{
			if (FVector::Dist2D(Lanterns[First]->GetActorLocation(), Lanterns[Second]->GetActorLocation()) < 120.0)
			{
				One = First;
				Other = Second;
				break;
			}
		}
	}

	if (!TestTrue(TEXT("Two lanterns stand within 120 of each other"), One != INDEX_NONE)) return false;

	TestEqual(TEXT("Standing on the first lights it"), LightAt(Scene, Lanterns[One]->GetActorLocation()), One);
	TestEqual(TEXT("Standing on the second lights it"), LightAt(Scene, Lanterns[Other]->GetActorLocation()), Other);

	const int32 Before = Scene.Meadow->GetScoredSeconds();
	for (int32 Frame = 0; Frame < 120 && Scene.Meadow->GetScoredSeconds() == Before; ++Frame) TestWorld.Tick(1);
	if (!TestTrue(TEXT("A whole second was scored"), Scene.Meadow->GetScoredSeconds() > Before)) return false;

	const int32 Union = ExpectedDrawn(Scene.Meadow, 250.0);
	const int32 Sum = DrawnSummedPerLantern(Scene.Meadow, 250.0);
	TestTrue(TEXT("Some moths are within 250 of both burning lanterns"), Sum > Union);
	TestEqual(TEXT("and each of them is drawn once, not once per lantern"), Scene.Meadow->GetLastDrawn(), Union);

	return true;
}

#endif
