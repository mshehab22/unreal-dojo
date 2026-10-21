#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/DefaultPawn.h"
#include "Quests/f5-boss-beacon-drill/DojoF5BeaconDirector.h"
#include "Quests/f5-cooldown/DojoF5CooldownComponent.h"
#include "Quests/f5-follower/DojoF5Follower.h"
#include "Quests/f5-interact/DojoF5Prodder.h"
#include "Quests/f5-lever/DojoF5Lever.h"
#include "Support/DojoTestWorld.h"

namespace DojoF5DrillTest
{
	/** Every piece of the drill, wired the way a designer would. */
	struct FDrill
	{
		ADefaultPawn* Player = nullptr;
		ADojoF5Prodder* Keeper = nullptr;
		ADojoF5Follower* Drone = nullptr;
		TArray<ADojoF5Lever*> Levers;
		ADojoF5BeaconDirector* Director = nullptr;
	};

	/** Levers 0 and 1 stand 300 apart; lever 2 is far off. */
	const FVector LeverSpots[] = { FVector(0.f, 0.f, 0.f), FVector(300.f, 0.f, 0.f), FVector(1200.f, 0.f, 0.f) };

	/** Spawns three levers with cooldowns, the keeper, the drone, a stand-in pawn, and the director last. */
	FDrill SpawnDrill(FDojoTestWorld& TestWorld)
	{
		FDrill Drill;
		UWorld* World = TestWorld.GetWorld();

		for (const FVector& Spot : LeverSpots)
		{
			ADojoF5Lever* Lever = TestWorld.SpawnActor<ADojoF5Lever>();
			Lever->SetActorLocation(Spot);
			TestWorld.AddComponent<UDojoF5CooldownComponent>(Lever);
			Drill.Levers.Add(Lever);
		}

		// The test world has no player controller, so a default pawn stands in for the player's pawn.
		Drill.Player = TestWorld.SpawnActor<ADefaultPawn>();
		Drill.Player->SetActorLocation(FVector(0.f, -2000.f, 0.f));
		Drill.Keeper = TestWorld.SpawnActor<ADojoF5Prodder>();
		Drill.Drone = TestWorld.SpawnActor<ADojoF5Follower>();
		Drill.Drone->SetActorLocation(FVector(0.f, -500.f, 0.f));

		Drill.Director = World->SpawnActorDeferred<ADojoF5BeaconDirector>(ADojoF5BeaconDirector::StaticClass(), FTransform::Identity);
		for (ADojoF5Lever* Lever : Drill.Levers) Drill.Director->Levers.Add(Lever);
		Drill.Director->Keeper = Drill.Keeper;
		Drill.Director->Drone = Drill.Drone;
		Drill.Director->FollowTarget = Drill.Player;
		Drill.Director->FinishSpawning(FTransform::Identity);

		return Drill;
	}

	/** Moves the player's pawn and lets half a second pass; the keeper rides along. */
	void WalkTo(FDojoTestWorld& TestWorld, FDrill& Drill, const FVector& Location)
	{
		Drill.Player->SetActorLocation(Location);
		TestWorld.Tick(30);
	}

	/** Ticks until World's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_BeaconDrill_TwoRoundsPlayAlike, "Dojo.F5.BeaconDrill.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays the same three-alarm round twice and checks the alarms, the drone following each new light, the win, and the reset. */
bool FDojo_F5_BeaconDrill_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoF5DrillTest;

	FDojoTestWorld TestWorld;
	FDrill Drill = SpawnDrill(TestWorld);
	ADojoF5BeaconDirector* Director = Drill.Director;

	float FirstWin = 0.f;
	for (int32 Round = 1; Round <= 2; ++Round)
	{
		const FString Prefix = FString::Printf(TEXT("Round %d: "), Round);

		TestTrue(Prefix + TEXT("running"), Director->IsRunning());
		TestEqual(Prefix + TEXT("no alarms yet"), Director->GetAlarms(), 0);
		TestEqual(Prefix + TEXT("the label starts at ALARM 0"), Director->Label->Text.ToString(), FString(TEXT("ALARM 0")));
		for (ADojoF5Lever* Lever : Drill.Levers)
		{
			TestFalse(Prefix + TEXT("every lever starts dark"), Lever->IsOn());
			TestTrue(Prefix + TEXT("every cooldown starts ready"), Lever->FindComponentByClass<UDojoF5CooldownComponent>()->IsReady());
		}

		for (int32 Alarm = 1; Alarm <= 3; ++Alarm)
		{
			for (int32 Index = 0; Index < 3; ++Index)
			{
				WalkTo(TestWorld, Drill, LeverSpots[Index]);
				Director->PressInteract();
				if (Index < 2)
				{
					TestTrue(Prefix + FString::Printf(TEXT("lever %d lit"), Index), Drill.Levers[Index]->IsOn());
					TestTrue(Prefix + TEXT("the drone follows the newest light"), Drill.Drone->GetTarget() == Drill.Levers[Index]);
				}
			}

			TestEqual(Prefix + FString::Printf(TEXT("alarm %d rang"), Alarm), Director->GetAlarms(), Alarm);
			for (ADojoF5Lever* Lever : Drill.Levers) TestFalse(Prefix + TEXT("the alarm puts every lever out"), Lever->IsOn());

			if (Alarm < 3)
			{
				TestEqual(Prefix + TEXT("the label counts alarms"), Director->Label->Text.ToString(), FString::Printf(TEXT("ALARM %d"), Alarm));
				TestWorld.Tick(60 * 4 + 6);
			}
		}

		TestFalse(Prefix + TEXT("three alarms win the round"), Director->IsRunning());
		const float Win = Director->GetWinSeconds();
		TestEqual(Prefix + TEXT("the label shows the win time"), Director->Label->Text.ToString(), FString::Printf(TEXT("WIN %.1f s"), Win));
		if (Round == 1) FirstWin = Win;
		else TestEqual(TEXT("Round 2 takes exactly as long as round 1"), Win, FirstWin, 0.02f);

		WalkTo(TestWorld, Drill, LeverSpots[0]);
		TestWorld.Tick(60 * 5);
		Director->PressInteract();
		TestFalse(TEXT("E after the round does nothing"), Drill.Levers[0]->IsOn());

		Director->RestartRound();
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_BeaconDrill_RangeTimesAndTies, "Dojo.F5.BeaconDrill.RangeTimesAndTies", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the 200 range, the 6 second light, the 4 second cooldown, the lower lever winning a tie, the drone, R mid-round, and the 60 second limit. */
bool FDojo_F5_BeaconDrill_RangeTimesAndTies::RunTest(const FString& Parameters)
{
	using namespace DojoF5DrillTest;

	FDojoTestWorld TestWorld;
	FDrill Drill = SpawnDrill(TestWorld);
	ADojoF5BeaconDirector* Director = Drill.Director;
	ADojoF5Lever* Far = Drill.Levers[2];

	TestTrue(TEXT("The keeper rides on the player's pawn"), Drill.Keeper->GetAttachParentActor() == Drill.Player);

	WalkTo(TestWorld, Drill, LeverSpots[2] + FVector(0.f, 210.f, 0.f));
	Director->PressInteract();
	TestFalse(TEXT("210 away is out of the 200 range"), Far->IsOn());

	WalkTo(TestWorld, Drill, LeverSpots[2] + FVector(0.f, 190.f, 0.f));
	Director->PressInteract();
	TestTrue(TEXT("190 away is inside the range"), Far->IsOn());
	TestTrue(TEXT("The drone follows the light"), Drill.Drone->GetTarget() == Far);
	const float LitAt = TestWorld.GetWorld()->GetTimeSeconds();

	TickUntil(TestWorld, LitAt + 5.8f);
	TestTrue(TEXT("Still lit at 5.8 seconds"), Far->IsOn());
	TickUntil(TestWorld, LitAt + 6.2f);
	TestFalse(TEXT("Dark after 6 seconds"), Far->IsOn());
	const float DarkAt = TestWorld.GetWorld()->GetTimeSeconds();

	TickUntil(TestWorld, DarkAt + 3.7f);
	Director->PressInteract();
	TestFalse(TEXT("Cannot be relit 3.7 seconds after going dark"), Far->IsOn());
	TickUntil(TestWorld, DarkAt + 4.3f);
	Director->PressInteract();
	TestTrue(TEXT("Can be relit after the 4 second cooldown"), Far->IsOn());

	// Halfway between levers 0 and 1: equally near, so the lower index wins.
	WalkTo(TestWorld, Drill, (LeverSpots[0] + LeverSpots[1]) * 0.5);
	Director->PressInteract();
	TestTrue(TEXT("A tie lights the lower lever"), Drill.Levers[0]->IsOn());
	TestFalse(TEXT("And not the higher one"), Drill.Levers[1]->IsOn());
	TestTrue(TEXT("The drone moves to the newest light"), Drill.Drone->GetTarget() == Drill.Levers[0]);

	Director->RestartRound();
	TestTrue(TEXT("R does nothing during a round"), Drill.Levers[0]->IsOn());

	// Light lever 0 so it goes dark about a second before the end and is still cooling when time runs out.
	TickUntil(TestWorld, 52.5f);
	WalkTo(TestWorld, Drill, LeverSpots[0]);
	Director->PressInteract();
	TestTrue(TEXT("Lever 0 lit again late in the round"), Drill.Levers[0]->IsOn());

	// Light lever 1 just before time runs out, so the round ends with it lit.
	TickUntil(TestWorld, 57.f);
	WalkTo(TestWorld, Drill, LeverSpots[1]);
	Director->PressInteract();
	TestTrue(TEXT("Lever 1 lit just before the end"), Drill.Levers[1]->IsOn());

	TickUntil(TestWorld, 60.5f);
	TestFalse(TEXT("The round ends after 60 seconds"), Director->IsRunning());
	TestEqual(TEXT("The label says time is up"), Director->Label->Text.ToString(), FString(TEXT("TIME UP")));

	WalkTo(TestWorld, Drill, LeverSpots[0]);
	Director->PressInteract();
	TestFalse(TEXT("E after time is up does nothing"), Drill.Levers[0]->IsOn());

	Director->RestartRound();
	TestTrue(TEXT("R after time is up starts a round"), Director->IsRunning());
	for (ADojoF5Lever* Lever : Drill.Levers)
	{
		TestFalse(TEXT("A new round starts with every lever dark"), Lever->IsOn());
		TestTrue(TEXT("A new round starts with every cooldown ready"), Lever->FindComponentByClass<UDojoF5CooldownComponent>()->IsReady());
	}

	return true;
}

#endif
