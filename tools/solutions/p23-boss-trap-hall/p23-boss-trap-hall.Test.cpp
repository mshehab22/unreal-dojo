#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p23-boss-trap-hall/DojoP23FrostVent.h"
#include "Quests/p23-boss-trap-hall/DojoP23TrapHall.h"
#include "Quests/p7-ballista/DojoP7Ballista.h"
#include "Quests/p7-ballista/DojoP7BallistaAiming.h"
#include "Quests/p7-ballista/DojoP7BallistaIdle.h"
#include "Quests/p7-ballista/DojoP7BallistaReloading.h"
#include "Quests/p8-trap-family/DojoP8Fighter.h"
#include "Quests/p8-trap-family/DojoP8SpikeTrap.h"
#include "Support/DojoTestWorld.h"

namespace DojoP23HallTest
{
	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** One trap of a test hall. */
	FDojoP23TrapPlan MakeTrap(UClass* Kind, float AlongX)
	{
		FDojoP23TrapPlan Plan;
		Plan.TrapClass = Kind;
		Plan.Location = FVector(AlongX, 0.f, 0.f);
		Plan.RestSeconds = 1.5f;
		return Plan;
	}

	/** One fighter of a test hall. */
	FDojoP23HallFighterPlan MakeFighter(float AlongX, float StartHealth)
	{
		FDojoP23HallFighterPlan Plan;
		Plan.Location = FVector(AlongX, 0.f, 0.f);
		Plan.StartHealth = StartHealth;
		return Plan;
	}

	/** Spawns a hall with a spike trap at the origin and a frost vent 400 out, Ava 100 out with 100 health, and Bo 400 out with 100, with Tune run on it before its BeginPlay starts round 1. */
	ADojoP23TrapHall* SpawnHall(FDojoTestWorld& TestWorld, TFunctionRef<void(ADojoP23TrapHall&)> Tune)
	{
		ADojoP23TrapHall* Hall = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP23TrapHall>(ADojoP23TrapHall::StaticClass(), FTransform::Identity);
		if (Hall)
		{
			Hall->Traps = { MakeTrap(ADojoP8SpikeTrap::StaticClass(), 0.f), MakeTrap(ADojoP23FrostVent::StaticClass(), 400.f) };
			Hall->Roster = { MakeFighter(100.f, 100.f), MakeFighter(400.f, 100.f) };
			Tune(*Hall);
			Hall->FinishSpawning(FTransform::Identity);
		}
		return Hall;
	}

	/** The health of the fighter built from plan Index, or -1 when there is none. */
	float HealthOf(const ADojoP23TrapHall* Hall, int32 Index)
	{
		const ADojoP8Fighter* Fighter = Hall->GetFighter(Index);
		return Fighter ? Fighter->GetHealth() : -1.f;
	}

	/** True when the ballista's current mode is of the given class. */
	bool InMode(const ADojoP23TrapHall* Hall, UClass* Mode)
	{
		const ADojoP7Ballista* Ballista = Hall->GetBallista();
		return Ballista && Ballista->GetCurrentState() && Ballista->GetCurrentState()->GetClass() == Mode;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_TrapHall_TwoRoundsOfTrapsAndBolts, "Dojo.P23.TrapHall.TwoRoundsOfTrapsAndBolts", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two 12 second rounds: two kinds of trap spring on their rests, the ballista aims, fires, reloads, and goes idle when no target is left, and each bolt hits the nearest fighter in reach. */
bool FDojo_P23_TrapHall_TwoRoundsOfTrapsAndBolts::RunTest(const FString& Parameters)
{
	using namespace DojoP23HallTest;

	FDojoTestWorld TestWorld;

	ADojoP23TrapHall* Hall = SpawnHall(TestWorld, [](ADojoP23TrapHall&) {});
	if (!TestNotNull(TEXT("Hall spawned"), Hall)) return false;
	if (!TestNotNull(TEXT("The hall built its ballista"), Hall->GetBallista())) return false;
	if (!TestNotNull(TEXT("The hall built its spike trap"), Hall->GetTrap(0)) || !TestNotNull(TEXT("And its frost vent"), Hall->GetTrap(1))) return false;

	TestTrue(TEXT("Round 1 is running"), Hall->IsRunning());
	TestEqual(TEXT("It is round 1"), Hall->GetRoundNumber(), 1);
	TestTrue(TEXT("The first trap is the earlier quest's spike trap"), Hall->GetTrap(0)->IsA<ADojoP8SpikeTrap>());
	TestTrue(TEXT("The second is the new frost vent"), Hall->GetTrap(1)->IsA<ADojoP23FrostVent>());
	TestEqual(TEXT("Two fighters stand"), Hall->GetStandingCount(), 2);
	TestTrue(TEXT("The ballista rests"), InMode(Hall, UDojoP7BallistaIdle::StaticClass()));
	TestEqual(TEXT("The label shows the round, the bolts, and the fighters standing"), Hall->Label->Text.ToString(), FString(TEXT("Round 1  Bolts 0  Standing 2")));

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 0.4f);
	TestTrue(TEXT("A fighter in reach has put the ballista to aiming"), InMode(Hall, UDojoP7BallistaAiming::StaticClass()));

	TickUntil(TestWorld, Start + 0.6f);
	TestEqual(TEXT("The spike trap took 30 from Ava"), HealthOf(Hall, 0), 70.f);
	TestEqual(TEXT("The frost vent took 10 from Bo"), HealthOf(Hall, 1), 90.f);
	TestEqual(TEXT("The spike trap played its cue"), Hall->GetTrap(0)->GetCueLog().Num(), 1);
	TestEqual(TEXT("The frost vent played its own"), Hall->GetTrap(1)->GetCueLog()[0], FName(TEXT("FrostBurst")));

	TickUntil(TestWorld, Start + 1.2f);
	TestTrue(TEXT("The first order to fire, at one second, came before the aim was done"), InMode(Hall, UDojoP7BallistaAiming::StaticClass()));
	TestEqual(TEXT("So no bolt has gone"), Hall->GetBolts(), 0);
	TestFalse(TEXT("A trap that is resting does not spring again at 1.5"), Hall->GetTrap(0)->GetCueLog().Num() > 1);

	TickUntil(TestWorld, Start + 2.2f);
	TestEqual(TEXT("The order at two seconds shot the first bolt"), Hall->GetBolts(), 1);
	TestTrue(TEXT("And the ballista is reloading"), InMode(Hall, UDojoP7BallistaReloading::StaticClass()));
	TestEqual(TEXT("The bolt hit Ava, the nearer fighter, for 25"), HealthOf(Hall, 0), 45.f);
	TestEqual(TEXT("And left Bo alone"), HealthOf(Hall, 1), 90.f);

	TickUntil(TestWorld, Start + 2.7f);
	TestEqual(TEXT("The spike trap sprang again once it had rested"), HealthOf(Hall, 0), 15.f);
	TestEqual(TEXT("And so did the frost vent"), HealthOf(Hall, 1), 80.f);

	TickUntil(TestWorld, Start + 3.7f);
	TestTrue(TEXT("After the reload the ballista aims again, because a target is still there"), InMode(Hall, UDojoP7BallistaAiming::StaticClass()));

	TickUntil(TestWorld, Start + 5.2f);
	TestEqual(TEXT("Ava is down after the spikes at 4.5"), HealthOf(Hall, 0), 0.f);
	TestEqual(TEXT("The second bolt shot at five seconds went to Bo"), Hall->GetBolts(), 2);
	TestEqual(TEXT("It took 25 from Bo's 70"), HealthOf(Hall, 1), 45.f);
	TestEqual(TEXT("One fighter stands"), Hall->GetStandingCount(), 1);

	TickUntil(TestWorld, Start + 8.2f);
	TestEqual(TEXT("The third bolt shot at eight seconds"), Hall->GetBolts(), 3);
	TestEqual(TEXT("It left Bo with 10"), HealthOf(Hall, 1), 10.f);

	TickUntil(TestWorld, Start + 8.7f);
	TestEqual(TEXT("The frost vent at 8.5 put Bo down"), Hall->GetStandingCount(), 0);

	TickUntil(TestWorld, Start + 9.f);
	TestFalse(TEXT("With no fighter in reach the ballista has no target"), Hall->GetBallista()->HasTarget());
	TestTrue(TEXT("But it finishes its reload first"), InMode(Hall, UDojoP7BallistaReloading::StaticClass()));

	TickUntil(TestWorld, Start + 10.f);
	TestTrue(TEXT("Then it goes idle"), InMode(Hall, UDojoP7BallistaIdle::StaticClass()));

	TickUntil(TestWorld, Start + 12.5f);
	TestFalse(TEXT("The round is over at 12 seconds"), Hall->IsRunning());
	TestEqual(TEXT("Orders to fire at an idle ballista shot nothing"), Hall->GetBolts(), 3);
	TestEqual(TEXT("Every fighter is down"), Hall->GetResult(), FString(TEXT("CLEARED")));
	TestEqual(TEXT("The label shows the result"), Hall->Label->Text.ToString(), FString(TEXT("Round 1  Bolts 3  Standing 0  CLEARED")));

	Hall->Roster = { MakeFighter(100.f, 100.f), MakeFighter(400.f, 200.f) };
	TickUntil(TestWorld, Start + 13.f);
	Hall->PressNextRound();
	TestTrue(TEXT("Round 2 is running"), Hall->IsRunning());
	TestEqual(TEXT("It is round 2"), Hall->GetRoundNumber(), 2);
	TestEqual(TEXT("A new ballista has shot nothing"), Hall->GetBolts(), 0);
	TestEqual(TEXT("Both fighters are back"), Hall->GetStandingCount(), 2);
	TestEqual(TEXT("Bo has the new 200"), HealthOf(Hall, 1), 200.f);
	TestTrue(TEXT("And the result is empty"), Hall->GetResult().IsEmpty());

	const float SecondStart = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, SecondStart + 3.f);
	Hall->PressNextRound();
	TestEqual(TEXT("R does nothing while a round runs"), Hall->GetRoundNumber(), 2);

	TickUntil(TestWorld, SecondStart + 12.5f);
	TestEqual(TEXT("With a target in reach all round, the ballista shot four bolts"), Hall->GetBolts(), 4);
	TestEqual(TEXT("Ava is down"), HealthOf(Hall, 0), 0.f);
	TestEqual(TEXT("Six frost bursts and three bolts left Bo with 65"), HealthOf(Hall, 1), 65.f);
	TestEqual(TEXT("So the hall held"), Hall->GetResult(), FString(TEXT("HELD")));
	TestEqual(TEXT("The label shows round 2 and its result"), Hall->Label->Text.ToString(), FString(TEXT("Round 2  Bolts 4  Standing 1  HELD")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_TrapHall_OutOfReachNeverWakesTheBallista, "Dojo.P23.TrapHall.OutOfReachNeverWakesTheBallista", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A fighter beyond the ballista's reach is never a target: the ballista stays idle and shoots nothing, and orders to fire do nothing. */
bool FDojo_P23_TrapHall_OutOfReachNeverWakesTheBallista::RunTest(const FString& Parameters)
{
	using namespace DojoP23HallTest;

	FDojoTestWorld TestWorld;

	ADojoP23TrapHall* Hall = SpawnHall(TestWorld, [](ADojoP23TrapHall& Tuned)
	{
		Tuned.Traps.Reset();
		Tuned.Roster = { MakeFighter(3000.f, 100.f) };
	});
	if (!TestNotNull(TEXT("Hall spawned"), Hall)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 5.f);

	TestTrue(TEXT("The ballista is still idle"), InMode(Hall, UDojoP7BallistaIdle::StaticClass()));
	TestFalse(TEXT("And has no target"), Hall->GetBallista()->HasTarget());
	TestEqual(TEXT("It shot nothing"), Hall->GetBolts(), 0);
	TestEqual(TEXT("The fighter is untouched"), HealthOf(Hall, 0), 100.f);

	TickUntil(TestWorld, Start + 12.5f);
	TestEqual(TEXT("The fighter stands, so the hall held"), Hall->GetResult(), FString(TEXT("HELD")));
	TestEqual(TEXT("The label shows it"), Hall->Label->Text.ToString(), FString(TEXT("Round 1  Bolts 0  Standing 1  HELD")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P23_TrapHall_AnyTrapClassWillDo, "Dojo.P23.TrapHall.AnyTrapClassWillDo", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The traps come from classes in the plan, take the plan's rest, and an abstract class in the plan builds nothing and breaks nothing. */
bool FDojo_P23_TrapHall_AnyTrapClassWillDo::RunTest(const FString& Parameters)
{
	using namespace DojoP23HallTest;

	FDojoTestWorld TestWorld;

	ADojoP23TrapHall* Hall = SpawnHall(TestWorld, [](ADojoP23TrapHall& Tuned)
	{
		FDojoP23TrapPlan SlowFrost = MakeTrap(ADojoP23FrostVent::StaticClass(), 400.f);
		SlowFrost.RestSeconds = 2.5f;
		Tuned.Traps = { MakeTrap(ADojoP8SpikeTrap::StaticClass(), 0.f), MakeTrap(ADojoP8TrapBase::StaticClass(), 0.f), SlowFrost };
	});
	if (!TestNotNull(TEXT("Hall spawned"), Hall)) return false;

	TestNotNull(TEXT("The spike trap was built"), Hall->GetTrap(0));
	TestTrue(TEXT("The abstract class in the plan built nothing"), Hall->GetTrap(1) == nullptr);
	if (!TestNotNull(TEXT("The frost vent was built"), Hall->GetTrap(2))) return false;
	TestEqual(TEXT("The frost vent rests the plan's 2.5 seconds"), Hall->GetTrap(2)->CooldownSeconds, 2.5f);

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Start + 3.2f);
	TestEqual(TEXT("A frost vent that rests 2.5 seconds sprang at 0.5 and not at 1.5 or 2.5"), Hall->GetTrap(2)->GetCueLog().Num(), 1);
	TestEqual(TEXT("It took 10 from Bo once"), HealthOf(Hall, 1), 90.f);

	TickUntil(TestWorld, Start + 4.2f);
	TestEqual(TEXT("And sprang again at 3.5"), Hall->GetTrap(2)->GetCueLog().Num(), 2);

	return true;
}

#endif
