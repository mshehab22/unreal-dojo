#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Curves/CurveFloat.h"
#include "Quests/s5-boss-beetle-pit/DojoS5PitKeeper.h"
#include "Quests/s5-pool/DojoS5Beetle.h"
#include "Quests/s5-pool/DojoS5PoolComponent.h"
#include "Quests/s5-wave-banner/DojoS5WaveBanner.h"
#include "Quests/s5-wave-director/DojoS5WaveDirector.h"
#include "Quests/s5-wave-plan/DojoS5Hatch.h"
#include "Quests/s5-wave-plan/DojoS5WavePlan.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS5BeetlePitTest
{
	/** The hero in the middle of the pit and the keeper that runs it. */
	struct FPit
	{
		ADojoTestActor* Hero = nullptr;
		ADojoS5PitKeeper* Keeper = nullptr;
	};

	/** The boss's night: 3 beetles, a curve that doubles them by wave 5, one a second, 3 loose at most, 3 seconds of rest, five waves. */
	UDojoS5WavePlan* MakeNight()
	{
		UCurveFloat* Curve = NewObject<UCurveFloat>();
		Curve->FloatCurve.AddKey(1.f, 1.f);
		Curve->FloatCurve.AddKey(5.f, 2.f);

		UDojoS5WavePlan* Plan = NewObject<UDojoS5WavePlan>();
		Plan->BaseCount = 3;
		Plan->CountScale = Curve;
		Plan->SpawnInterval = 1.f;
		Plan->MaxAlive = 3;
		Plan->RestSeconds = 3.f;
		Plan->FinalWave = 5;
		return Plan;
	}

	/** Spawns the hero at the origin facing along X and a keeper around it, then begins play, which starts night 1. */
	FPit MakePit(FDojoTestWorld& TestWorld)
	{
		FPit Pit;
		Pit.Hero = TestWorld.SpawnActor<ADojoTestActor>();

		Pit.Keeper = TestWorld.GetWorld()->SpawnActorDeferred<ADojoS5PitKeeper>(ADojoS5PitKeeper::StaticClass(), FTransform::Identity);
		if (Pit.Keeper == nullptr)
		{
			return Pit;
		}

		Pit.Keeper->Hero = Pit.Hero;
		Pit.Keeper->Plan = MakeNight();
		Pit.Keeper->FinishSpawning(FTransform::Identity);

		return Pit;
	}

	/** Reports, and returns false, unless the pit has a hero, a keeper with a pool, a board, a director, and a banner with a display, so the reads that follow cannot stop the engine. */
	bool PitIsBuilt(FAutomationTestBase& Test, const FPit& Pit, const FString& When)
	{
		if (!Test.TestNotNull(*FString::Printf(TEXT("%s: the hero spawned"), *When), Pit.Hero)) return false;
		if (!Test.TestNotNull(*FString::Printf(TEXT("%s: the keeper spawned"), *When), Pit.Keeper)) return false;

		const UDojoS5PoolComponent* PoolComponent = Pit.Keeper->Pool;
		const UTextRenderComponent* BoardComponent = Pit.Keeper->Board;
		const ADojoS5WaveBanner* Banner = Pit.Keeper->GetBanner();
		const UTextRenderComponent* BannerDisplay = nullptr;
		if (Banner != nullptr)
		{
			BannerDisplay = Banner->Display;
		}

		const bool bHasPool = Test.TestNotNull(*FString::Printf(TEXT("%s: the keeper carries a pool"), *When), PoolComponent);
		const bool bHasBoard = Test.TestNotNull(*FString::Printf(TEXT("%s: the keeper has a board"), *When), BoardComponent);
		const bool bHasDirector = Test.TestNotNull(*FString::Printf(TEXT("%s: the keeper made a director"), *When), Pit.Keeper->GetDirector());
		const bool bHasBanner = Test.TestNotNull(*FString::Printf(TEXT("%s: the keeper made a banner with a display"), *When), BannerDisplay);

		return bHasPool && bHasBoard && bHasDirector && bHasBanner;
	}

	/** The board's text. */
	FString BoardOf(const FPit& Pit)
	{
		if (Pit.Keeper == nullptr || Pit.Keeper->Board == nullptr) return FString(TEXT("(the keeper has no board)"));
		return Pit.Keeper->Board->Text.ToString();
	}

	/** The banner's text. */
	FString BannerOf(const FPit& Pit)
	{
		const ADojoS5WaveBanner* Banner = Pit.Keeper != nullptr ? Pit.Keeper->GetBanner() : nullptr;
		if (Banner == nullptr || Banner->Display == nullptr) return FString(TEXT("(the keeper has no banner display)"));
		return Banner->Display->Text.ToString();
	}

	/** True when the hero is looking straight at the beetle. */
	bool IsFacing(const AActor* Hero, const AActor* Beetle)
	{
		const FVector ToBeetle = (Beetle->GetActorLocation() - Hero->GetActorLocation()).GetSafeNormal();
		return FVector::DotProduct(Hero->GetActorForwardVector(), ToBeetle) > 0.9f;
	}

	/** Turns to each loose beetle with E and swats it with Space, until none is loose. */
	void SwatEverythingLoose(const FPit& Pit)
	{
		for (int32 Guard = 0; Guard < 8; ++Guard)
		{
			const TArray<ADojoS5Beetle*> Loose = Pit.Keeper->Pool->GetAwakeBeetles();
			if (Loose.Num() == 0)
			{
				return;
			}

			for (int32 Turn = 0; Turn < 4 && !IsFacing(Pit.Hero, Loose[0]); ++Turn)
			{
				Pit.Keeper->PressTurn(true);
			}

			Pit.Keeper->PressSwat();
		}
	}

	/** Plays until the finale: swats whatever is loose, then lets a quarter second pass. */
	void PlayNight(FDojoTestWorld& TestWorld, const FPit& Pit)
	{
		for (int32 Step = 0; Step < 400 && Pit.Keeper->IsRunning(); ++Step)
		{
			SwatEverythingLoose(Pit);
			TestWorld.Tick(15);
		}
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_BeetlePit_TwoNights, "Dojo.S5.BeetlePit.TwoNights", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two whole nights and checks the swats, the finale, the reset, and that night 2 spawns no new beetle. */
bool FDojo_S5_BeetlePit_TwoNights::RunTest(const FString& Parameters)
{
	using namespace DojoS5BeetlePitTest;

	FDojoTestWorld TestWorld;
	FPit Pit = MakePit(TestWorld);
	if (!PitIsBuilt(*this, Pit, TEXT("Two nights"))) return false;

	for (int32 Night = 1; Night <= 2; ++Night)
	{
		const FString Label = FString::Printf(TEXT("Night %d: "), Night);

		TestTrue(Label + TEXT("the night is running"), Pit.Keeper->IsRunning());
		TestEqual(Label + TEXT("the board starts clean"), BoardOf(Pit), FString(TEXT("Swats 0\nGate shut")));
		TestEqual(Label + TEXT("the banner shows wave 1"), BannerOf(Pit), FString(TEXT("Wave 1: 3 beetles")));
		TestEqual(Label + TEXT("the hero faces the first hatch again"), Pit.Hero->GetActorForwardVector().X, 1.0, 0.01);
		TestEqual(Label + TEXT("a beetle is out at once"), Pit.Keeper->GetDirector()->GetAlive(), 1);

		PlayNight(TestWorld, Pit);

		TestFalse(Label + TEXT("the night ended"), Pit.Keeper->IsRunning());
		TestTrue(Label + TEXT("the director is done"), Pit.Keeper->GetDirector()->GetState() == EDojoS5DirectorState::EDS_Done);
		TestEqual(Label + TEXT("every beetle of five waves was swatted: 3, 4, 5, 5, 6"), Pit.Keeper->GetSwats(), 23);
		TestTrue(Label + TEXT("the night took time"), Pit.Keeper->GetFinishSeconds() > 20.f);
		TestEqual(Label + TEXT("the board shows the finale"), BoardOf(Pit), FString::Printf(TEXT("Swats 23\nGate open\nCLEARED in %.1f s"), Pit.Keeper->GetFinishSeconds()));
		TestEqual(Label + TEXT("the banner shows the last clear"), BannerOf(Pit), FString(TEXT("Wave 5 cleared")));
		TestTrue(Label + TEXT("the pit never held more beetles than could be loose at once"), Pit.Keeper->Pool->GetCreatedCount() <= 3);

		const int32 CreatedAfterNight = Pit.Keeper->Pool->GetCreatedCount();
		const FVector FacingAfterNight = Pit.Hero->GetActorForwardVector();

		Pit.Keeper->PressSwat();
		Pit.Keeper->PressTurn(true);
		TestWorld.Tick(300);
		TestEqual(Label + TEXT("keys do nothing after the finale"), Pit.Keeper->GetSwats(), 23);
		TestTrue(Label + TEXT("Q and E turn nothing after the finale"), Pit.Hero->GetActorForwardVector().Equals(FacingAfterNight, 0.001f));
		TestEqual(Label + TEXT("nothing comes out after the finale"), Pit.Keeper->Pool->GetAwakeCount(), 0);

		Pit.Keeper->RestartNight();
		TestEqual(Label + TEXT("the next night wakes beetles the pit already has"), Pit.Keeper->Pool->GetCreatedCount(), CreatedAfterNight);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_BeetlePit_GateAndRest, "Dojo.S5.BeetlePit.GateAndRest", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Clears wave 1 and checks that the gate opens for the 3 second rest and shuts when wave 2 begins. */
bool FDojo_S5_BeetlePit_GateAndRest::RunTest(const FString& Parameters)
{
	using namespace DojoS5BeetlePitTest;

	FDojoTestWorld TestWorld;
	FPit Pit = MakePit(TestWorld);
	if (!PitIsBuilt(*this, Pit, TEXT("The pit"))) return false;

	TestFalse(TEXT("The gate is shut while wave 1 runs"), Pit.Keeper->IsGateOpen());

	for (int32 Step = 0; Step < 40 && Pit.Keeper->GetDirector()->GetState() == EDojoS5DirectorState::EDS_Wave; ++Step)
	{
		SwatEverythingLoose(Pit);
		TestWorld.Tick(15);
	}

	TestTrue(TEXT("Wave 1 is cleared and the director rests"), Pit.Keeper->GetDirector()->GetState() == EDojoS5DirectorState::EDS_Rest);
	TestTrue(TEXT("The gate opens for the rest"), Pit.Keeper->IsGateOpen());
	TestEqual(TEXT("The board says so"), BoardOf(Pit), FString(TEXT("Swats 3\nGate open")));
	TestEqual(TEXT("The banner counts down to wave 2"), BannerOf(Pit), FString(TEXT("Rest: wave 2 in 3 s")));

	TestWorld.Tick(200);
	TestEqual(TEXT("Wave 2 began after the rest"), Pit.Keeper->GetDirector()->GetWave(), 2);
	TestFalse(TEXT("The gate shut again"), Pit.Keeper->IsGateOpen());
	TestEqual(TEXT("The banner shows wave 2"), BannerOf(Pit), FString(TEXT("Wave 2: 4 beetles")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_BeetlePit_SwatNeedsFacing, "Dojo.S5.BeetlePit.SwatNeedsFacing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks that the first beetle comes out of the hatch to the hero's right, that Space misses it until E turns the hero, and that R does nothing mid night. */
bool FDojo_S5_BeetlePit_SwatNeedsFacing::RunTest(const FString& Parameters)
{
	using namespace DojoS5BeetlePitTest;

	FDojoTestWorld TestWorld;
	FPit Pit = MakePit(TestWorld);
	if (!PitIsBuilt(*this, Pit, TEXT("The pit"))) return false;

	const TArray<ADojoS5Hatch*> Hatches = Pit.Keeper->GetHatches();
	if (!TestEqual(TEXT("Four hatches"), Hatches.Num(), 4)) return false;

	const TArray<ADojoS5Beetle*> Loose = Pit.Keeper->Pool->GetAwakeBeetles();
	if (!TestEqual(TEXT("One beetle out"), Loose.Num(), 1)) return false;
	TestTrue(TEXT("It skipped the hatch the hero faces and came out on the right"), Loose[0]->GetActorLocation().Equals(Hatches[1]->GetActorLocation(), 1.f));

	Pit.Keeper->PressSwat();
	TestEqual(TEXT("Space misses a beetle the hero is not facing"), Pit.Keeper->GetSwats(), 0);
	TestTrue(TEXT("It is still loose"), Loose[0]->IsAwake());

	Pit.Keeper->PressTurn(false);
	Pit.Keeper->PressSwat();
	TestEqual(TEXT("Turning left faces away from it"), Pit.Keeper->GetSwats(), 0);

	Pit.Keeper->PressTurn(true);
	Pit.Keeper->PressTurn(true);
	Pit.Keeper->PressSwat();
	TestEqual(TEXT("Turning right faces it, and Space swats it"), Pit.Keeper->GetSwats(), 1);
	TestFalse(TEXT("It went back to the pool"), Loose[0]->IsAwake());
	TestEqual(TEXT("The board counts the swat"), BoardOf(Pit), FString(TEXT("Swats 1\nGate shut")));

	Pit.Keeper->RestartNight();
	TestEqual(TEXT("R does nothing before the finale"), Pit.Keeper->GetSwats(), 1);
	TestEqual(TEXT("The night goes on at wave 1"), Pit.Keeper->GetDirector()->GetWave(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_BeetlePit_UnbindsWhenItLeaves, "Dojo.S5.BeetlePit.UnbindsWhenItLeaves", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Removes the keeper mid night and checks that nothing still listens to the director and that everything it spawned is gone. */
bool FDojo_S5_BeetlePit_UnbindsWhenItLeaves::RunTest(const FString& Parameters)
{
	using namespace DojoS5BeetlePitTest;

	FDojoTestWorld TestWorld;
	FPit Pit = MakePit(TestWorld);
	if (!PitIsBuilt(*this, Pit, TEXT("The pit"))) return false;

	ADojoS5WaveDirector* Director = Pit.Keeper->GetDirector();
	ADojoS5WaveBanner* Banner = Pit.Keeper->GetBanner();
	const TArray<ADojoS5Hatch*> Hatches = Pit.Keeper->GetHatches();
	const TArray<ADojoS5Beetle*> Loose = Pit.Keeper->Pool->GetAwakeBeetles();
	if (!TestNotNull(TEXT("Director spawned"), Director) || !TestNotNull(TEXT("Banner spawned"), Banner) || !TestEqual(TEXT("A beetle is out"), Loose.Num(), 1)) return false;

	Pit.Keeper->Destroy();

	TestFalse(TEXT("Nothing listens to wave starts"), Director->OnWaveStarted.IsBound());
	TestFalse(TEXT("Nothing listens to wave clears"), Director->OnWaveCleared.IsBound());
	TestFalse(TEXT("Nothing listens to rests"), Director->OnRestStarted.IsBound());
	TestTrue(TEXT("The director is gone"), Director->IsActorBeingDestroyed());
	TestTrue(TEXT("The banner is gone"), Banner->IsActorBeingDestroyed());
	TestTrue(TEXT("The beetles are gone with the pool"), Loose[0]->IsActorBeingDestroyed());

	for (ADojoS5Hatch* Hatch : Hatches)
	{
		TestTrue(TEXT("Each hatch is gone"), Hatch->IsActorBeingDestroyed());
	}

	TestWorld.Tick(120);

	return true;
}

#endif
