---
id: p6-knockout-herald
title: A herald who announces after the fall
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [event-queue]
skills: [event-queue, delegates]
terms: [ustruct, multicast-delegate, tick-groups, destroy, tarray]
prerequisites: [p6-later-not-now]
xp: 50
estimatedMinutes: 15
concepts:
  - Posting an event stores it and returns; handling happens later, at a moment the receiver chooses
  - A queued event carries a copy of everything listeners need, because its source may be gone by then
  - Handling takes the whole batch first, so events posted while handling wait for the next round
---

# Brief

When you press Play and run `ke * KnockOut`, both fighters fall at once and leave the arena, and at the end of that frame the herald's label announces the knockouts, even though neither fighter exists any more.

A fighter that is knocked out tells the herald and then leaves the arena at once. If the herald announced right there, inside the fighter's call, every listener (the scoreboard, the crowd, the commentary) would run in the middle of the fighter's code, while it is being destroyed. Instead the fighter posts an `FDojoP6KnockoutEvent` into the herald's mailbox and returns. The herald ticks in the last tick group of the frame and announces everything posted that frame, oldest first, through its `OnKnockoutAnnounced` delegate.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap at the top of `Announce`: move every waiting knockout from `Mailbox` into the local `Batch`, and leave `Mailbox` empty, so anything posted from now on waits for the next announcement.

Naive first: copy the mailbox into the batch and leave the mailbox as it is. Run the tests and read which knockout gets announced twice.

## See it in the editor

Place one `DojoP6ArenaHerald` and two `DojoP6Fighter` actors. Name the fighters Red and Blue in their Details panels, put them on teams 0 and 1, and pick the herald as each fighter's Herald. Press Play, open the console, and run `ke * KnockOut` (each fighter receives no winner, so both are "out"). Both fighters vanish, and on the same frame the herald's label shows the last of the two announcements, such as "Blue is out". The announcement happened after the fighters were gone, from the copies they posted.

# Files

## DojoP6ArenaHerald.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP6ArenaHerald.generated.h"

class UTextRenderComponent;

/** A knockout as it was at the moment it happened, with everything a listener needs, so it still makes sense after the fighters have left. */
USTRUCT(BlueprintType)
struct FDojoP6KnockoutEvent
{
	GENERATED_BODY()

	/** The fighter who went down. */
	UPROPERTY(BlueprintReadOnly, Category = "Knockout")
	FName FallenName;

	/** The fallen fighter's team. */
	UPROPERTY(BlueprintReadOnly, Category = "Knockout")
	int32 FallenTeam = 0;

	/** The fighter who landed the blow; None when nobody did. */
	UPROPERTY(BlueprintReadOnly, Category = "Knockout")
	FName WinnerName;
};

/** Fired once per knockout when the herald announces it, at the end of the frame. */
DECLARE_MULTICAST_DELEGATE_OneParam(FDojoP6OnKnockoutAnnounced, const FDojoP6KnockoutEvent&);

/** The arena's herald: anyone posts knockouts at any moment, and the herald announces them together at the end of the frame. */
UCLASS()
class ADojoP6ArenaHerald : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and ticks after everything else in the frame. */
	ADojoP6ArenaHerald();

	/** Floating text that shows the latest announcement. */
	UPROPERTY(VisibleAnywhere, Category = "Herald")
	TObjectPtr<UTextRenderComponent> Label;

	/** Listeners hear each knockout here, when the herald announces it. */
	FDojoP6OnKnockoutAnnounced OnKnockoutAnnounced;

	/** Adds a knockout to the mailbox and returns at once; nothing is announced until the next Announce. */
	void Post(const FDojoP6KnockoutEvent& Event);

	/** Announces every knockout posted before this call, oldest first. Knockouts posted while announcing wait for the next call. */
	UFUNCTION(BlueprintCallable, Category = "Herald")
	void Announce();

	/** Knockouts waiting in the mailbox. */
	UFUNCTION(BlueprintPure, Category = "Herald")
	int32 GetWaitingCount() const;

	/** Announces the frame's knockouts; runs late in the frame, after fighters have ticked. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** Knockouts posted and not yet announced, oldest first. */
	UPROPERTY()
	TArray<FDojoP6KnockoutEvent> Mailbox;
};
```

## DojoP6ArenaHerald.cpp

```cpp
#include "DojoP6ArenaHerald.h"

#include "Components/TextRenderComponent.h"

ADojoP6ArenaHerald::ADojoP6ArenaHerald()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PostUpdateWork; // @explain: The herald picks its moment: the last tick group of the frame, after every fighter has had its turn.

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP6ArenaHerald::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Announce();
}

void ADojoP6ArenaHerald::Post(const FDojoP6KnockoutEvent& Event)
{
	Mailbox.Add(Event); // @explain: Posting only stores the knockout and returns, so the fighter is never held up by whoever listens.
}

void ADojoP6ArenaHerald::Announce()
{
	// Your code: move every waiting knockout out of Mailbox into Batch, and leave Mailbox empty for knockouts posted from now on.
	TArray<FDojoP6KnockoutEvent> Batch;

	for (const FDojoP6KnockoutEvent& Event : Batch)
	{
		const FString Line = Event.WinnerName.IsNone() ? FString::Printf(TEXT("%s is out"), *Event.FallenName.ToString()) : FString::Printf(TEXT("%s knocked out %s"), *Event.WinnerName.ToString(), *Event.FallenName.ToString());
		Label->SetText(FText::FromString(Line));

		OnKnockoutAnnounced.Broadcast(Event); // @explain: Listeners hear the knockout here, at the herald's chosen moment, not inside the fighter's KnockOut call.
	}
}

int32 ADojoP6ArenaHerald::GetWaitingCount() const
{
	return Mailbox.Num();
}
```

## DojoP6Fighter.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP6Fighter.generated.h"

class ADojoP6ArenaHerald;
class UTextRenderComponent;

/** An arena fighter who, when knocked out, posts the knockout to the herald and leaves the arena. */
UCLASS()
class ADojoP6Fighter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP6Fighter();

	/** Floating text with the fighter's name. */
	UPROPERTY(VisibleAnywhere, Category = "Fighter")
	TObjectPtr<UTextRenderComponent> Label;

	/** The name the herald announces. */
	UPROPERTY(EditAnywhere, Category = "Fighter")
	FName FighterName = TEXT("Fighter");

	/** The fighter's team. */
	UPROPERTY(EditAnywhere, Category = "Fighter")
	int32 Team = 0;

	/** The herald that hears this fighter's knockout, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Fighter")
	TObjectPtr<ADojoP6ArenaHerald> Herald;

	/** Posts this fighter's knockout to the herald, then removes the fighter from the arena. Winner may be empty. */
	UFUNCTION(BlueprintCallable, Category = "Fighter")
	void KnockOut(ADojoP6Fighter* Winner);

protected:
	/** Shows the fighter's name. */
	virtual void BeginPlay() override;
};
```

## DojoP6Fighter.cpp

```cpp
#include "DojoP6Fighter.h"

#include "Components/TextRenderComponent.h"
#include "DojoP6ArenaHerald.h"

ADojoP6Fighter::ADojoP6Fighter()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP6Fighter::BeginPlay()
{
	Super::BeginPlay();

	Label->SetText(FText::FromName(FighterName));
}

void ADojoP6Fighter::KnockOut(ADojoP6Fighter* Winner)
{
	if (IsValid(Herald))
	{
		FDojoP6KnockoutEvent Event;
		Event.FallenName = FighterName; // @explain: The event copies what listeners will need, because the fighter is gone by the time anyone reads it.
		Event.FallenTeam = Team;
		Event.WinnerName = IsValid(Winner) ? Winner->FighterName : NAME_None;
		Herald->Post(Event);
	}

	Destroy(); // @explain: The fighter leaves at once, before the herald announces anything, which is why the event cannot just point back at it.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p6-knockout-herald/DojoP6ArenaHerald.h"
#include "Quests/p6-knockout-herald/DojoP6Fighter.h"
#include "Support/DojoTestWorld.h"

namespace DojoP6KnockoutHeraldTest
{
	/** Spawns a fighter with a name and team, reporting to the herald. */
	ADojoP6Fighter* SpawnFighter(FDojoTestWorld& TestWorld, ADojoP6ArenaHerald* Herald, FName Name, int32 Team)
	{
		ADojoP6Fighter* Fighter = TestWorld.SpawnActor<ADojoP6Fighter>();
		if (!Fighter) return nullptr;

		Fighter->FighterName = Name;
		Fighter->Team = Team;
		Fighter->Herald = Herald;
		return Fighter;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P6_KnockoutHerald_PostedNowAnnouncedLater, "Dojo.P6.KnockoutHerald.PostedNowAnnouncedLater", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A knockout is announced on the herald's Announce, not inside KnockOut, and exactly once. */
bool FDojo_P6_KnockoutHerald_PostedNowAnnouncedLater::RunTest(const FString& Parameters)
{
	using namespace DojoP6KnockoutHeraldTest;

	FDojoTestWorld TestWorld;

	ADojoP6ArenaHerald* Herald = TestWorld.SpawnActor<ADojoP6ArenaHerald>();
	if (!TestNotNull(TEXT("Herald spawned"), Herald) || !TestNotNull(TEXT("Herald has a label"), Herald->Label.Get())) return false;

	ADojoP6Fighter* Red = SpawnFighter(TestWorld, Herald, TEXT("Red"), 0);
	ADojoP6Fighter* Blue = SpawnFighter(TestWorld, Herald, TEXT("Blue"), 1);
	if (!TestNotNull(TEXT("Fighters spawned"), Red) || !TestNotNull(TEXT("Fighters spawned"), Blue)) return false;

	int32 Heard = 0;
	Herald->OnKnockoutAnnounced.AddLambda([&Heard](const FDojoP6KnockoutEvent& Event) { Heard++; });

	Red->KnockOut(Blue);
	TestEqual(TEXT("Nothing is announced inside KnockOut"), Heard, 0);
	TestEqual(TEXT("One knockout waits in the mailbox"), Herald->GetWaitingCount(), 1);

	Herald->Announce();
	TestEqual(TEXT("Announce delivers it"), Heard, 1);
	TestEqual(TEXT("The label names both fighters"), Herald->Label->Text.ToString(), FString(TEXT("Blue knocked out Red")));
	TestEqual(TEXT("The mailbox is empty afterwards"), Herald->GetWaitingCount(), 0);

	Herald->Announce();
	TestEqual(TEXT("A knockout is announced only once"), Heard, 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P6_KnockoutHerald_EventOutlivesTheFighter, "Dojo.P6.KnockoutHerald.EventOutlivesTheFighter", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The fallen fighter is destroyed before the announcement, and the announced event still carries its name and team. */
bool FDojo_P6_KnockoutHerald_EventOutlivesTheFighter::RunTest(const FString& Parameters)
{
	using namespace DojoP6KnockoutHeraldTest;

	FDojoTestWorld TestWorld;

	ADojoP6ArenaHerald* Herald = TestWorld.SpawnActor<ADojoP6ArenaHerald>();
	ADojoP6Fighter* Fallen = SpawnFighter(TestWorld, Herald, TEXT("Moss"), 1);
	if (!TestNotNull(TEXT("Herald spawned"), Herald) || !TestNotNull(TEXT("Fighter spawned"), Fallen)) return false;

	TArray<FDojoP6KnockoutEvent> Heard;
	Herald->OnKnockoutAnnounced.AddLambda([&Heard](const FDojoP6KnockoutEvent& Event) { Heard.Add(Event); });

	Fallen->KnockOut(nullptr);
	TestFalse(TEXT("The fighter has left the arena"), IsValid(Fallen));

	Herald->Announce();
	if (!TestEqual(TEXT("One knockout announced"), Heard.Num(), 1)) return false;

	TestEqual(TEXT("The event still names the fallen fighter"), Heard[0].FallenName, FName(TEXT("Moss")));
	TestEqual(TEXT("The event still carries the team"), Heard[0].FallenTeam, 1);
	TestTrue(TEXT("Nobody landed the blow"), Heard[0].WinnerName.IsNone());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P6_KnockoutHerald_PostsWhileAnnouncingWait, "Dojo.P6.KnockoutHerald.PostsWhileAnnouncingWait", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A listener that posts a new knockout while hearing one does not get it in the same announcement; it comes next time. */
bool FDojo_P6_KnockoutHerald_PostsWhileAnnouncingWait::RunTest(const FString& Parameters)
{
	using namespace DojoP6KnockoutHeraldTest;

	FDojoTestWorld TestWorld;

	ADojoP6ArenaHerald* Herald = TestWorld.SpawnActor<ADojoP6ArenaHerald>();
	ADojoP6Fighter* First = SpawnFighter(TestWorld, Herald, TEXT("Ash"), 0);
	if (!TestNotNull(TEXT("Herald spawned"), Herald) || !TestNotNull(TEXT("Fighter spawned"), First)) return false;

	int32 Heard = 0;
	Herald->OnKnockoutAnnounced.AddLambda([&Heard, Herald](const FDojoP6KnockoutEvent& Event)
	{
		Heard++;

		// The champion's rule: the first knockout of a bout also eliminates the fallen fighter's partner.
		if (Event.FallenName == FName(TEXT("Ash")))
		{
			FDojoP6KnockoutEvent Partner;
			Partner.FallenName = TEXT("Ember");
			Partner.FallenTeam = Event.FallenTeam;
			Herald->Post(Partner);
		}
	});

	First->KnockOut(nullptr);
	Herald->Announce();
	TestEqual(TEXT("The first announcement hears only the first knockout"), Heard, 1);
	TestEqual(TEXT("The partner's knockout waits for the next round"), Herald->GetWaitingCount(), 1);

	Herald->Announce();
	TestEqual(TEXT("The next announcement hears the partner"), Heard, 2);
	TestEqual(TEXT("Nothing is left waiting"), Herald->GetWaitingCount(), 0);

	return true;
}

#endif
```

# Hints

- After your line runs, two arrays exist: one the loop will walk and one that collects new posts. Each knockout must be in exactly one of them.
- Moving the mailbox into the batch hands over its contents in one step; resetting the mailbox afterwards makes sure it starts empty either way.
- `MoveTemp` is in `Templates/UnrealTemplate.h`, and `TArray::Reset` in `Containers/Array.h` empties an array but keeps its memory for the next frame's posts.

# Rubric

- Posting stores the event and returns; nothing is announced inside the fighter's call.
- Announce takes the whole mailbox into a batch first and leaves the mailbox empty, so each knockout is announced exactly once.
- Knockouts posted while announcing wait for the next announcement.
- The event carries copies of the names and team, so it reads correctly after the fighter is destroyed.
- The herald announces once per frame, in the last tick group, rather than whenever a fighter falls.

# Alternative

The fighter could fire a delegate of its own at the moment it falls and let listeners react right away. That is simpler and immediate, and it is the right shape when every listener can safely run inside the fighter's call. It goes wrong here because the fighter is being destroyed, listeners may spawn or destroy other actors mid-combat, and several knockouts in one frame would each trigger their own round of scoreboard and crowd updates. The mailbox costs one frame of delay and a struct per knockout, and buys a single, predictable moment where the whole frame's knockouts are handled together.

# Parsons

```yaml
- id: herald-announce
  prompt: Put the start of Announce in order.
  lines:
    - "void ADojoP6ArenaHerald::Announce()"
    - "{"
    - "	TArray<FDojoP6KnockoutEvent> Batch = MoveTemp(Mailbox);"
    - "	Mailbox.Reset();"
    - "	for (const FDojoP6KnockoutEvent& Event : Batch)"
    - "	{"
    - "		OnKnockoutAnnounced.Broadcast(Event);"
    - "	}"
    - "}"
  distractors:
    - line: "	for (const FDojoP6KnockoutEvent& Event : Mailbox)"
      mistake: Walking the mailbox itself breaks when a listener posts while hearing, because the array changes under the loop.
- id: fighter-knockout
  prompt: Put the heart of KnockOut in order.
  lines:
    - "	FDojoP6KnockoutEvent Event;"
    - "	Event.FallenName = FighterName;"
    - "	Event.FallenTeam = Team;"
    - "	Herald->Post(Event);"
    - "	Destroy();"
  distractors:
    - line: "	Herald->OnKnockoutAnnounced.Broadcast(Event);"
      mistake: Broadcasting from the fighter announces at once, inside its own call, which is exactly what the mailbox exists to avoid.
```
