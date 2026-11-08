#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Quests/p21-boss-ember-range/DojoP21RangeMaster.h"
#include "Quests/p21-launchers/DojoP21Bolt.h"
#include "Quests/p21-launchers/DojoP21EmberLauncher.h"
#include "Quests/p21-launchers/DojoP21FrostLauncher.h"
#include "Quests/p21-wave-spawner/DojoP21Critter.h"
#include "Quests/p21-wave-spawner/DojoP21Imp.h"
#include "Quests/p21-wave-spawner/DojoP21Slime.h"
#include "Quests/p21-wave-spawner/DojoP21Spawner.h"
#include "Support/DojoTestWorld.h"

namespace DojoP21RangeTest
{
	/** A spawn entry for this class at this level. */
	FDojoP21SpawnEntry MakeEntry(TSubclassOf<ADojoP21Critter> CritterClass, int32 Level)
	{
		FDojoP21SpawnEntry Result;
		Result.CritterClass = CritterClass;
		Result.Level = Level;
		return Result;
	}

	/** The standard wave: a level 2 slime (20 health), a level 2 imp (30), a level 3 slime (30), and a level 3 imp (45). */
	TArray<FDojoP21SpawnEntry> StandardWave()
	{
		return { MakeEntry(ADojoP21Slime::StaticClass(), 2), MakeEntry(ADojoP21Imp::StaticClass(), 2), MakeEntry(ADojoP21Slime::StaticClass(), 3), MakeEntry(ADojoP21Imp::StaticClass(), 3) };
	}

	/** Spawns the master last, at the origin, with the standard launchers and wave set before its BeginPlay. */
	ADojoP21RangeMaster* SpawnMaster(FDojoTestWorld& TestWorld, float RoundSeconds = 30.f)
	{
		ADojoP21RangeMaster* Master = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP21RangeMaster>(ADojoP21RangeMaster::StaticClass(), FTransform::Identity);
		Master->LauncherClasses = { ADojoP21EmberLauncher::StaticClass(), ADojoP21FrostLauncher::StaticClass() };
		Master->Wave = StandardWave();
		Master->RoundSeconds = RoundSeconds;
		Master->FinishSpawning(FTransform::Identity);
		return Master;
	}

	/** Presses the launcher with this number Count times. */
	void FireTimes(ADojoP21RangeMaster* Master, int32 Number, int32 Count)
	{
		for (int32 Shot = 0; Shot < Count; Shot++) Master->PressFire(Number);
	}

	/** How many living actors of this class exist in the world. */
	template <typename ActorType>
	int32 CountActors(UWorld* World)
	{
		int32 Count = 0;
		for (TActorIterator<ActorType> Iterator(World); Iterator; ++Iterator)
		{
			Count++;
		}
		return Count;
	}

	/** How many bolts of any kind exist in the world. */
	int32 CountBolts(UWorld* World)
	{
		return CountActors<ADojoP21Bolt>(World);
	}

	/** The label text now, or a note when the master has no label, so a missing label fails an assertion instead of stopping the engine. */
	FString LabelText(ADojoP21RangeMaster* Master)
	{
		if (Master == nullptr || Master->Label == nullptr) return FString(TEXT("(no label)"));

		return Master->Label->Text.ToString();
	}

	/** How many shots the launcher at this index has fired, or -1 when the master has no such launcher. */
	int32 ShotsFiredBy(ADojoP21RangeMaster* Master, int32 Index)
	{
		const TArray<ADojoP21Launcher*> Built = Master->GetLaunchers();
		if (!Built.IsValidIndex(Index) || Built[Index] == nullptr) return -1;

		return Built[Index]->ShotsFired;
	}

	/** Reports, and returns false, unless the master has a label and both launchers, so the reads that follow cannot stop the engine. */
	bool RangeIsBuilt(FAutomationTestBase& Test, ADojoP21RangeMaster* Master, const FString& When)
	{
		const UTextRenderComponent* LabelComponent = Master->Label;
		const bool bHasLabel = Test.TestNotNull(*FString::Printf(TEXT("%s: the master has a label"), *When), LabelComponent);
		const bool bHasLaunchers = Test.TestEqual(*FString::Printf(TEXT("%s: two launchers were built"), *When), Master->GetLaunchers().Num(), 2);

		return bHasLabel && bHasLaunchers;
	}

	/** Plays one full round from a fresh start and wins it with 8 ember and 6 frost bolts, checking every step; Round names the round in messages. */
	void PlayWinningRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, ADojoP21RangeMaster* Master, const FString& Round)
	{
		const auto Say = [&Round](const TCHAR* Text) { return FString::Printf(TEXT("%s: %s"), *Round, Text); };

		if (!RangeIsBuilt(Test, Master, Round)) return;

		Test.TestTrue(Say(TEXT("The round is running")), Master->IsRunning());
		Test.TestEqual(Say(TEXT("Four critters stand on the range")), Master->GetCritters().Num(), 4);
		Test.TestEqual(Say(TEXT("Nobody is defeated yet")), Master->GetDefeatedCount(), 0);
		Test.TestEqual(Say(TEXT("The first launcher has 8 shots")), Master->GetShotsLeft(0), 8);
		Test.TestEqual(Say(TEXT("The second launcher has 8 shots")), Master->GetShotsLeft(1), 8);
		Test.TestEqual(Say(TEXT("The label counts the critters and the shots")), LabelText(Master), FString(TEXT("Critters 4/4  Shots left 8 8")));

		const TArray<ADojoP21Launcher*> Built = Master->GetLaunchers();
		Test.TestTrue(Say(TEXT("The first launcher is an ember launcher")), Built[0]->GetClass() == ADojoP21EmberLauncher::StaticClass());
		Test.TestTrue(Say(TEXT("The second is a frost launcher")), Built[1]->GetClass() == ADojoP21FrostLauncher::StaticClass());
		Test.TestTrue(Say(TEXT("The first launcher stands at the master's spot")), Built[0]->GetActorLocation().Equals(FVector(0.f, 0.f, 0.f), 0.1f));
		Test.TestTrue(Say(TEXT("The second stands 100 units along the Y axis")), Built[1]->GetActorLocation().Equals(FVector(0.f, 100.f, 0.f), 0.1f));
		Test.TestTrue(Say(TEXT("Both face along the positive X axis")), Built[0]->GetActorForwardVector().Equals(FVector(1.f, 0.f, 0.f), 0.01f) && Built[1]->GetActorForwardVector().Equals(FVector(1.f, 0.f, 0.f), 0.01f));
		Test.TestEqual(Say(TEXT("Only this round's launchers exist")), CountActors<ADojoP21Launcher>(TestWorld.GetWorld()), 2);
		Test.TestEqual(Say(TEXT("Only this round's spawner exists")), CountActors<ADojoP21Spawner>(TestWorld.GetWorld()), 1);
		Test.TestEqual(Say(TEXT("Only this round's critters exist")), CountActors<ADojoP21Critter>(TestWorld.GetWorld()), 4);

		const TArray<ADojoP21Critter*> Row = Master->GetCritters();
		if (!Test.TestEqual(Say(TEXT("The row is four long")), Row.Num(), 4)) return;
		Test.TestTrue(Say(TEXT("The first critter is a slime 450 units out")), Row[0]->GetClass() == ADojoP21Slime::StaticClass() && FMath::IsNearlyEqual(Row[0]->GetActorLocation().X, 450.0, 0.1));
		Test.TestTrue(Say(TEXT("The second is an imp at 600")), Row[1]->GetClass() == ADojoP21Imp::StaticClass() && FMath::IsNearlyEqual(Row[1]->GetActorLocation().X, 600.0, 0.1));
		Test.TestTrue(Say(TEXT("The third is a slime at 750")), Row[2]->GetClass() == ADojoP21Slime::StaticClass() && FMath::IsNearlyEqual(Row[2]->GetActorLocation().X, 750.0, 0.1));
		Test.TestTrue(Say(TEXT("The fourth is an imp at 900")), Row[3]->GetClass() == ADojoP21Imp::StaticClass() && FMath::IsNearlyEqual(Row[3]->GetActorLocation().X, 900.0, 0.1));
		Test.TestEqual(Say(TEXT("The last critter, the level 3 imp, has 45 health")), Row[3]->Health, 45);

		TestWorld.Tick(60);

		Master->PressFire(1);
		Master->PressFire(2);
		Test.TestEqual(Say(TEXT("An ember and a frost bolt leave the nearest critter with 1 health")), Row[0]->Health, 1);
		Test.TestEqual(Say(TEXT("And the others untouched")), Row[1]->Health, 30);
		Test.TestEqual(Say(TEXT("It is not defeated yet")), Master->GetDefeatedCount(), 0);
		Test.TestEqual(Say(TEXT("Spent bolts leave nothing behind")), CountBolts(TestWorld.GetWorld()), 0);
		Master->PressFire(2);
		Test.TestEqual(Say(TEXT("One more frost bolt defeats it")), Master->GetDefeatedCount(), 1);
		Test.TestEqual(Say(TEXT("Three critters remain")), Master->GetCritters().Num(), 3);
		Test.TestEqual(Say(TEXT("The label counts them")), LabelText(Master), FString(TEXT("Critters 3/4  Shots left 7 6")));

		FireTimes(Master, 1, 2);
		Test.TestEqual(Say(TEXT("Two ember bolts leave the imp with 6 health")), Row[1]->Health, 6);
		Master->PressFire(2);
		Test.TestEqual(Say(TEXT("A frost bolt defeats it")), Master->GetDefeatedCount(), 2);

		FireTimes(Master, 1, 2);
		Master->PressFire(2);
		Test.TestEqual(Say(TEXT("The second slime falls the same way")), Master->GetDefeatedCount(), 3);
		Test.TestTrue(Say(TEXT("The round is still running with one critter left")), Master->IsRunning());

		FireTimes(Master, 1, 3);
		Test.TestEqual(Say(TEXT("Three ember bolts leave the last imp with 9 health")), Row[3]->Health, 9);
		Test.TestEqual(Say(TEXT("The first launcher has no shots left")), Master->GetShotsLeft(0), 0);
		Master->PressFire(2);
		Test.TestEqual(Say(TEXT("A frost bolt leaves it with 2")), Row[3]->Health, 2);
		Master->PressFire(2);

		Test.TestFalse(Say(TEXT("The last critter falls and the round ends")), Master->IsRunning());
		Test.TestEqual(Say(TEXT("All four are defeated")), Master->GetDefeatedCount(), 4);
		Test.TestTrue(Say(TEXT("The label shows the win")), LabelText(Master).StartsWith(TEXT("WIN")));
		Test.TestTrue(Say(TEXT("With the shots used")), LabelText(Master).Contains(TEXT("Shots used 14")));
		Test.TestTrue(Say(TEXT("And the time is about a second")), FMath::IsNearlyEqual(Master->GetWinSeconds(), 1.f, 0.2f));

		Master->PressFire(2);
		Test.TestEqual(Say(TEXT("Firing after the win does nothing")), ShotsFiredBy(Master, 1), 6);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_Range_TwoRounds, "Dojo.P21.Range.TwoRounds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two full rounds with the standard data: round 2, started with R, plays exactly like round 1. */
bool FDojo_P21_Range_TwoRounds::RunTest(const FString& Parameters)
{
	using namespace DojoP21RangeTest;

	FDojoTestWorld TestWorld;

	ADojoP21RangeMaster* Master = SpawnMaster(TestWorld);
	if (!TestNotNull(TEXT("Range master spawned"), Master)) return false;

	PlayWinningRound(*this, TestWorld, Master, TEXT("Round 1"));

	Master->RestartRound();
	PlayWinningRound(*this, TestWorld, Master, TEXT("Round 2"));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_Range_AmmoAndAim, "Dojo.P21.Range.AmmoAndAim", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Neither launcher alone wins, each launcher stops at 8 shots, a number with no launcher does nothing, and a shot hits only a critter ahead of the muzzle. */
bool FDojo_P21_Range_AmmoAndAim::RunTest(const FString& Parameters)
{
	using namespace DojoP21RangeTest;

	FDojoTestWorld TestWorld;

	ADojoP21RangeMaster* Master = SpawnMaster(TestWorld, 5.f);
	if (!TestNotNull(TEXT("Range master spawned"), Master)) return false;
	if (!RangeIsBuilt(*this, Master, TEXT("First round"))) return false;

	Master->PressFire(0);
	Master->PressFire(3);
	Master->PressFire(-1);
	TestEqual(TEXT("A number with no launcher fires nothing"), ShotsFiredBy(Master, 0) + ShotsFiredBy(Master, 1), 0);

	FireTimes(Master, 1, 9);
	TestEqual(TEXT("The ember launcher stops at 8 shots"), ShotsFiredBy(Master, 0), 8);
	TestEqual(TEXT("And has none left"), Master->GetShotsLeft(0), 0);
	TestEqual(TEXT("Eight ember bolts defeat three critters"), Master->GetDefeatedCount(), 3);
	TestTrue(TEXT("The round is not won"), Master->IsRunning());
	if (!TestEqual(TEXT("The last critter is still alive"), Master->GetCritters().Num(), 1)) return false;
	TestEqual(TEXT("And untouched"), Master->GetCritters()[0]->Health, 45);

	FireTimes(Master, 2, 6);
	if (!TestEqual(TEXT("The last critter survives six frost bolts"), Master->GetCritters().Num(), 1)) return false;
	TestEqual(TEXT("Six frost bolts leave it with 3 health"), Master->GetCritters()[0]->Health, 3);
	TestTrue(TEXT("The round is still running"), Master->IsRunning());
	Master->PressFire(2);
	TestFalse(TEXT("The seventh frost bolt wins the round"), Master->IsRunning());

	Master->RestartRound();
	if (!RangeIsBuilt(*this, Master, TEXT("Second round"))) return false;
	FireTimes(Master, 2, 9);
	TestEqual(TEXT("The frost launcher stops at 8 shots"), ShotsFiredBy(Master, 1), 8);
	TestEqual(TEXT("Eight frost bolts defeat only two critters"), Master->GetDefeatedCount(), 2);
	TestTrue(TEXT("So the frost launcher alone cannot win"), Master->IsRunning());

	TestWorld.Tick(330);
	TestFalse(TEXT("The round times out"), Master->IsRunning());
	Master->RestartRound();
	if (!TestEqual(TEXT("A fresh round has four critters"), Master->GetCritters().Num(), 4)) return false;
	Master->GetCritters()[0]->SetActorLocation(FVector(-500.f, 0.f, 0.f));
	Master->PressFire(1);
	TestEqual(TEXT("A critter behind the muzzle is not hit"), Master->GetCritters()[0]->Health, 20);
	TestEqual(TEXT("The next critter ahead takes the bolt"), Master->GetCritters()[1]->Health, 18);

	for (ADojoP21Critter* Alive : Master->GetCritters()) Alive->SetActorLocation(FVector(-500.f, 0.f, 0.f));
	Master->PressFire(1);
	TestEqual(TEXT("With nothing ahead the bolt is spent"), Master->GetShotsLeft(0), 6);
	TestEqual(TEXT("And nobody is hurt"), Master->GetDefeatedCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_Range_TimeUpAndRestart, "Dojo.P21.Range.TimeUpAndRestart", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A round that runs out of time shows TIME UP and ignores the launchers, R starts a clean round only after it ended, and the new round is not cut short by the old timer. */
bool FDojo_P21_Range_TimeUpAndRestart::RunTest(const FString& Parameters)
{
	using namespace DojoP21RangeTest;

	FDojoTestWorld TestWorld;

	ADojoP21RangeMaster* Master = SpawnMaster(TestWorld, 2.f);
	if (!TestNotNull(TEXT("Range master spawned"), Master)) return false;
	if (!RangeIsBuilt(*this, Master, TEXT("First round"))) return false;

	TestEqual(TEXT("A round lasts 30 seconds unless a designer changes it"), GetDefault<ADojoP21RangeMaster>()->RoundSeconds, 30.f);

	Master->PressFire(1);
	TestEqual(TEXT("One shot was fired"), ShotsFiredBy(Master, 0), 1);

	Master->RestartRound();
	TestEqual(TEXT("R does nothing while a round runs"), ShotsFiredBy(Master, 0), 1);

	TestWorld.Tick(150);
	TestFalse(TEXT("Two seconds without a win ends the round"), Master->IsRunning());
	TestEqual(TEXT("The label says so"), LabelText(Master), FString(TEXT("TIME UP")));

	Master->PressFire(1);
	TestEqual(TEXT("Firing after the round ended does nothing"), ShotsFiredBy(Master, 0), 1);

	Master->RestartRound();
	TestTrue(TEXT("R after the end starts a new round"), Master->IsRunning());
	TestEqual(TEXT("With fresh critters"), Master->GetCritters().Num(), 4);
	TestEqual(TEXT("And fresh launchers"), Master->GetShotsLeft(0), 8);
	TestEqual(TEXT("And a fresh label"), LabelText(Master), FString(TEXT("Critters 4/4  Shots left 8 8")));

	TestWorld.Tick(60);
	TestTrue(TEXT("The new round is not cut short by the old timer"), Master->IsRunning());
	TestWorld.Tick(120);
	TestFalse(TEXT("But it has its own two seconds"), Master->IsRunning());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_Range_OldTimerCannotEndTheNextRound, "Dojo.P21.Range.OldTimerCannotEndTheNextRound", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A round won early leaves nothing behind that can end the next one: the next round runs its own full length, past the moment the first round's time would have run out. */
bool FDojo_P21_Range_OldTimerCannotEndTheNextRound::RunTest(const FString& Parameters)
{
	using namespace DojoP21RangeTest;

	FDojoTestWorld TestWorld;

	ADojoP21RangeMaster* Master = SpawnMaster(TestWorld, 4.f);
	if (!TestNotNull(TEXT("Range master spawned"), Master)) return false;

	PlayWinningRound(*this, TestWorld, Master, TEXT("Round 1"));
	if (!TestFalse(TEXT("The first round was won"), Master->IsRunning())) return false;

	Master->RestartRound();
	if (!RangeIsBuilt(*this, Master, TEXT("Second round"))) return false;

	TestWorld.Tick(195);
	TestTrue(TEXT("The new round is still running after the first round's four seconds would have passed"), Master->IsRunning());
	TestWorld.Tick(60);
	TestFalse(TEXT("But it ends on its own four seconds"), Master->IsRunning());
	TestEqual(TEXT("With TIME UP on the label"), LabelText(Master), FString(TEXT("TIME UP")));

	return true;
}

#endif
