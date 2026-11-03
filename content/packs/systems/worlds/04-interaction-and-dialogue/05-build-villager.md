---
id: s4-villager
title: A villager who starts a conversation when used
order: 5
kind: build
scaffold: blank
difficulty: 3
patterns: []
skills: [interfaces, data]
terms: [uinterface, iinterface, blueprintnativeevent, ftext, tobjectptr]
prerequisites: [s4-dialogue-runner, s4-interactor, s4-interactable]
xp: 90
estimatedMinutes: 25
concepts:
  - A new kind of usable thing that joins by signing the contract, with no change to the hero
  - Using a villager means asking the runner, and a busy runner means the villager cannot be used
---

# Brief

When a hero with an interactor stands next to a villager, the prompt reads `Talk to Mara`; using the villager starts her conversation on the shared runner; while any conversation plays no villager can be used; and once it ends the villager is offered again.

Compiles against earlier quests: s4-interactable (`Quests/s4-interactable/DojoS4Interactable.h`), s4-interactor (`Quests/s4-interactor/DojoS4Interactor.h`, `Quests/s4-interactor/DojoS4FocusSpy.h`), and s4-dialogue-runner (`Quests/s4-dialogue-runner/DojoS4DialogueData.h`, `Quests/s4-dialogue-runner/DojoS4DialogueRunner.h`, `Quests/s4-dialogue-runner/DojoS4FlagStore.h`).

Write `ADojoS4Villager` from nothing. It is an actor that signs the interactable contract. It knows the runner and the flags it is given and nothing about any hero, and the runner knows nothing about villagers.

The tests use this public interface, so keep these names:

- `UPROPERTY(VisibleAnywhere) TObjectPtr<UBoxComponent> Body;` is the root, with a box extent of about 40 by 40 by 90, the `OverlapAllDynamic` collision profile, and overlap events on, so an interactor can find the villager.
- `FText DisplayName`, `TObjectPtr<UDojoS4DialogueData> Dialogue`, `TObjectPtr<UDojoS4DialogueRunner> Runner`, and `TObjectPtr<UDojoS4FlagStore> FlagStore`, all `UPROPERTY(EditAnywhere, BlueprintReadWrite)`.
- The prompt is `Talk to ` followed by the display name.
- The villager can be used when its dialogue, runner, and flag store are all set and the runner is idle.
- Using the villager when it can be used starts its dialogue on the runner with the flag store and returns whether it started; otherwise it returns false and changes nothing.

This is the last piece of the Village Gate boss.

## See it in the editor

Make a conversation asset like the one in the runner quest. Place a `DojoS4Villager` in the level and set its Display Name to Mara and its Dialogue to the asset. In the level Blueprint, on BeginPlay create a flag store and a runner, store them in variables, and assign them to the villager's Runner and Flag Store. On the 1 key call Interact on the villager through the interface and print the runner's Get State, and on the 2 key call Can Interact and print the answer. Press Play and press 2 (`true`), then 1 (the state is Active), then 2 again (`false`).

# Files

## DojoS4Villager.h

```cpp
// Declare ADojoS4Villager here.
```

## DojoS4Villager.cpp

```cpp
// Define ADojoS4Villager here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s4-dialogue-runner/DojoS4DialogueData.h"
#include "Quests/s4-dialogue-runner/DojoS4DialogueRunner.h"
#include "Quests/s4-dialogue-runner/DojoS4FlagStore.h"
#include "Quests/s4-interactable/DojoS4Interactable.h"
#include "Quests/s4-interactor/DojoS4FocusSpy.h"
#include "Quests/s4-interactor/DojoS4Interactor.h"
#include "Quests/s4-villager/DojoS4Villager.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS4VillagerTest
{
	/** A conversation of one greeting with one answer that ends it. */
	TStrongObjectPtr<UDojoS4DialogueData> MakeTalk(const TCHAR* Line)
	{
		TStrongObjectPtr<UDojoS4DialogueData> Talk(NewObject<UDojoS4DialogueData>());
		FDojoS4DialogueChoice Answer;
		Answer.Text = FText::FromString(TEXT("Bye"));
		FDojoS4DialogueNode Node;
		Node.Id = FName(TEXT("hello"));
		Node.Text = FText::FromString(Line);
		Node.Choices.Add(Answer);
		Talk->StartNode = Node.Id;
		Talk->Nodes.Add(Node);
		return Talk;
	}

	/** Spawns a villager with this name and conversation at this place, sharing this runner and flag store. */
	ADojoS4Villager* SpawnVillager(FDojoTestWorld& TestWorld, const TCHAR* Name, UDojoS4DialogueData* Talk, UDojoS4DialogueRunner* Runner, UDojoS4FlagStore* Store, const FVector& Location)
	{
		ADojoS4Villager* Villager = TestWorld.SpawnActor<ADojoS4Villager>();
		Villager->DisplayName = FText::FromString(Name);
		Villager->Dialogue = Talk;
		Villager->Runner = Runner;
		Villager->FlagStore = Store;
		Villager->SetActorLocation(Location);
		return Villager;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Villager_TalksThroughTheInterface, "Dojo.S4.Villager.TalksThroughTheInterface", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Uses a villager only through the interface and checks the prompt, who may use it, and what it starts. */
bool FDojo_S4_Villager_TalksThroughTheInterface::RunTest(const FString& Parameters)
{
	using namespace DojoS4VillagerTest;

	FDojoTestWorld TestWorld;

	TStrongObjectPtr<UDojoS4DialogueData> Talk = MakeTalk(TEXT("Hello."));
	TStrongObjectPtr<UDojoS4DialogueRunner> Runner(NewObject<UDojoS4DialogueRunner>());
	TStrongObjectPtr<UDojoS4FlagStore> Store(NewObject<UDojoS4FlagStore>());
	ADojoTestActor* Hero = TestWorld.SpawnActor<ADojoTestActor>();
	ADojoS4Villager* Bare = TestWorld.SpawnActor<ADojoS4Villager>();
	if (!TestNotNull(TEXT("Villager spawned"), Bare) || !TestNotNull(TEXT("Hero spawned"), Hero)) return false;

	TestTrue(TEXT("A villager is an interactable"), Bare->GetClass()->ImplementsInterface(UDojoS4Interactable::StaticClass()));
	TestFalse(TEXT("A villager with nothing to say cannot be used"), IDojoS4Interactable::Execute_CanInteract(Bare, Hero));
	TestFalse(TEXT("Using it does nothing"), IDojoS4Interactable::Execute_Interact(Bare, Hero));

	ADojoS4Villager* NoFlags = SpawnVillager(TestWorld, TEXT("A"), Talk.Get(), Runner.Get(), nullptr, FVector(900.f, 0.f, 0.f));
	ADojoS4Villager* NoTalk = SpawnVillager(TestWorld, TEXT("B"), nullptr, Runner.Get(), Store.Get(), FVector(1300.f, 0.f, 0.f));
	ADojoS4Villager* NoRunner = SpawnVillager(TestWorld, TEXT("C"), Talk.Get(), nullptr, Store.Get(), FVector(1700.f, 0.f, 0.f));
	TestFalse(TEXT("A villager without flags cannot be used"), IDojoS4Interactable::Execute_CanInteract(NoFlags, Hero));
	TestFalse(TEXT("A villager without a conversation cannot be used"), IDojoS4Interactable::Execute_CanInteract(NoTalk, Hero));
	TestFalse(TEXT("A villager without a runner cannot be used"), IDojoS4Interactable::Execute_CanInteract(NoRunner, Hero));
	TestFalse(TEXT("And using one starts nothing"), IDojoS4Interactable::Execute_Interact(NoFlags, Hero) || Runner->GetState() == EDojoS4DialogueState::EDS_Active);

	ADojoS4Villager* Mara = SpawnVillager(TestWorld, TEXT("Mara"), Talk.Get(), Runner.Get(), Store.Get(), FVector(500.f, 0.f, 0.f));
	TestEqual(TEXT("The prompt names the villager"), IDojoS4Interactable::Execute_GetPrompt(Mara).ToString(), FString(TEXT("Talk to Mara")));
	TestTrue(TEXT("A villager with a conversation can be used"), IDojoS4Interactable::Execute_CanInteract(Mara, Hero));

	TestTrue(TEXT("Using the villager starts the conversation"), IDojoS4Interactable::Execute_Interact(Mara, Hero));
	TestTrue(TEXT("The runner is active"), Runner->GetState() == EDojoS4DialogueState::EDS_Active);
	TestEqual(TEXT("It shows the villager's line"), Runner->GetCurrentText().ToString(), FString(TEXT("Hello.")));
	TestFalse(TEXT("A villager cannot be used while a conversation plays"), IDojoS4Interactable::Execute_CanInteract(Mara, Hero));
	TestFalse(TEXT("Using it again starts nothing"), IDojoS4Interactable::Execute_Interact(Mara, Hero));

	Runner->End();
	TestTrue(TEXT("Once the conversation is over the villager can be used again"), IDojoS4Interactable::Execute_CanInteract(Mara, Hero));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Villager_OneConversationAtATime, "Dojo.S4.Villager.OneConversationAtATime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts two villagers on one runner and checks that while one talks neither can be used, and that the right line plays. */
bool FDojo_S4_Villager_OneConversationAtATime::RunTest(const FString& Parameters)
{
	using namespace DojoS4VillagerTest;

	FDojoTestWorld TestWorld;

	TStrongObjectPtr<UDojoS4DialogueData> MaraTalk = MakeTalk(TEXT("Hello."));
	TStrongObjectPtr<UDojoS4DialogueData> OrinTalk = MakeTalk(TEXT("Hmph."));
	TStrongObjectPtr<UDojoS4DialogueRunner> Runner(NewObject<UDojoS4DialogueRunner>());
	TStrongObjectPtr<UDojoS4FlagStore> Store(NewObject<UDojoS4FlagStore>());
	ADojoTestActor* Hero = TestWorld.SpawnActor<ADojoTestActor>();
	ADojoS4Villager* Mara = SpawnVillager(TestWorld, TEXT("Mara"), MaraTalk.Get(), Runner.Get(), Store.Get(), FVector(500.f, 0.f, 0.f));
	ADojoS4Villager* Orin = SpawnVillager(TestWorld, TEXT("Orin"), OrinTalk.Get(), Runner.Get(), Store.Get(), FVector(900.f, 0.f, 0.f));
	if (!TestNotNull(TEXT("Villagers spawned"), Orin)) return false;

	IDojoS4Interactable::Execute_Interact(Orin, Hero);
	TestEqual(TEXT("Orin's line plays, not Mara's"), Runner->GetCurrentText().ToString(), FString(TEXT("Hmph.")));
	TestFalse(TEXT("Mara cannot be used while Orin talks"), IDojoS4Interactable::Execute_CanInteract(Mara, Hero));
	TestFalse(TEXT("Mara cannot interrupt"), IDojoS4Interactable::Execute_Interact(Mara, Hero));
	TestEqual(TEXT("Orin's line is still showing"), Runner->GetCurrentText().ToString(), FString(TEXT("Hmph.")));

	Runner->Choose(0);
	TestTrue(TEXT("Orin finished"), Runner->GetState() == EDojoS4DialogueState::EDS_Idle);
	TestTrue(TEXT("Now Mara can be used"), IDojoS4Interactable::Execute_Interact(Mara, Hero));
	TestEqual(TEXT("Mara's line plays"), Runner->GetCurrentText().ToString(), FString(TEXT("Hello.")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Villager_FoundAndBusy, "Dojo.S4.Villager.FoundAndBusy", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks a hero with an interactor up to a villager, talks, and checks the focus follows who can be used. */
bool FDojo_S4_Villager_FoundAndBusy::RunTest(const FString& Parameters)
{
	using namespace DojoS4VillagerTest;

	FDojoTestWorld TestWorld;

	TStrongObjectPtr<UDojoS4DialogueData> Talk = MakeTalk(TEXT("Hello."));
	TStrongObjectPtr<UDojoS4DialogueRunner> Runner(NewObject<UDojoS4DialogueRunner>());
	TStrongObjectPtr<UDojoS4FlagStore> Store(NewObject<UDojoS4FlagStore>());
	ADojoTestActor* Hero = TestWorld.SpawnActor<ADojoTestActor>();
	Hero->SetActorLocation(FVector(0.f, 5000.f, 0.f));
	UDojoS4Interactor* Interactor = TestWorld.AddComponent<UDojoS4Interactor>(Hero);
	Interactor->AttachToComponent(Hero->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
	TStrongObjectPtr<UDojoS4FocusSpy> Spy(NewObject<UDojoS4FocusSpy>());
	Spy->Watch(Interactor);

	ADojoS4Villager* Mara = SpawnVillager(TestWorld, TEXT("Mara"), Talk.Get(), Runner.Get(), Store.Get(), FVector(0.f, 5000.f, 0.f) + FVector(120.f, 0.f, 0.f));
	TestWorld.Tick(2);

	TestTrue(TEXT("The interactor finds the villager by its box"), Interactor->GetFocus() == Mara);
	TestEqual(TEXT("With the villager's prompt"), Spy->GetLastPrompt(), FString(TEXT("Talk to Mara")));

	TestTrue(TEXT("Interacting starts the talk"), Interactor->TryInteract());
	TestTrue(TEXT("The runner is active"), Runner->GetState() == EDojoS4DialogueState::EDS_Active);
	TestTrue(TEXT("A busy villager is no longer offered"), Interactor->GetFocus() == nullptr);

	Runner->Choose(0);
	Interactor->Refresh();
	TestTrue(TEXT("When the talk is over the villager is offered again"), Interactor->GetFocus() == Mara);

	return true;
}

#endif
```

# Hints

- The villager implements the three functions of the interface the way the door did, with the `_Implementation` suffix and `override`, and it inherits from `AActor` first and the interface second.
- `Interact_Implementation` can begin by calling `CanInteract_Implementation`, so the two always agree.
- `CanInteract_Implementation` is the guard that needs all four things set and an idle runner, and a parameter named like `Dialogue`, `Runner`, `FlagStore` or `DisplayName` is error C4458 on Windows.

# Rubric

- The villager signs the interactable contract and a hero's interactor finds it through its box, with no change to the hero.
- The prompt is built from the display name, and a villager missing its dialogue, runner, or flags says it cannot be used.
- A villager cannot be used while any conversation plays on the shared runner, and a refused use changes nothing.
- Using a villager starts exactly its own dialogue on the shared runner with the shared flags.
- The villager holds no pointer to any hero or listener and never reaches into the runner's conversation.

# Alternative

A villager could own its own runner, so every villager can talk at once. That is simpler to build and breaks down when two share the screen, since both would show a line, both would take the number keys, and the hero would walk during either. One runner shared by every villager makes "only one conversation at a time" a single check, and the villager's part stays tiny. The villager is a new kind of usable thing that joins the system without a change to the hero or the prompt, which is the reason for the contract in the first quest.

# Parsons

```yaml
- id: villager-can-interact
  prompt: Put CanInteract in order.
  lines:
    - "bool ADojoS4Villager::CanInteract_Implementation(AActor* Interactor) const"
    - "{"
    - "	return Dialogue != nullptr && Runner != nullptr && FlagStore != nullptr && Runner->GetState() == EDojoS4DialogueState::EDS_Idle;"
    - "}"
  distractors:
    - line: "	return Runner->GetState() == EDojoS4DialogueState::EDS_Idle;"
      mistake: Asking the runner first crashes when a villager has no runner yet, and ignores the dialogue and the flags it also needs.
    - line: "	return Cast<IDojoS4Interactable>(Interactor) != nullptr;"
      mistake: That checks whether the user is itself usable, which has nothing to do with whether this villager may be used.
```
