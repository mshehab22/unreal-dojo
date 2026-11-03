#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "EngineUtils.h"
#include "Quests/m2-bumper/DojoM2Wall.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-scale-plate/DojoM3Plate.h"
#include "Quests/m4-boss-fuse-yard/DojoM4FuseYard.h"
#include "Quests/m4-chain/DojoM4Chain.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"
#include "Quests/m4-scatter/DojoM4Scatter.h"
#include "Support/DojoTestWorld.h"

namespace DojoM4FuseYardTest
{
	/** A runner and the yard it sets off. */
	struct FYardScene
	{
		ADojoM3Runner* Runner = nullptr;
		ADojoM4FuseYard* Yard = nullptr;
	};

	/** Builds a yard around a runner, wired the way a designer wires it in Details; the first round is laid out at BeginPlay. */
	FYardScene MakeYard(FDojoTestWorld& TestWorld)
	{
		FYardScene Scene;
		Scene.Runner = TestWorld.GetWorld()->SpawnActor<ADojoM3Runner>(FVector(-3000.0, 0.0, 0.0), FRotator::ZeroRotator);
		Scene.Yard = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM4FuseYard>(ADojoM4FuseYard::StaticClass(), FTransform::Identity);
		Scene.Yard->Runner = Scene.Runner;
		Scene.Yard->FinishSpawning(FTransform::Identity);
		return Scene;
	}

	/** The board's text. */
	FString BoardOf(const FYardScene& Scene)
	{
		return Scene.Yard->Board->Text.ToString();
	}

	/** How many live actors of a class the world holds. */
	template<typename TActor>
	int32 CountActors(FDojoTestWorld& TestWorld)
	{
		int32 Count = 0;
		for (TActorIterator<TActor> It(TestWorld.GetWorld()); It; ++It) ++Count;
		return Count;
	}

	/** The bombs a chain started at the bomb nearest Origin would reach: every bomb linked to it by steps of at most Reach. */
	TSet<int32> ExpectedChain(const TArray<FVector>& Bombs, const FVector& Origin, double Reach)
	{
		TSet<int32> Reached;
		if (Bombs.Num() == 0) return Reached;

		int32 First = 0;
		for (int32 Index = 1; Index < Bombs.Num(); ++Index)
		{
			if (FVector::Dist(Bombs[Index], Origin) < FVector::Dist(Bombs[First], Origin)) First = Index;
		}

		TArray<int32> Pending = { First };
		Reached.Add(First);
		while (Pending.Num() > 0)
		{
			const int32 Current = Pending.Pop();
			for (int32 Other = 0; Other < Bombs.Num(); ++Other)
			{
				if (!Reached.Contains(Other) && FVector::Dist(Bombs[Current], Bombs[Other]) <= Reach)
				{
					Reached.Add(Other);
					Pending.Add(Other);
				}
			}
		}

		return Reached;
	}

	/** Where each of the yard's bombs stands. */
	TArray<FVector> BombSpots(const FYardScene& Scene)
	{
		TArray<FVector> Spots;
		for (ADojoM4Bomb* Bomb : Scene.Yard->GetBombs()) Spots.Add(Bomb->GetActorLocation());
		return Spots;
	}

	/** Plays one round from the armed yard to the end of the chain; returns the bomb spots, or an empty array if the round broke. */
	TArray<FVector> PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FYardScene& Scene, const FString& Round)
	{
		const FString Prefix = Round + TEXT(": ");
		ADojoM4FuseYard* Yard = Scene.Yard;
		const TArray<FVector> None;

		const int32 Placed = Yard->GetPlaced();
		if (!Test.TestTrue(Prefix + TEXT("the yard lays out bombs"), Placed > 0 && Placed <= 14)) return None;
		Test.TestFalse(Prefix + TEXT("the yard starts armed, not burning"), Yard->IsBurning() || Yard->IsOver());
		Test.TestEqual(Prefix + TEXT("the board shows the armed yard"), BoardOf(Scene), FString::Printf(TEXT("ARMED %d bombs"), Placed));
		Test.TestEqual(Prefix + TEXT("every placed bomb is in play"), CountActors<ADojoM4Bomb>(TestWorld), Placed);
		Test.TestEqual(Prefix + TEXT("two pillars stand in the yard"), CountActors<ADojoM2Wall>(TestWorld), 2);
		Test.TestEqual(Prefix + TEXT("one plate"), CountActors<ADojoM3Plate>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("one chain"), CountActors<ADojoM4Chain>(TestWorld), 1);
		Test.TestTrue(Prefix + TEXT("the runner starts at the entrance"), Scene.Runner->GetActorLocation().Equals(FVector::ZeroVector, 0.1));
		if (!Yard->GetPlate()) return None;

		const TArray<FVector> Spots = BombSpots(Scene);
		bool bClearOfPillars = true;
		for (const FVector& Spot : Spots)
		{
			if (FMath::Abs(Spot.Y) < 49.0 && (FMath::Abs(Spot.X - 900.0) < 329.0 || FMath::Abs(Spot.X - 1500.0) < 329.0)) bClearOfPillars = false;
		}

		Test.TestTrue(Prefix + TEXT("no bomb was placed inside a pillar"), bClearOfPillars);
		const TSet<int32> Expected = ExpectedChain(Spots, Yard->GetPlate()->GetActorLocation(), 350.0);

		TestWorld.Tick(60);
		Test.TestEqual(Prefix + TEXT("nothing burns before the plate is stepped on"), Yard->GetBlown(), 0);
		Test.TestFalse(Prefix + TEXT("R does nothing before the chain has run"), Yard->PressRestart());

		Scene.Runner->SetActorLocation(FVector(200.0, 0.0, 0.0));
		if (!Test.TestTrue(Prefix + TEXT("a step on the plate sets the yard burning"), Yard->IsBurning())) return None;
		Test.TestEqual(Prefix + TEXT("the board says so"), BoardOf(Scene), FString(TEXT("BURNING 0 blown")));

		Scene.Runner->SetActorLocation(FVector(-500.0, 0.0, 0.0));
		Scene.Runner->SetActorLocation(FVector(200.0, 0.0, 0.0));
		Test.TestFalse(Prefix + TEXT("R does nothing while the chain burns"), Yard->PressRestart());

		bool bEnded = false;
		for (int32 Frame = 0; Frame < 900 && !bEnded; ++Frame)
		{
			TestWorld.Tick(1);
			bEnded = Yard->IsOver();
		}

		if (!Test.TestTrue(Prefix + TEXT("the chain ends within 15 seconds"), bEnded)) return None;
		Test.TestEqual(Prefix + TEXT("exactly the bombs linked to the first by steps of at most 350 blew"), Yard->GetBlown(), Expected.Num());
		Test.TestEqual(Prefix + TEXT("the rest are still in play"), CountActors<ADojoM4Bomb>(TestWorld), Placed - Expected.Num());
		Test.TestEqual(Prefix + TEXT("the board calls the chain"), BoardOf(Scene), FString::Printf(TEXT("CHAIN %d of %d"), Expected.Num(), Placed));

		bool bNoneBurning = true;
		for (ADojoM4Bomb* Bomb : Yard->GetBombs())
		{
			if (Bomb->IsLit()) bNoneBurning = false;
		}

		Test.TestTrue(Prefix + TEXT("no bomb left in play is burning"), bNoneBurning);

		Scene.Runner->SetActorLocation(FVector(-500.0, 0.0, 0.0));
		Scene.Runner->SetActorLocation(FVector(200.0, 0.0, 0.0));
		TestWorld.Tick(120);
		Test.TestEqual(Prefix + TEXT("a step on the plate after the end lights nothing"), Yard->GetBlown(), Expected.Num());

		return Spots;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_FuseYard_TwoRoundsPlayAlike, "Dojo.M4.FuseYard.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a whole round, restarts with R, and checks the second yard is laid out and burns exactly like the first. */
bool FDojo_M4_FuseYard_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoM4FuseYardTest;

	FDojoTestWorld TestWorld;
	const FYardScene Scene = MakeYard(TestWorld);
	if (!TestNotNull(TEXT("The yard spawned"), Scene.Yard)) return false;

	const TArray<FVector> First = PlayRound(*this, TestWorld, Scene, TEXT("Round 1"));
	if (First.Num() == 0) return false;
	const int32 FirstBlown = Scene.Yard->GetBlown();

	if (!TestTrue(TEXT("R lays out a fresh yard after the chain"), Scene.Yard->PressRestart())) return false;
	TestEqual(TEXT("The fresh yard has blown nothing"), Scene.Yard->GetBlown(), 0);

	const TArray<FVector> Second = PlayRound(*this, TestWorld, Scene, TEXT("Round 2"));
	if (Second.Num() == 0) return false;

	bool bSameLayout = First.Num() == Second.Num();
	for (int32 Index = 0; bSameLayout && Index < First.Num(); ++Index) bSameLayout = First[Index].Equals(Second[Index], 0.01);

	TestTrue(TEXT("The second yard is laid out exactly like the first"), bSameLayout);
	TestEqual(TEXT("and its chain blew the same number of bombs"), Scene.Yard->GetBlown(), FirstBlown);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_FuseYard_OnlyTheRunnerSetsItOff, "Dojo.M4.FuseYard.OnlyTheRunnerSetsItOff", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts something other than the runner on the plate and checks the yard stays armed, then lets the runner light it. */
bool FDojo_M4_FuseYard_OnlyTheRunnerSetsItOff::RunTest(const FString& Parameters)
{
	using namespace DojoM4FuseYardTest;

	FDojoTestWorld TestWorld;
	const FYardScene Scene = MakeYard(TestWorld);
	if (!TestNotNull(TEXT("The yard spawned"), Scene.Yard) || !Scene.Yard->GetPlate()) return false;

	ADojoM3Runner* Stranger = TestWorld.GetWorld()->SpawnActor<ADojoM3Runner>(FVector(-2000.0, 0.0, 0.0), FRotator::ZeroRotator);
	if (!TestNotNull(TEXT("A second runner spawned"), Stranger)) return false;

	Stranger->SetActorLocation(FVector(200.0, 0.0, 0.0));
	TestTrue(TEXT("Another runner presses the plate"), Scene.Yard->GetPlate()->IsPressed());
	TestFalse(TEXT("but only the yard's runner sets it off"), Scene.Yard->IsBurning());

	Scene.Runner->SetActorLocation(FVector(200.0, 60.0, 0.0));
	TestTrue(TEXT("The yard's runner sets it off"), Scene.Yard->IsBurning());

	int32 Lit = 0;
	for (ADojoM4Bomb* Bomb : Scene.Yard->GetBombs())
	{
		if (Bomb->IsLit()) Lit++;
	}

	TestEqual(TEXT("by lighting one bomb"), Lit, 1);

	return true;
}

#endif
