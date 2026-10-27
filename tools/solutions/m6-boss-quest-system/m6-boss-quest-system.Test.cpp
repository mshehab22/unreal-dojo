#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/m6-boss-quest-system/DojoM6QuestDirector.h"
#include "Quests/m6-checkpoints/DojoM6Checkpoint.h"
#include "Quests/m6-checkpoints/DojoM6Course.h"
#include "Quests/m6-quest-giver/DojoM6QuestGiver.h"
#include "Quests/m6-quest-item/DojoM6QuestItem.h"
#include "Quests/m6-quest-tracker/DojoM6QuestData.h"
#include "Quests/m6-quest-tracker/DojoM6QuestTracker.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM6QuestSystemTest
{
	/** The givers stand 400 apart; tools to the east, gems to the west, the course farther east. */
	const FVector ToolsGiverSpot(0.f, 0.f, 0.f);
	const FVector CourierGiverSpot(0.f, 400.f, 0.f);
	const FVector GateSpots[] = { FVector(1500.f, 0.f, 0.f), FVector(1500.f, 500.f, 0.f), FVector(1500.f, 1000.f, 0.f) };

	/** The day's pieces, wired the way a designer wires them in Details. */
	struct FQuestDay
	{
		UDojoM6QuestData* Tools = nullptr;
		UDojoM6QuestData* Courier = nullptr;
		UDojoM6QuestData* Cache = nullptr;
		ADojoTestActor* Hero = nullptr;
		ADojoM6QuestGiver* ToolsGiver = nullptr;
		ADojoM6QuestGiver* CourierGiver = nullptr;
		ADojoM6Course* Course = nullptr;
		ADojoM6QuestDirector* Director = nullptr;
		UDojoM6QuestTracker* Tracker = nullptr;
	};

	/** Makes one quest asset. */
	UDojoM6QuestData* MakeQuest(const TCHAR* Title, EDojoM6QuestKind Kind, const TCHAR* ItemTag, int32 Count)
	{
		UDojoM6QuestData* Quest = NewObject<UDojoM6QuestData>();
		Quest->Title = FText::FromString(Title);
		Quest->Kind = Kind;
		Quest->ItemTag = FName(ItemTag);
		Quest->Count = Count;
		return Quest;
	}

	/** Adds one item spot. */
	void AddSpot(ADojoM6QuestDirector* Director, const TCHAR* ItemTag, const FVector& Location)
	{
		FDojoM6ItemSpot Spot;
		Spot.ItemTag = FName(ItemTag);
		Spot.Location = Location;
		Director->ItemSpots.Add(Spot);
	}

	/** Spawns an actor of the given class at Location. */
	template<typename TActor>
	TActor* SpawnAt(FDojoTestWorld& TestWorld, const FVector& Location)
	{
		TActor* Actor = TestWorld.SpawnActor<TActor>();
		Actor->SetActorLocation(Location);
		return Actor;
	}

	/** Lost tools (3 Tool), then Courier run (a 20 second course, after the tools), and the secret Hidden cache (2 Gem). An extra tool can sit 400 south of the tools giver. */
	FQuestDay MakeDay(FDojoTestWorld& TestWorld, bool bExtraTool)
	{
		FQuestDay Day;

		Day.Tools = MakeQuest(TEXT("Lost tools"), EDojoM6QuestKind::EQK_Collect, TEXT("Tool"), 3);
		Day.Courier = MakeQuest(TEXT("Courier run"), EDojoM6QuestKind::EQK_Goal, TEXT(""), 1);
		Day.Courier->TimeLimitSeconds = 20.f;
		Day.Courier->Requires = Day.Tools;
		Day.Cache = MakeQuest(TEXT("Hidden cache"), EDojoM6QuestKind::EQK_Collect, TEXT("Gem"), 2);
		Day.Cache->bSecret = true;

		Day.Hero = SpawnAt<ADojoTestActor>(TestWorld, FVector(0.f, -1000.f, 0.f));

		Day.ToolsGiver = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM6QuestGiver>(ADojoM6QuestGiver::StaticClass(), FTransform(ToolsGiverSpot));
		Day.ToolsGiver->Quest = Day.Tools;
		Day.ToolsGiver->FinishSpawning(FTransform(ToolsGiverSpot));
		Day.CourierGiver = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM6QuestGiver>(ADojoM6QuestGiver::StaticClass(), FTransform(CourierGiverSpot));
		Day.CourierGiver->Quest = Day.Courier;
		Day.CourierGiver->FinishSpawning(FTransform(CourierGiverSpot));

		Day.Course = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM6Course>(ADojoM6Course::StaticClass(), FTransform::Identity);
		for (const FVector& Spot : GateSpots) Day.Course->Checkpoints.Add(SpawnAt<ADojoM6Checkpoint>(TestWorld, Spot));
		Day.Course->FinishSpawning(FTransform::Identity);

		const FTransform DirectorSpot(FVector(0.f, -3000.f, 0.f));
		Day.Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM6QuestDirector>(ADojoM6QuestDirector::StaticClass(), DirectorSpot);
		Day.Director->Quests = { Day.Tools, Day.Courier, Day.Cache };
		Day.Director->Givers = { Day.ToolsGiver, Day.CourierGiver };
		AddSpot(Day.Director, TEXT("Tool"), FVector(600.f, 0.f, 0.f));
		AddSpot(Day.Director, TEXT("Tool"), FVector(600.f, 300.f, 0.f));
		AddSpot(Day.Director, TEXT("Tool"), FVector(600.f, 600.f, 0.f));
		AddSpot(Day.Director, TEXT("Gem"), FVector(-600.f, 0.f, 0.f));
		AddSpot(Day.Director, TEXT("Gem"), FVector(-600.f, 300.f, 0.f));
		if (bExtraTool) AddSpot(Day.Director, TEXT("Tool"), FVector(0.f, -400.f, 0.f));
		Day.Director->Course = Day.Course;
		Day.Director->CourseQuest = Day.Courier;
		Day.Director->FollowTarget = Day.Hero;
		Day.Director->FinishSpawning(DirectorSpot);

		Day.Tracker = TestWorld.GetWorld()->GetSubsystem<UDojoM6QuestTracker>();
		return Day;
	}

	/** Moves the hero, lets 0.2 seconds pass so the gate check runs, and presses E when asked. */
	void Visit(FDojoTestWorld& TestWorld, const FQuestDay& Day, const FVector& Location, bool bPressE)
	{
		Day.Hero->SetActorLocation(Location);
		TestWorld.Tick(12);
		if (bPressE) Day.Director->PressInteract();
	}

	/** The board's text. */
	FString BoardOf(const FQuestDay& Day)
	{
		return Day.Director->Board->Text.ToString();
	}

	/** A giver's label. */
	FString LabelOf(const ADojoM6QuestGiver* Giver)
	{
		return Giver->Label->Text.ToString();
	}

	/** Plays one full round through every quest and returns its finish time, or -1 if the day broke. */
	float PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FQuestDay& Day, const FString& Round)
	{
		const FString Prefix = Round + TEXT(": ");

		Test.TestTrue(Prefix + TEXT("running"), Day.Director->IsRunning());
		Test.TestEqual(Prefix + TEXT("the board hides the secret quest"), BoardOf(Day), FString(TEXT("Lost tools: NEW\nCourier run: LOCKED")));
		Test.TestEqual(Prefix + TEXT("the tools giver offers a quest"), LabelOf(Day.ToolsGiver), FString(TEXT("QUEST")));
		Test.TestEqual(Prefix + TEXT("the courier giver is locked"), LabelOf(Day.CourierGiver), FString(TEXT("LOCKED")));
		if (!Test.TestEqual(Prefix + TEXT("five items wait"), Day.Director->GetItems().Num(), 5)) return -1.f;

		Visit(TestWorld, Day, ToolsGiverSpot, true);
		Test.TestEqual(Prefix + TEXT("talking starts the tools quest"), LabelOf(Day.ToolsGiver), FString(TEXT("ACTIVE")));
		Test.TestEqual(Prefix + TEXT("the board counts tools"), BoardOf(Day), FString(TEXT("Lost tools: 0/3\nCourier run: LOCKED")));

		Visit(TestWorld, Day, CourierGiverSpot, true);
		Test.TestEqual(Prefix + TEXT("a locked giver cannot start its quest"), Day.Tracker->GetState(Day.Courier), EDojoM6QuestState::EQS_Locked);

		Visit(TestWorld, Day, FVector(600.f, 0.f, 0.f), true);
		Visit(TestWorld, Day, FVector(600.f, 300.f, 0.f), true);
		Test.TestEqual(Prefix + TEXT("two of three tools"), BoardOf(Day), FString(TEXT("Lost tools: 2/3\nCourier run: LOCKED")));
		Visit(TestWorld, Day, FVector(600.f, 600.f, 0.f), true);
		Test.TestEqual(Prefix + TEXT("the third tool finishes the quest and unlocks the courier run"), BoardOf(Day), FString(TEXT("Lost tools: DONE\nCourier run: NEW")));
		Test.TestEqual(Prefix + TEXT("the courier giver now offers"), LabelOf(Day.CourierGiver), FString(TEXT("QUEST")));

		Visit(TestWorld, Day, FVector(-600.f, 0.f, 0.f), true);
		Test.TestEqual(Prefix + TEXT("the first gem starts the secret quest and shows it"), BoardOf(Day), FString(TEXT("Lost tools: DONE\nCourier run: NEW\nHidden cache: 1/2")));
		Visit(TestWorld, Day, FVector(-600.f, 300.f, 0.f), true);
		Test.TestEqual(Prefix + TEXT("the second gem finishes the secret"), Day.Tracker->GetState(Day.Cache), EDojoM6QuestState::EQS_Completed);
		Test.TestTrue(Prefix + TEXT("the secret alone does not end the day"), Day.Director->IsRunning());

		Visit(TestWorld, Day, CourierGiverSpot, true);
		Test.TestEqual(Prefix + TEXT("the courier run starts"), BoardOf(Day), FString(TEXT("Lost tools: DONE\nCourier run: ACTIVE\nHidden cache: DONE")));

		Visit(TestWorld, Day, GateSpots[1], false);
		Test.TestEqual(Prefix + TEXT("the second gate first does not count"), Day.Course->GetPassedCount(), 0);

		Visit(TestWorld, Day, GateSpots[0], false);
		Visit(TestWorld, Day, GateSpots[1], false);
		Test.TestEqual(Prefix + TEXT("two gates in order"), Day.Course->GetPassedCount(), 2);
		Visit(TestWorld, Day, GateSpots[2], false);

		Test.TestFalse(Prefix + TEXT("the last gate ends the day"), Day.Director->IsRunning());
		const float Finish = Day.Director->GetFinishSeconds();
		Test.TestEqual(Prefix + TEXT("the board calls the finale with the time"), BoardOf(Day), FString::Printf(TEXT("Lost tools: DONE\nCourier run: DONE\nHidden cache: DONE\nALL QUESTS DONE in %.1f s"), Finish));
		return Finish;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_QuestSystem_TwoRoundsPlayAlike, "Dojo.M6.QuestSystem.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two full quest days and checks the second plays exactly like the first, then checks the director lets go of the tracker. */
bool FDojo_M6_QuestSystem_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoM6QuestSystemTest;

	FDojoTestWorld TestWorld;
	const FQuestDay Day = MakeDay(TestWorld, false);
	if (!TestNotNull(TEXT("Director spawned"), Day.Director) || !TestNotNull(TEXT("Tracker found"), Day.Tracker)) return false;

	const float First = PlayRound(*this, TestWorld, Day, TEXT("Round 1"));
	if (First < 0.f) return false;

	Visit(TestWorld, Day, ToolsGiverSpot, true);
	TestEqual(TEXT("E after the finale does nothing"), LabelOf(Day.ToolsGiver), FString(TEXT("DONE")));

	Day.Director->RestartRound();
	const float Second = PlayRound(*this, TestWorld, Day, TEXT("Round 2"));
	TestEqual(TEXT("Round 2 takes exactly as long as round 1"), Second, First, 0.02f);

	TestTrue(TEXT("The director listens to the tracker while in play"), Day.Tracker->OnQuestStateChanged.Contains(Day.Director, TEXT("HandleQuestStateChanged")));
	Day.Director->Destroy();
	TestFalse(TEXT("A destroyed director has stopped listening to the tracker"), Day.Tracker->OnQuestStateChanged.Contains(Day.Director, TEXT("HandleQuestStateChanged")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M6_QuestSystem_RangesTiesAndFailure, "Dojo.M6.QuestSystem.RangesTiesAndFailure", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the 200 reach, the tie rules, unwanted items, the 100 gate reach, the 20 second failure and retry, and a run finished in time. */
bool FDojo_M6_QuestSystem_RangesTiesAndFailure::RunTest(const FString& Parameters)
{
	using namespace DojoM6QuestSystemTest;

	FDojoTestWorld TestWorld;
	const FQuestDay Day = MakeDay(TestWorld, true);
	if (!TestNotNull(TEXT("Director spawned"), Day.Director) || !TestNotNull(TEXT("Tracker found"), Day.Tracker)) return false;

	Visit(TestWorld, Day, FVector(600.f, 0.f, 0.f), true);
	TestEqual(TEXT("E ignores a tool no quest wants yet"), Day.Director->GetItems().Num(), 6);

	Visit(TestWorld, Day, FVector(-210.f, 0.f, 0.f), true);
	TestEqual(TEXT("210 from a giver is out of the 200 reach"), Day.Tracker->GetState(Day.Tools), EDojoM6QuestState::EQS_Available);

	Visit(TestWorld, Day, FVector(0.f, 200.f, 0.f), true);
	TestEqual(TEXT("Between two givers the earlier one answers"), Day.Tracker->GetState(Day.Tools), EDojoM6QuestState::EQS_Active);

	Visit(TestWorld, Day, FVector(0.f, -200.f, 0.f), true);
	TestEqual(TEXT("A giver wins a tie with a wanted item"), Day.Director->GetItems().Num(), 6);

	Visit(TestWorld, Day, FVector(0.f, -210.f, 0.f), true);
	TestEqual(TEXT("Nearer to the item, E collects it"), Day.Tracker->GetProgress(Day.Tools), 1);

	Day.Director->RestartRound();
	TestEqual(TEXT("R mid-day keeps the quest progress"), Day.Tracker->GetProgress(Day.Tools), 1);
	TestEqual(TEXT("R mid-day leaves the collected item gone"), Day.Director->GetItems().Num(), 5);

	Visit(TestWorld, Day, GateSpots[0], false);
	TestEqual(TEXT("A gate before the courier run starts does not count"), Day.Course->GetPassedCount(), 0);

	Visit(TestWorld, Day, FVector(600.f, 0.f, 0.f), true);
	Visit(TestWorld, Day, FVector(600.f, 300.f, 0.f), true);
	TestEqual(TEXT("Three tools finish the quest"), Day.Tracker->GetState(Day.Tools), EDojoM6QuestState::EQS_Completed);

	Visit(TestWorld, Day, CourierGiverSpot, true);
	Visit(TestWorld, Day, GateSpots[0] + FVector(-110.f, 0.f, 0.f), false);
	TestEqual(TEXT("110 from a gate is out of the 100 gate reach"), Day.Course->GetPassedCount(), 0);
	Visit(TestWorld, Day, GateSpots[0] + FVector(-90.f, 0.f, 0.f), false);
	TestEqual(TEXT("90 from a gate passes it"), Day.Course->GetPassedCount(), 1);

	TestWorld.Tick(60 * 19);
	TestEqual(TEXT("Still running just before 20 seconds"), Day.Tracker->GetState(Day.Courier), EDojoM6QuestState::EQS_Active);
	TestWorld.Tick(60);
	TestEqual(TEXT("The courier run fails after 20 seconds"), Day.Tracker->GetState(Day.Courier), EDojoM6QuestState::EQS_Failed);
	TestEqual(TEXT("The board shows the failure"), BoardOf(Day), FString(TEXT("Lost tools: DONE\nCourier run: FAILED")));
	TestEqual(TEXT("The giver offers a retry"), LabelOf(Day.CourierGiver), FString(TEXT("RETRY")));

	Visit(TestWorld, Day, CourierGiverSpot, true);
	TestEqual(TEXT("A retry starts the run again"), Day.Tracker->GetState(Day.Courier), EDojoM6QuestState::EQS_Active);
	TestEqual(TEXT("A retry starts the course from the first gate"), Day.Course->GetPassedCount(), 0);

	for (const FVector& Gate : GateSpots) Visit(TestWorld, Day, Gate, false);
	TestEqual(TEXT("The retry is finished in time"), Day.Tracker->GetState(Day.Courier), EDojoM6QuestState::EQS_Completed);
	TestFalse(TEXT("Every quest that is not secret is done, so the day ends"), Day.Director->IsRunning());

	TestWorld.Tick(60 * 21);
	TestEqual(TEXT("A run finished in time stays done after its 20 seconds"), Day.Tracker->GetState(Day.Courier), EDojoM6QuestState::EQS_Completed);
	TestTrue(TEXT("The board says the secret was never found"), BoardOf(Day).StartsWith(TEXT("Lost tools: DONE\nCourier run: DONE\nALL QUESTS DONE")));

	return true;
}

#endif
