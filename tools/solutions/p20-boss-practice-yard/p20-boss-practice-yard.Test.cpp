#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p20-boss-practice-yard/DojoP20PracticeYard.h"
#include "Quests/p20-mover-rules/DojoP20Mover.h"
#include "Quests/p20-mover-rules/DojoP20OrbitRule.h"
#include "Quests/p20-mover-rules/DojoP20StandRule.h"
#include "Quests/p20-target-rules/DojoP20FarthestRule.h"
#include "Quests/p20-target-rules/DojoP20Launcher.h"
#include "Quests/p20-target-rules/DojoP20NearestRule.h"
#include "Quests/p20-target-rules/DojoP20WeakestRule.h"
#include "Support/DojoTestWorld.h"

namespace DojoP20YardTest
{
	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** One letter for each shot in the log, the first letter of the dummy's name, or a dash for a shot at nothing. */
	FString LogText(const TArray<FName>& ShotLog)
	{
		FString Text;
		for (const FName& Target : ShotLog) Text += Target == NAME_None ? FString(TEXT("-")) : Target.ToString().Left(1);
		return Text;
	}

	/** The name of the rule class now in the launcher, or None. */
	FString RuleName(const ADojoP20PracticeYard* Yard)
	{
		const ADojoP20Launcher* Launcher = Yard->GetLauncher();
		return Launcher && IsValid(Launcher->Rule) ? Launcher->Rule->GetClass()->GetName() : FString(TEXT("None"));
	}

	/** The text on the yard's label, or a note that the yard has no label, so a missing label fails a check and does not stop the engine. */
	FString LabelText(const ADojoP20PracticeYard* Yard)
	{
		const UTextRenderComponent* LabelComponent = Yard->Label;
		return LabelComponent ? LabelComponent->Text.ToString() : FString(TEXT("(the yard has no label)"));
	}

	/** Anvil stands 100 out with 30 health, Barrel stands 480 out with 50, and Crate circles a point 500 out from 450 with 40. */
	void SetUpDummies(ADojoP20PracticeYard& Yard)
	{
		FDojoP20DummyPlan Anvil;
		Anvil.DummyName = TEXT("Anvil");
		Anvil.StartLocation = FVector(100.f, 0.f, 0.f);
		Anvil.StartHealth = 30;
		Anvil.MoveRuleClass = UDojoP20StandRule::StaticClass();

		FDojoP20DummyPlan Barrel;
		Barrel.DummyName = TEXT("Barrel");
		Barrel.StartLocation = FVector(480.f, 0.f, 0.f);
		Barrel.StartHealth = 50;
		Barrel.MoveRuleClass = UDojoP20StandRule::StaticClass();

		FDojoP20DummyPlan Crate;
		Crate.DummyName = TEXT("Crate");
		Crate.StartLocation = FVector(450.f, 0.f, 0.f);
		Crate.StartHealth = 40;
		Crate.MoveRuleClass = UDojoP20OrbitRule::StaticClass();

		Yard.Dummies = { Anvil, Barrel, Crate };
	}

	/** Spawns a yard with the three dummies and the given rule classes, with Tune run on it before its BeginPlay starts round 1. */
	ADojoP20PracticeYard* SpawnYard(FDojoTestWorld& TestWorld, const TArray<TSubclassOf<UDojoP20TargetRule>>& Rules, TFunctionRef<void(ADojoP20PracticeYard&)> Tune)
	{
		ADojoP20PracticeYard* Yard = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP20PracticeYard>(ADojoP20PracticeYard::StaticClass(), FTransform::Identity);
		if (Yard)
		{
			SetUpDummies(*Yard);
			Yard->RuleClasses = Rules;
			Tune(*Yard);
			Yard->FinishSpawning(FTransform::Identity);
		}
		return Yard;
	}

	/** Plays one full 29 second round with a single rule class from the start and returns the shot log. */
	FString PlayRoundWith(TSubclassOf<UDojoP20TargetRule> RuleClass, int32& OutHits, FString& OutResult)
	{
		FDojoTestWorld TestWorld;
		ADojoP20PracticeYard* Yard = SpawnYard(TestWorld, { RuleClass }, [](ADojoP20PracticeYard&) {});
		if (!Yard) return FString(TEXT("no yard"));

		TickUntil(TestWorld, 29.5f);
		OutHits = Yard->GetHits();
		OutResult = Yard->GetResult();
		return LogText(Yard->GetShotLog());
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_PracticeYard_TwoRoundsSwapRulesLive, "Dojo.P20.PracticeYard.TwoRoundsSwapRulesLive", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two 29 second rounds, swapping the targeting rule in the middle of the first and the second; the shots after each swap follow the new rule. */
bool FDojo_P20_PracticeYard_TwoRoundsSwapRulesLive::RunTest(const FString& Parameters)
{
	using namespace DojoP20YardTest;

	FDojoTestWorld TestWorld;

	ADojoP20PracticeYard* Yard = SpawnYard(TestWorld, { UDojoP20NearestRule::StaticClass(), UDojoP20WeakestRule::StaticClass(), UDojoP20FarthestRule::StaticClass() }, [](ADojoP20PracticeYard&) {});
	if (!TestNotNull(TEXT("Yard spawned"), Yard)) return false;
	if (!TestNotNull(TEXT("The yard made its launcher"), Yard->GetLauncher())) return false;

	TestTrue(TEXT("Round 1 is running"), Yard->IsRunning());
	TestEqual(TEXT("It is round 1"), Yard->GetRoundNumber(), 1);
	TestEqual(TEXT("The first rule class is in the launcher"), RuleName(Yard), FString(TEXT("DojoP20NearestRule")));
	TestEqual(TEXT("Three dummies are standing"), Yard->GetStandingCount(), 3);
	TestEqual(TEXT("The label shows the round, the rule, the hits and the dummies standing"), LabelText(Yard), FString(TEXT("Round 1  DojoP20NearestRule  Hits 0  Standing 3")));

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 1.f);
	ADojoP20Mover* Crate = Yard->GetMover(2);
	if (!TestNotNull(TEXT("The crate has a mover"), Crate)) return false;
	TestTrue(TEXT("Two steps of the orbit have turned the crate a quarter of the way round its centre"), FMath::IsNearlyEqual(Crate->GetActorLocation().X, 500.f, 0.5f) && FMath::IsNearlyEqual(FMath::Abs(Crate->GetActorLocation().Y), 50.f, 0.5f));
	ADojoP20Mover* Anvil = Yard->GetMover(0);
	if (!TestNotNull(TEXT("The anvil has a mover"), Anvil)) return false;
	TestTrue(TEXT("The anvil has not moved"), Anvil->GetActorLocation().Equals(FVector(100.f, 0.f, 0.f), 0.01f));

	TickUntil(TestWorld, Start + 6.5f);
	TestEqual(TEXT("The nearest rule shot the anvil three times"), LogText(Yard->GetShotLog()), FString(TEXT("AAA")));
	TestEqual(TEXT("Three hits and the anvil is down"), Yard->GetHits(), 3);
	TestEqual(TEXT("Two dummies are standing"), Yard->GetStandingCount(), 2);

	TickUntil(TestWorld, Start + 7.f);
	Yard->PressCycleRule();
	TestEqual(TEXT("T put the weakest rule in the launcher"), RuleName(Yard), FString(TEXT("DojoP20WeakestRule")));

	TickUntil(TestWorld, Start + 14.1f);
	const FVector CrateWhenDown = Crate->GetActorLocation();
	TickUntil(TestWorld, Start + 15.1f);
	TestTrue(TEXT("The crate went down at 14 seconds, and a dummy that is down is not stepped, so it has not moved since"), Crate->GetActorLocation().Equals(CrateWhenDown, 0.01f));

	TickUntil(TestWorld, Start + 29.5f);
	TestFalse(TEXT("The round is over at 29 seconds"), Yard->IsRunning());
	TestEqual(TEXT("After the swap the weakest crate and then the barrel took the shots"), LogText(Yard->GetShotLog()), FString(TEXT("AAACCCCBBBBB--")));
	TestEqual(TEXT("Twelve shots hit"), Yard->GetHits(), 12);
	TestEqual(TEXT("No dummy is standing"), Yard->GetStandingCount(), 0);
	TestEqual(TEXT("So the yard is cleared"), Yard->GetResult(), FString(TEXT("CLEARED")));
	TestEqual(TEXT("The label shows the rule in use and the result"), LabelText(Yard), FString(TEXT("Round 1  DojoP20WeakestRule  Hits 12  Standing 0  CLEARED")));

	Yard->PressCycleRule();
	TestEqual(TEXT("T works between rounds too and picks the farthest rule"), RuleName(Yard), FString(TEXT("DojoP20FarthestRule")));

	TickUntil(TestWorld, Start + 31.f);
	Yard->PressNextRound();
	TestTrue(TEXT("Round 2 is running"), Yard->IsRunning());
	TestEqual(TEXT("It is round 2"), Yard->GetRoundNumber(), 2);
	TestEqual(TEXT("The hits start again"), Yard->GetHits(), 0);
	TestEqual(TEXT("The log starts again"), Yard->GetShotLog().Num(), 0);
	TestTrue(TEXT("And the result is empty"), Yard->GetResult().IsEmpty());
	TestEqual(TEXT("Every dummy is back on its feet"), Yard->GetStandingCount(), 3);
	ADojoP20Mover* RestartedCrate = Yard->GetMover(2);
	if (!TestNotNull(TEXT("The crate still has a mover in round 2"), RestartedCrate)) return false;
	TestTrue(TEXT("The crate is back at its start"), RestartedCrate->GetActorLocation().Equals(FVector(450.f, 0.f, 0.f), 0.01f));

	const float SecondStart = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, SecondStart + 3.f);
	Yard->PressNextRound();
	TestEqual(TEXT("R does nothing while a round is running"), Yard->GetRoundNumber(), 2);

	TickUntil(TestWorld, SecondStart + 5.f);
	Yard->PressCycleRule();
	TestEqual(TEXT("T after the farthest rule goes round to the nearest rule"), RuleName(Yard), FString(TEXT("DojoP20NearestRule")));

	TickUntil(TestWorld, SecondStart + 29.5f);
	TestFalse(TEXT("Round 2 is over"), Yard->IsRunning());
	TestEqual(TEXT("The farthest rule took the first two shots and the nearest rule the rest"), LogText(Yard->GetShotLog()), FString(TEXT("CBAAACBCBCBB--")));
	TestEqual(TEXT("Twelve shots hit again"), Yard->GetHits(), 12);
	TestEqual(TEXT("The yard is cleared again"), Yard->GetResult(), FString(TEXT("CLEARED")));
	TestEqual(TEXT("The label shows round 2 and its result"), LabelText(Yard), FString(TEXT("Round 2  DojoP20NearestRule  Hits 12  Standing 0  CLEARED")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_PracticeYard_EachRuleFromTheStart, "Dojo.P20.PracticeYard.EachRuleFromTheStart", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With one rule class for the whole round, each rule gives its own shot log over the same three dummies. */
bool FDojo_P20_PracticeYard_EachRuleFromTheStart::RunTest(const FString& Parameters)
{
	using namespace DojoP20YardTest;

	int32 Hits = 0;
	FString Result;

	TestEqual(TEXT("Nearest: the anvil, then the crate and the barrel in turn as the crate circles, then the barrel"), PlayRoundWith(UDojoP20NearestRule::StaticClass(), Hits, Result), FString(TEXT("AAACBCBCBCBB--")));
	TestEqual(TEXT("Nearest hits"), Hits, 12);
	TestEqual(TEXT("Nearest result"), Result, FString(TEXT("CLEARED")));

	TestEqual(TEXT("Weakest: the anvil, then the crate, then the barrel"), PlayRoundWith(UDojoP20WeakestRule::StaticClass(), Hits, Result), FString(TEXT("AAACCCCBBBBB--")));
	TestEqual(TEXT("Weakest hits"), Hits, 12);
	TestEqual(TEXT("Weakest result"), Result, FString(TEXT("CLEARED")));

	TestEqual(TEXT("Farthest: the crate and the barrel in turn, the barrel, then the anvil"), PlayRoundWith(UDojoP20FarthestRule::StaticClass(), Hits, Result), FString(TEXT("CBCBCBCBBAAA--")));
	TestEqual(TEXT("Farthest hits"), Hits, 12);
	TestEqual(TEXT("Farthest result"), Result, FString(TEXT("CLEARED")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_PracticeYard_ShortRoundEscapes, "Dojo.P20.PracticeYard.ShortRoundEscapes", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A 15 second round gets seven shots in and leaves two dummies standing, so the result is ESCAPED. */
bool FDojo_P20_PracticeYard_ShortRoundEscapes::RunTest(const FString& Parameters)
{
	using namespace DojoP20YardTest;

	FDojoTestWorld TestWorld;

	ADojoP20PracticeYard* Yard = SpawnYard(TestWorld, { UDojoP20NearestRule::StaticClass() }, [](ADojoP20PracticeYard& Tuned)
	{
		Tuned.RoundSeconds = 15.f;
	});
	if (!TestNotNull(TEXT("Yard spawned"), Yard)) return false;

	TickUntil(TestWorld, 15.5f);

	TestFalse(TEXT("The round is over"), Yard->IsRunning());
	TestEqual(TEXT("Seven shots were fired"), LogText(Yard->GetShotLog()), FString(TEXT("AAACBCB")));
	TestEqual(TEXT("All seven hit"), Yard->GetHits(), 7);
	TestEqual(TEXT("The barrel and the crate are still standing"), Yard->GetStandingCount(), 2);
	TestEqual(TEXT("So the dummies escaped"), Yard->GetResult(), FString(TEXT("ESCAPED")));
	TestEqual(TEXT("The label shows the result"), LabelText(Yard), FString(TEXT("Round 1  DojoP20NearestRule  Hits 7  Standing 2  ESCAPED")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_PracticeYard_NoRuleClassesShootsNothing, "Dojo.P20.PracticeYard.NoRuleClassesShootsNothing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With no rule class in the list the launcher has no rule: every shot is at nothing, and T does nothing. */
bool FDojo_P20_PracticeYard_NoRuleClassesShootsNothing::RunTest(const FString& Parameters)
{
	using namespace DojoP20YardTest;

	FDojoTestWorld TestWorld;

	ADojoP20PracticeYard* Yard = SpawnYard(TestWorld, {}, [](ADojoP20PracticeYard&) {});
	if (!TestNotNull(TEXT("Yard spawned"), Yard)) return false;
	if (!TestNotNull(TEXT("The yard made its launcher"), Yard->GetLauncher())) return false;

	TestTrue(TEXT("The launcher has no rule"), Yard->GetLauncher()->Rule == nullptr);
	Yard->PressCycleRule();
	TestTrue(TEXT("T leaves it without a rule"), Yard->GetLauncher()->Rule == nullptr);

	TickUntil(TestWorld, 29.5f);

	TestEqual(TEXT("All fourteen shots were at nothing"), LogText(Yard->GetShotLog()), FString(TEXT("--------------")));
	TestEqual(TEXT("No hits"), Yard->GetHits(), 0);
	TestEqual(TEXT("All three dummies are still standing"), Yard->GetStandingCount(), 3);
	TestEqual(TEXT("So the dummies escaped"), Yard->GetResult(), FString(TEXT("ESCAPED")));
	TestEqual(TEXT("The label names no rule"), LabelText(Yard), FString(TEXT("Round 1  None  Hits 0  Standing 3  ESCAPED")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_PracticeYard_EachSwapMakesANewRule, "Dojo.P20.PracticeYard.EachSwapMakesANewRule", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Every T replaces the launcher's rule with a new object, even when the list holds the same class twice in a row. */
bool FDojo_P20_PracticeYard_EachSwapMakesANewRule::RunTest(const FString& Parameters)
{
	using namespace DojoP20YardTest;

	FDojoTestWorld TestWorld;

	ADojoP20PracticeYard* Yard = SpawnYard(TestWorld, { UDojoP20NearestRule::StaticClass(), UDojoP20NearestRule::StaticClass(), UDojoP20WeakestRule::StaticClass() }, [](ADojoP20PracticeYard&) {});
	if (!TestNotNull(TEXT("Yard spawned"), Yard)) return false;
	if (!TestNotNull(TEXT("The yard made its launcher"), Yard->GetLauncher())) return false;

	const UDojoP20TargetRule* First = Yard->GetLauncher()->Rule;
	if (!TestNotNull(TEXT("The launcher starts with a rule"), First)) return false;

	Yard->PressCycleRule();
	const UDojoP20TargetRule* Second = Yard->GetLauncher()->Rule;
	TestNotNull(TEXT("The launcher has a rule after the first T"), Second);
	TestTrue(TEXT("It is a new object, though the class is the same"), Second != First);
	TestEqual(TEXT("Of the same class"), RuleName(Yard), FString(TEXT("DojoP20NearestRule")));

	Yard->PressCycleRule();
	TestEqual(TEXT("The third entry is the weakest rule"), RuleName(Yard), FString(TEXT("DojoP20WeakestRule")));

	Yard->PressCycleRule();
	TestEqual(TEXT("The list goes round to the start"), RuleName(Yard), FString(TEXT("DojoP20NearestRule")));
	TestTrue(TEXT("With another new object"), Yard->GetLauncher()->Rule != Second);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_PracticeYard_ShotIntervalIsTunable, "Dojo.P20.PracticeYard.ShotIntervalIsTunable", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With FireInterval set to 3 seconds and a 14 second round, the first shot comes after three seconds and four shots are fired, not the six a 2 second interval would give. */
bool FDojo_P20_PracticeYard_ShotIntervalIsTunable::RunTest(const FString& Parameters)
{
	using namespace DojoP20YardTest;

	FDojoTestWorld TestWorld;

	ADojoP20PracticeYard* Yard = SpawnYard(TestWorld, { UDojoP20WeakestRule::StaticClass() }, [](ADojoP20PracticeYard& Tuned)
	{
		Tuned.RoundSeconds = 14.f;
		Tuned.FireInterval = 3.f;
	});
	if (!TestNotNull(TEXT("Yard spawned"), Yard)) return false;

	TickUntil(TestWorld, 2.5f);
	TestEqual(TEXT("No shot has been fired before the first interval is up"), Yard->GetShotLog().Num(), 0);

	TickUntil(TestWorld, 3.5f);
	TestEqual(TEXT("The first shot comes after one interval of three seconds"), LogText(Yard->GetShotLog()), FString(TEXT("A")));

	TickUntil(TestWorld, 14.5f);
	TestFalse(TEXT("The round is over after its 14 seconds"), Yard->IsRunning());
	TestEqual(TEXT("Four shots at three second intervals, the weakest first"), LogText(Yard->GetShotLog()), FString(TEXT("AAAC")));
	TestEqual(TEXT("All four hit"), Yard->GetHits(), 4);
	TestEqual(TEXT("The anvil is down and the barrel and the crate are standing"), Yard->GetStandingCount(), 2);
	TestEqual(TEXT("So the dummies escaped"), Yard->GetResult(), FString(TEXT("ESCAPED")));
	TestEqual(TEXT("The label shows the hits and the result"), LabelText(Yard), FString(TEXT("Round 1  DojoP20WeakestRule  Hits 4  Standing 2  ESCAPED")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P20_PracticeYard_HitDamageIsTunable, "Dojo.P20.PracticeYard.HitDamageIsTunable", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With HitDamage set to 30, the anvil falls to one hit and the crate to two, so the weakest rule moves on sooner than it does at a damage of 10. */
bool FDojo_P20_PracticeYard_HitDamageIsTunable::RunTest(const FString& Parameters)
{
	using namespace DojoP20YardTest;

	FDojoTestWorld TestWorld;

	ADojoP20PracticeYard* Yard = SpawnYard(TestWorld, { UDojoP20WeakestRule::StaticClass() }, [](ADojoP20PracticeYard& Tuned)
	{
		Tuned.RoundSeconds = 9.f;
		Tuned.HitDamage = 30;
	});
	if (!TestNotNull(TEXT("Yard spawned"), Yard)) return false;

	TickUntil(TestWorld, 2.5f);
	TestEqual(TEXT("One hit of 30 takes the anvil down"), Yard->GetStandingCount(), 2);

	TickUntil(TestWorld, 9.5f);
	TestFalse(TEXT("The round is over after its 9 seconds"), Yard->IsRunning());
	TestEqual(TEXT("The anvil once, the crate twice, then the barrel"), LogText(Yard->GetShotLog()), FString(TEXT("ACCB")));
	TestEqual(TEXT("All four hit"), Yard->GetHits(), 4);
	TestEqual(TEXT("Only the barrel is standing"), Yard->GetStandingCount(), 1);
	TestEqual(TEXT("So the dummies escaped"), Yard->GetResult(), FString(TEXT("ESCAPED")));
	TestEqual(TEXT("The label shows the hits and the result"), LabelText(Yard), FString(TEXT("Round 1  DojoP20WeakestRule  Hits 4  Standing 1  ESCAPED")));

	return true;
}

#endif
