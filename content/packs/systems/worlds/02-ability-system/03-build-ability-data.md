---
id: s2-ability-data
title: Abilities as assets with tags that stop them
order: 3
kind: build
scaffold: worked
difficulty: 2
patterns: [type-object]
skills: [data, assets, tags]
terms: [data-asset, gameplay-tags, ftext, uproperty]
prerequisites: [s2-gameplay-tags, p10-type-object-when-not, p1-observer-when-not, p8-subclass-sandbox-when-not]
xp: 60
estimatedMinutes: 15
concepts:
  - One asset per ability, holding its cost, its wait, its run time, and its tags
  - An ability blocked by a parent tag is blocked by every tag below it
---

# Brief

When you make a Dash asset blocked by `DojoS2.State.Rooted` and a Slam asset blocked by the whole `DojoS2.State` branch, a rooted user may start neither of them, a user carrying only `DojoS2.State.Channeling` may still dash but not slam, and an asset with a cooldown of -2 reports a wait of 0 seconds.

Most of the code is written for you. Explain the marked lines, then fill the two gaps:

1. `UDojoS2AbilityData::GetCooldownSeconds`: the cooldown in seconds, which is `Cooldown` but never below 0.
2. `UDojoS2AbilityData::IsBlockedBy`: true when the user's tags include any of `BlockedByTags`, or a tag below one of them.

The world's three state tags are native tags in `DojoS2AbilityTags`, given in full. Dependency direction: the asset knows nothing about who uses it. It only describes one ability, and it never decides whether a user can afford it or whether its wait is over.

This is the first piece of the Sparring Ring boss.

## See it in the editor

In the Content Browser choose Add, Miscellaneous, Data Asset, pick `DojoS2AbilityData`, and make `DA_Dash` (Display Name Dash, Energy Cost 20, Cooldown 1, Blocked By Tags `DojoS2.State.Rooted`) and `DA_Slam` (Blocked By Tags `DojoS2.State`). The tag picker lists the three `DojoS2` tags without any project settings, because they are native. In the level Blueprint, on BeginPlay, make a container holding `DojoS2.State.Rooted` with Make Gameplay Tag Container from Tag, and print Is Blocked By on both assets: both print true. Change the tag to `DojoS2.State.Channeling` and play again: Dash prints false and Slam prints true.

# Files

## DojoS2AbilityTags.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "NativeGameplayTags.h"

/** The gameplay tags the ability world uses, declared in C++ so they exist without any project settings. */
namespace DojoS2Tags
{
	/** The parent of every state a user can be in while an ability runs. */
	UE_DECLARE_GAMEPLAY_TAG_EXTERN(State);

	/** The user is planted where it stands and cannot move itself. */
	UE_DECLARE_GAMEPLAY_TAG_EXTERN(State_Rooted);

	/** The user is concentrating and cannot start another big ability. */
	UE_DECLARE_GAMEPLAY_TAG_EXTERN(State_Channeling);
}
```

## DojoS2AbilityTags.cpp

```cpp
#include "DojoS2AbilityTags.h"

namespace DojoS2Tags
{
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State, "DojoS2.State", "Parent of every state an ability can put its user in.");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Rooted, "DojoS2.State.Rooted", "The user cannot move itself."); // @explain: Each native tag is defined in exactly one .cpp; the macro registers the name with the tag manager, so the tag exists in the editor's picker and in code without any project settings.
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Channeling, "DojoS2.State.Channeling", "The user cannot start another big ability.");
}
```

## DojoS2AbilityData.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "DojoS2AbilityData.generated.h"

/** One ability, kept in an asset so designers add and tune abilities without code; the ability component reads it and never copies its numbers (the Type Object pattern). */
UCLASS(BlueprintType)
class UDojoS2AbilityData : public UDataAsset // @explain: A data asset is saved as its own file, so a new ability is a new file a designer makes and tunes, and every user of the ability reads the same numbers.
{
	GENERATED_BODY()

public:
	/** The name shown to the player. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability")
	FText DisplayName;

	/** Energy spent each time the ability starts; 0 means it is free. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability", meta = (ClampMin = "0"))
	int32 EnergyCost = 0;

	/** Seconds after a start before the ability can start again; 0 means no wait. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability", meta = (ClampMin = "0.0"))
	float Cooldown = 0.f;

	/** Seconds the ability runs after it starts; its granted tags stay on the user that long. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability", meta = (ClampMin = "0.0"))
	float Duration = 0.f;

	/** Tags the user carries while the ability runs. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability")
	FGameplayTagContainer GrantedTags; // @explain: The ability does not say "the dash may not start"; it puts a state on its user, and any other ability that cares checks that state, so abilities never point at each other.

	/** The ability cannot start while the user carries any of these tags, or a tag below one of them. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability")
	FGameplayTagContainer BlockedByTags;

	/** The cooldown in seconds, never below 0, even when an old asset or code holds a negative number. */
	UFUNCTION(BlueprintPure, Category = "Ability")
	float GetCooldownSeconds() const;

	/** The run time in seconds, never below 0. */
	UFUNCTION(BlueprintPure, Category = "Ability")
	float GetDurationSeconds() const;

	/** True when a user carrying these tags may not start the ability. */
	UFUNCTION(BlueprintPure, Category = "Ability")
	bool IsBlockedBy(const FGameplayTagContainer& UserTags) const; // @explain: The container is passed by const reference because it can hold many tags and the asset only reads it.
};
```

## DojoS2AbilityData.cpp

```cpp
#include "DojoS2AbilityData.h"

float UDojoS2AbilityData::GetCooldownSeconds() const
{
	// Your code: return Cooldown, but never less than 0, even when an asset holds a negative number.
	return 0.f;
}

float UDojoS2AbilityData::GetDurationSeconds() const
{
	return FMath::Max(0.f, Duration);
}

bool UDojoS2AbilityData::IsBlockedBy(const FGameplayTagContainer& UserTags) const
{
	// Your code: true when the user's tags include any of BlockedByTags, or a tag below one of them. Ask the container that holds the deeper tags.
	return false;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "GameplayTagContainer.h"
#include "GameplayTagsManager.h"
#include "Quests/s2-ability-data/DojoS2AbilityData.h"
#include "Quests/s2-ability-data/DojoS2AbilityTags.h"

namespace DojoS2AbilityDataTest
{
	/** A container holding the given tags. */
	FGameplayTagContainer TagsOf(std::initializer_list<FGameplayTag> Tags)
	{
		FGameplayTagContainer Container;

		for (const FGameplayTag& Tag : Tags)
		{
			Container.AddTag(Tag);
		}

		return Container;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_AbilityData_TagsAreRegistered, "Dojo.S2.AbilityData.TagsAreRegistered", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks that the native tags exist in the tag manager and know their parent. */
bool FDojo_S2_AbilityData_TagsAreRegistered::RunTest(const FString& Parameters)
{
	const FGameplayTag Rooted = UGameplayTagsManager::Get().RequestGameplayTag(FName(TEXT("DojoS2.State.Rooted")), false);
	TestTrue(TEXT("DojoS2.State.Rooted is registered"), Rooted.IsValid());
	TestTrue(TEXT("The native variable holds the same tag"), Rooted == DojoS2Tags::State_Rooted.GetTag());
	TestTrue(TEXT("Rooted sits under State"), DojoS2Tags::State_Rooted.GetTag().MatchesTag(DojoS2Tags::State.GetTag()));
	TestFalse(TEXT("State does not sit under Rooted"), DojoS2Tags::State.GetTag().MatchesTag(DojoS2Tags::State_Rooted.GetTag()));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_AbilityData_BlockedByTags, "Dojo.S2.AbilityData.BlockedByTags", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks which users an exact blocking tag and a parent blocking tag stop. */
bool FDojo_S2_AbilityData_BlockedByTags::RunTest(const FString& Parameters)
{
	using namespace DojoS2AbilityDataTest;

	const FGameplayTag State = DojoS2Tags::State.GetTag();
	const FGameplayTag Rooted = DojoS2Tags::State_Rooted.GetTag();
	const FGameplayTag Channeling = DojoS2Tags::State_Channeling.GetTag();

	UDojoS2AbilityData* Dash = NewObject<UDojoS2AbilityData>();
	Dash->BlockedByTags.AddTag(Rooted);

	UDojoS2AbilityData* Slam = NewObject<UDojoS2AbilityData>();
	Slam->BlockedByTags.AddTag(State);

	UDojoS2AbilityData* Free = NewObject<UDojoS2AbilityData>();

	TestFalse(TEXT("A user with no tags may dash"), Dash->IsBlockedBy(FGameplayTagContainer()));
	TestTrue(TEXT("A rooted user may not dash"), Dash->IsBlockedBy(TagsOf({ Rooted })));
	TestFalse(TEXT("A channeling user may dash"), Dash->IsBlockedBy(TagsOf({ Channeling })));
	TestFalse(TEXT("A user carrying only the parent State is not rooted"), Dash->IsBlockedBy(TagsOf({ State })));

	TestTrue(TEXT("A rooted user may not slam"), Slam->IsBlockedBy(TagsOf({ Rooted })));
	TestTrue(TEXT("A channeling user may not slam"), Slam->IsBlockedBy(TagsOf({ Channeling })));
	TestFalse(TEXT("A user with no tags may slam"), Slam->IsBlockedBy(FGameplayTagContainer()));

	TestFalse(TEXT("An ability with no blocking tags is never blocked"), Free->IsBlockedBy(TagsOf({ Rooted, Channeling })));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_AbilityData_TimesNeverNegative, "Dojo.S2.AbilityData.TimesNeverNegative", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the cooldown and run time helpers with good and bad numbers. */
bool FDojo_S2_AbilityData_TimesNeverNegative::RunTest(const FString& Parameters)
{
	UDojoS2AbilityData* Ability = NewObject<UDojoS2AbilityData>();

	Ability->Cooldown = 1.5f;
	Ability->Duration = 0.75f;
	TestEqual(TEXT("A 1.5 second cooldown"), Ability->GetCooldownSeconds(), 1.5f);
	TestEqual(TEXT("A 0.75 second run"), Ability->GetDurationSeconds(), 0.75f);

	Ability->Cooldown = -2.f;
	Ability->Duration = -1.f;
	TestEqual(TEXT("A negative cooldown is no wait"), Ability->GetCooldownSeconds(), 0.f);
	TestEqual(TEXT("A negative run time is no run"), Ability->GetDurationSeconds(), 0.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_AbilityData_DesignersCanEdit, "Dojo.S2.AbilityData.DesignersCanEdit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the ability is a data asset and that designers can edit every number and tag. */
bool FDojo_S2_AbilityData_DesignersCanEdit::RunTest(const FString& Parameters)
{
	TestTrue(TEXT("The ability is a data asset"), UDojoS2AbilityData::StaticClass()->IsChildOf(UDataAsset::StaticClass()));

	for (const TCHAR* Name : { TEXT("DisplayName"), TEXT("EnergyCost"), TEXT("Cooldown"), TEXT("Duration"), TEXT("GrantedTags"), TEXT("BlockedByTags") })
	{
		const FProperty* Property = UDojoS2AbilityData::StaticClass()->FindPropertyByName(Name);
		if (!TestNotNull(FString::Printf(TEXT("%s is a UPROPERTY"), Name), Property)) continue;

		TestTrue(FString::Printf(TEXT("%s is editable in Details"), Name), Property->HasAnyPropertyFlags(CPF_Edit));
	}

	return true;
}

#endif
```

# Hints

- Both gaps are one line each. The first only has to keep a number from dropping below a floor; the second has to pick which of the two containers asks the question.
- `FMath::Max` picks the larger of two numbers. Gameplay tag containers answer `HasAny` with the tree in mind, but only from the side that holds the deeper tags.
- The user's container holds `DojoS2.State.Rooted`; the slam's container holds `DojoS2.State`. Read the comment above `HasAny` in `GameplayTagContainer.h` for which way round matches.

# Rubric

- The ability is a data asset, so a designer adds an ability by making a file, and every number and tag it needs is editable in Details.
- `GetCooldownSeconds` never returns less than 0, whatever the asset holds.
- `IsBlockedBy` is true for a user carrying a blocking tag or a tag below one, and false otherwise.
- A user carrying only a parent tag is not blocked by an ability that names one of its children.
- The asset holds no pointer to any user and makes no decision about energy or waits.

# Alternative

The blocking rule could be a list of other abilities: "Dash may not start while Shockwave runs". That reads plainly with two abilities and falls apart with ten, because every new ability has to be added to the lists of all the others, and the abilities end up pointing at each other. States as tags put a word between them: Shockwave adds `Rooted`, Dash refuses `Rooted`, and neither knows the other exists, so a new ability that roots its user needs no edits anywhere else. One asset per ability with shared fields is the Type Object pattern from Pack 2's "Kinds as data" world; Epic's Gameplay Ability System uses the same tags-in-between idea with its activation blocked tags.

# Parsons

```yaml
- id: ability-data-is-blocked-by
  prompt: Put IsBlockedBy in order.
  lines:
    - "bool UDojoS2AbilityData::IsBlockedBy(const FGameplayTagContainer& UserTags) const"
    - "{"
    - "	return UserTags.HasAny(BlockedByTags);"
    - "}"
  distractors:
    - line: "	return BlockedByTags.HasAny(UserTags);"
      mistake: Asks the wrong side; the container holding the parent tag cannot match the user's deeper tag, so a move blocked by a whole branch would never notice it.
    - line: "	return UserTags.HasTag(BlockedByTags);"
      mistake: HasTag takes a single FGameplayTag; comparing against a whole container needs HasAny or HasAll.
- id: ability-tags-define
  prompt: Put the native tag definitions in order, parent first.
  lines:
    - "namespace DojoS2Tags"
    - "{"
    - "	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State, \"DojoS2.State\", \"Parent of every state.\");"
    - "	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Rooted, \"DojoS2.State.Rooted\", \"The user cannot move itself.\");"
    - "}"
  distractors:
    - line: "	UE_DECLARE_GAMEPLAY_TAG_EXTERN(State_Rooted);"
      mistake: The declare macro only says the variable exists and belongs in the header; the .cpp needs a define macro that registers the tag.
    - line: "	FGameplayTag State_Rooted = FGameplayTag(\"DojoS2.State.Rooted\");"
      mistake: A tag cannot be made from a string this way; it has to be registered, either by a native tag macro or by Project Settings.
```
