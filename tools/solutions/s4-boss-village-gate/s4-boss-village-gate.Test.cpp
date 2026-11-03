#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/s4-boss-village-gate/DojoS4GateDirector.h"
#include "Quests/s4-dialogue-runner/DojoS4DialogueData.h"
#include "Quests/s4-dialogue-runner/DojoS4DialogueRunner.h"
#include "Quests/s4-dialogue-runner/DojoS4FlagStore.h"
#include "Quests/s4-interactable/DojoS4Door.h"
#include "Quests/s4-interactable/DojoS4Sign.h"
#include "Quests/s4-interactor/DojoS4Interactor.h"
#include "Quests/s4-villager/DojoS4Villager.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS4VillageTest
{
	/** Where everyone stands: the hero starts far away, the gossip is first on the road, then the gatekeeper with a sign beside, then the gate. */
	const FVector StartSpot(0.f, -1500.f, 0.f);
	const FVector GossipSpot(600.f, 0.f, 0.f);
	const FVector KeeperSpot(1200.f, 0.f, 0.f);
	const FVector SignSpot(1200.f, 150.f, 0.f);
	const FVector GateSpot(1800.f, 0.f, 0.f);

	/** The village: the hero, the people, the gate, and the director that connects them. */
	struct FVillage
	{
		ADojoTestActor* Hero = nullptr;
		UDojoS4Interactor* Interactor = nullptr;
		ADojoS4Villager* Keeper = nullptr;
		ADojoS4Villager* Gossip = nullptr;
		ADojoS4Sign* Sign = nullptr;
		ADojoS4Door* Gate = nullptr;
		ADojoS4GateDirector* Director = nullptr;
		TStrongObjectPtr<UDojoS4DialogueData> KeeperTalk;
		TStrongObjectPtr<UDojoS4DialogueData> GossipTalk;
	};

	/** One choice of a node. */
	FDojoS4DialogueChoice MakeChoice(const TCHAR* Text, const TCHAR* Next, const TCHAR* Required = TEXT(""), const TCHAR* Sets = TEXT(""))
	{
		FDojoS4DialogueChoice Choice;
		Choice.Text = FText::FromString(Text);
		Choice.NextNode = FName(Next);
		Choice.RequiredFlag = FName(Required);
		Choice.SetFlag = FName(Sets);
		return Choice;
	}

	/** One node with its choices. */
	FDojoS4DialogueNode MakeNode(const TCHAR* Id, const TCHAR* Text, const TArray<FDojoS4DialogueChoice>& Choices)
	{
		FDojoS4DialogueNode Node;
		Node.Id = FName(Id);
		Node.Text = FText::FromString(Text);
		Node.Choices = Choices;
		return Node;
	}

	/** Spawns a villager with a conversation at a place. */
	ADojoS4Villager* SpawnVillager(FDojoTestWorld& TestWorld, const TCHAR* Name, UDojoS4DialogueData* Talk, const FVector& Location)
	{
		ADojoS4Villager* Villager = TestWorld.SpawnActor<ADojoS4Villager>();
		Villager->DisplayName = FText::FromString(Name);
		Villager->Dialogue = Talk;
		Villager->SetActorLocation(Location);
		return Villager;
	}

	/** Builds the village and starts round 1. */
	FVillage MakeVillage(FDojoTestWorld& TestWorld)
	{
		FVillage Village;

		Village.KeeperTalk.Reset(NewObject<UDojoS4DialogueData>());
		Village.KeeperTalk->StartNode = FName(TEXT("greet"));
		Village.KeeperTalk->Nodes.Add(MakeNode(TEXT("greet"), TEXT("Halt. State your business."), { MakeChoice(TEXT("I carry a message."), TEXT("message")), MakeChoice(TEXT("Let me through."), TEXT("refuse")), MakeChoice(TEXT("The password is moonlight."), TEXT("welcome"), TEXT("knows-password"), TEXT("pass")) }));
		Village.KeeperTalk->Nodes.Add(MakeNode(TEXT("message"), TEXT("Messages go to the captain."), { MakeChoice(TEXT("Understood."), TEXT("")) }));
		Village.KeeperTalk->Nodes.Add(MakeNode(TEXT("refuse"), TEXT("No password, no passage."), { MakeChoice(TEXT("Fine."), TEXT("")) }));
		Village.KeeperTalk->Nodes.Add(MakeNode(TEXT("welcome"), TEXT("Moonlight. Go ahead."), {}));

		Village.GossipTalk.Reset(NewObject<UDojoS4DialogueData>());
		Village.GossipTalk->StartNode = FName(TEXT("gossip"));
		Village.GossipTalk->Nodes.Add(MakeNode(TEXT("gossip"), TEXT("Psst. The gate password changes daily."), { MakeChoice(TEXT("Tell me."), TEXT("reveal")), MakeChoice(TEXT("Not interested."), TEXT("")) }));
		Village.GossipTalk->Nodes.Add(MakeNode(TEXT("reveal"), TEXT("Today it is moonlight."), { MakeChoice(TEXT("Thanks."), TEXT(""), TEXT(""), TEXT("knows-password")) }));

		Village.Hero = TestWorld.SpawnActor<ADojoTestActor>();
		Village.Hero->SetActorLocation(StartSpot);
		Village.Interactor = TestWorld.AddComponent<UDojoS4Interactor>(Village.Hero);
		Village.Interactor->AttachToComponent(Village.Hero->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);

		Village.Keeper = SpawnVillager(TestWorld, TEXT("Gatekeeper"), Village.KeeperTalk.Get(), KeeperSpot);
		Village.Gossip = SpawnVillager(TestWorld, TEXT("Gossip"), Village.GossipTalk.Get(), GossipSpot);
		Village.Sign = TestWorld.SpawnActor<ADojoS4Sign>();
		Village.Sign->SetActorLocation(SignSpot);
		Village.Gate = TestWorld.SpawnActor<ADojoS4Door>();
		Village.Gate->SetActorLocation(GateSpot);

		const FTransform DirectorSpot(FVector(0.f, -3000.f, 0.f));
		Village.Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoS4GateDirector>(ADojoS4GateDirector::StaticClass(), DirectorSpot);
		Village.Director->Hero = Village.Hero;
		Village.Director->Gate = Village.Gate;
		Village.Director->Villagers = { Village.Keeper, Village.Gossip };
		Village.Director->StartLocation = StartSpot;
		Village.Director->FinishSpawning(DirectorSpot);
		return Village;
	}

	/** Walks the hero to a place and lets three frames pass so overlaps are noticed. */
	void Go(FDojoTestWorld& TestWorld, const FVillage& Village, const FVector& Location)
	{
		Village.Hero->SetActorLocation(Location);
		TestWorld.Tick(3);
	}

	/** The board's text. */
	FString BoardOf(const FVillage& Village)
	{
		return Village.Director->Board->Text.ToString();
	}

	/** The text on the board after the finale. */
	FString OpenBoard(const FString& PromptLine, float Seconds)
	{
		return FString::Printf(TEXT("%s\nGATE OPEN in %.1f s"), *PromptLine, Seconds);
	}

	/** Talks to the gossip and learns the password. */
	void LearnPassword(FDojoTestWorld& TestWorld, const FVillage& Village)
	{
		Go(TestWorld, Village, GossipSpot);
		Village.Director->PressInteract();
		Village.Director->PressChoice(1);
		Village.Director->PressChoice(1);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Village_TwoRounds, "Dojo.S4.Village.TwoRounds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a round that tries the refusal, the gossip, and the password, restarts, plays the short way, and checks both play out the same way. */
bool FDojo_S4_Village_TwoRounds::RunTest(const FString& Parameters)
{
	using namespace DojoS4VillageTest;

	FDojoTestWorld TestWorld;

	FVillage Village = MakeVillage(TestWorld);
	if (!TestNotNull(TEXT("The director has a runner"), Village.Director->GetRunner())) return false;
	const float RoundOneStart = TestWorld.GetWorld()->GetTimeSeconds();

	TestTrue(TEXT("Round 1 is running"), Village.Director->IsRunning());
	TestTrue(TEXT("The hero is exploring"), Village.Director->GetInputMode() == EDojoS4InputMode::EIM_Exploring);
	TestTrue(TEXT("The gate starts locked"), Village.Gate->IsLocked());
	TestEqual(TEXT("The board at the start"), BoardOf(Village), FString(TEXT("Prompt: none")));
	TestTrue(TEXT("The villagers share the director's runner"), Village.Keeper->Runner == Village.Director->GetRunner() && Village.Gossip->Runner == Village.Director->GetRunner());

	Go(TestWorld, Village, FVector(KeeperSpot.X, 100.f, 0.f));
	TestEqual(TEXT("The sign is nearer than the gatekeeper, so it is offered"), BoardOf(Village), FString(TEXT("Prompt: Read sign")));
	Village.Director->PressInteract();
	TestEqual(TEXT("E read the sign"), Village.Sign->GetReadCount(), 1);
	TestTrue(TEXT("Reading is not a conversation"), Village.Director->GetInputMode() == EDojoS4InputMode::EIM_Exploring);

	Go(TestWorld, Village, KeeperSpot);
	TestEqual(TEXT("Standing on the gatekeeper, the gatekeeper is offered"), BoardOf(Village), FString(TEXT("Prompt: Talk to Gatekeeper")));
	Village.Director->PressInteract();
	TestTrue(TEXT("Talking changes what the keys mean"), Village.Director->GetInputMode() == EDojoS4InputMode::EIM_Talking);
	TestEqual(TEXT("The board shows the line and only the choices that are allowed"), BoardOf(Village), FString(TEXT("Halt. State your business.\n1. I carry a message.\n2. Let me through.")));

	Village.Director->PressInteract();
	Village.Director->PressChoice(3);
	Village.Director->PressChoice(0);
	TestEqual(TEXT("E, a hidden third choice, and choice 0 change nothing"), BoardOf(Village), FString(TEXT("Halt. State your business.\n1. I carry a message.\n2. Let me through.")));

	Village.Director->PressChoice(2);
	TestEqual(TEXT("The refusal shows its own choices"), BoardOf(Village), FString(TEXT("No password, no passage.\n1. Fine.")));
	Village.Director->PressChoice(1);
	TestTrue(TEXT("The conversation ended and the keys mean exploring again"), Village.Director->GetInputMode() == EDojoS4InputMode::EIM_Exploring);
	TestEqual(TEXT("The gatekeeper is offered again"), BoardOf(Village), FString(TEXT("Prompt: Talk to Gatekeeper")));
	TestTrue(TEXT("The gate is still locked"), Village.Gate->IsLocked());

	Go(TestWorld, Village, GossipSpot);
	TestEqual(TEXT("The gossip is offered"), BoardOf(Village), FString(TEXT("Prompt: Talk to Gossip")));
	Village.Director->PressInteract();
	Village.Director->PressChoice(1);
	TestEqual(TEXT("The gossip reveals the password"), BoardOf(Village), FString(TEXT("Today it is moonlight.\n1. Thanks.")));
	Village.Director->PressChoice(1);
	TestTrue(TEXT("The password is known"), Village.Director->GetFlags()->Has(FName(TEXT("knows-password"))));
	TestTrue(TEXT("The gate is still locked"), Village.Gate->IsLocked());

	Go(TestWorld, Village, KeeperSpot);
	Village.Director->PressInteract();
	TestEqual(TEXT("Now all three choices are offered, in the written order"), BoardOf(Village), FString(TEXT("Halt. State your business.\n1. I carry a message.\n2. Let me through.\n3. The password is moonlight.")));
	Village.Director->PressChoice(3);
	TestFalse(TEXT("Saying the password unlocked the gate"), Village.Gate->IsLocked());
	TestEqual(TEXT("The closing line waits for E"), BoardOf(Village), FString(TEXT("Moonlight. Go ahead.\n(E to continue)")));
	Village.Director->PressInteract();
	TestTrue(TEXT("E moved the closing line on and ended the talk"), Village.Director->GetInputMode() == EDojoS4InputMode::EIM_Exploring);

	Go(TestWorld, Village, GateSpot);
	TestEqual(TEXT("At the unlocked gate the gate is offered"), BoardOf(Village), FString(TEXT("Prompt: Open door")));
	Village.Director->PressInteract();

	const float RoundOneFinish = TestWorld.GetWorld()->GetTimeSeconds() - RoundOneStart;
	TestTrue(TEXT("The gate is open"), Village.Gate->IsOpen());
	TestFalse(TEXT("Opening the gate ended round 1"), Village.Director->IsRunning());
	TestEqual(TEXT("The finish time is the time since the round began"), Village.Director->GetFinishSeconds(), RoundOneFinish, 0.001f);
	TestEqual(TEXT("The board shows the finale"), BoardOf(Village), OpenBoard(TEXT("Prompt: Close door"), RoundOneFinish));

	Village.Director->PressInteract();
	TestTrue(TEXT("After the finale E does nothing, so the gate stays open"), Village.Gate->IsOpen());

	// Round 2 starts from the same state as round 1.
	Village.Director->RestartRound();
	const float RoundTwoStart = TestWorld.GetWorld()->GetTimeSeconds();
	TestWorld.Tick(3);
	TestTrue(TEXT("Round 2 is running"), Village.Director->IsRunning());
	TestTrue(TEXT("The gate is locked and shut again"), Village.Gate->IsLocked() && !Village.Gate->IsOpen());
	TestFalse(TEXT("The password is forgotten"), Village.Director->GetFlags()->Has(FName(TEXT("knows-password"))));
	TestFalse(TEXT("The pass flag is cleared"), Village.Director->GetFlags()->Has(FName(TEXT("pass"))));
	TestTrue(TEXT("The hero is back at the start"), Village.Hero->GetActorLocation().Equals(StartSpot, 1.f));
	TestTrue(TEXT("No conversation is playing"), Village.Director->GetRunner()->GetState() == EDojoS4DialogueState::EDS_Idle);
	TestEqual(TEXT("The board is back at the start"), BoardOf(Village), FString(TEXT("Prompt: none")));

	// Round 2, the short way.
	LearnPassword(TestWorld, Village);
	Go(TestWorld, Village, KeeperSpot);
	Village.Director->PressInteract();
	TestEqual(TEXT("The password is offered as the third choice again"), BoardOf(Village), FString(TEXT("Halt. State your business.\n1. I carry a message.\n2. Let me through.\n3. The password is moonlight.")));
	Village.Director->PressChoice(3);
	Village.Director->PressInteract();
	Go(TestWorld, Village, GateSpot);
	Village.Director->PressInteract();

	const float RoundTwoFinish = TestWorld.GetWorld()->GetTimeSeconds() - RoundTwoStart;
	TestFalse(TEXT("Round 2 ends when the gate opens"), Village.Director->IsRunning());
	TestEqual(TEXT("Round 2 has its own finish time"), Village.Director->GetFinishSeconds(), RoundTwoFinish, 0.001f);
	TestEqual(TEXT("The board shows round 2's finale"), BoardOf(Village), OpenBoard(TEXT("Prompt: Close door"), RoundTwoFinish));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Village_KeysAndModes, "Dojo.S4.Village.KeysAndModes", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Presses keys where they mean nothing and checks the round is untouched, and that R waits for the finale. */
bool FDojo_S4_Village_KeysAndModes::RunTest(const FString& Parameters)
{
	using namespace DojoS4VillageTest;

	FDojoTestWorld TestWorld;

	FVillage Village = MakeVillage(TestWorld);

	Village.Director->PressChoice(1);
	Village.Director->PressInteract();
	TestTrue(TEXT("A choice key with no conversation does nothing"), Village.Director->GetRunner()->GetState() == EDojoS4DialogueState::EDS_Idle);
	TestEqual(TEXT("E with nothing near does nothing"), BoardOf(Village), FString(TEXT("Prompt: none")));

	LearnPassword(TestWorld, Village);
	TestTrue(TEXT("The password is known"), Village.Director->GetFlags()->Has(FName(TEXT("knows-password"))));
	Village.Director->RestartRound();
	TestTrue(TEXT("R does nothing while the round runs"), Village.Director->GetFlags()->Has(FName(TEXT("knows-password"))));
	TestTrue(TEXT("And the hero stays where he is"), Village.Hero->GetActorLocation().Equals(GossipSpot, 1.f));

	Go(TestWorld, Village, KeeperSpot);
	Village.Director->PressInteract();
	TestTrue(TEXT("Talking to the gatekeeper"), Village.Director->GetInputMode() == EDojoS4InputMode::EIM_Talking);
	TestFalse(TEXT("Villagers cannot be used while a conversation plays"), IDojoS4Interactable::Execute_CanInteract(Village.Gossip, Village.Hero));

	Village.Director->RestartRound();
	TestTrue(TEXT("R does nothing in the middle of a conversation"), Village.Director->GetInputMode() == EDojoS4InputMode::EIM_Talking);

	Village.Director->PressChoice(1);
	TestTrue(TEXT("The message choice moves on"), Village.Director->GetInputMode() == EDojoS4InputMode::EIM_Talking);
	Village.Director->PressChoice(1);
	TestTrue(TEXT("And the answer ends it"), Village.Director->GetInputMode() == EDojoS4InputMode::EIM_Exploring);
	TestTrue(TEXT("The gate was never unlocked by anything else"), Village.Gate->IsLocked());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Village_UnbindsWhenItLeaves, "Dojo.S4.Village.UnbindsWhenItLeaves", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys the director and checks nothing it listened to still has a listener. */
bool FDojo_S4_Village_UnbindsWhenItLeaves::RunTest(const FString& Parameters)
{
	using namespace DojoS4VillageTest;

	FDojoTestWorld TestWorld;

	FVillage Village = MakeVillage(TestWorld);
	UDojoS4DialogueRunner* Runner = Village.Director->GetRunner();
	UDojoS4FlagStore* Flags = Village.Director->GetFlags();

	TestTrue(TEXT("The director listens to the interactor"), Village.Interactor->OnFocusChanged.IsBound());
	TestTrue(TEXT("The director listens to the runner"), Runner->OnDialogueStarted.IsBound() && Runner->OnChoiceMade.IsBound() && Runner->OnDialogueEnded.IsBound());
	TestTrue(TEXT("The director listens to the flags"), Flags->OnFlagSet.IsBound());

	Village.Director->Destroy();
	TestFalse(TEXT("Nobody listens to the interactor after it leaves"), Village.Interactor->OnFocusChanged.IsBound());
	TestFalse(TEXT("Nobody listens to the runner after it leaves"), Runner->OnDialogueStarted.IsBound() || Runner->OnChoiceMade.IsBound() || Runner->OnDialogueEnded.IsBound());
	TestFalse(TEXT("Nobody listens to the flags after it leaves"), Flags->OnFlagSet.IsBound());

	Go(TestWorld, Village, KeeperSpot);
	TestTrue(TEXT("The hero carries on without it"), Village.Interactor->GetFocus() == Village.Keeper);

	return true;
}

#endif
