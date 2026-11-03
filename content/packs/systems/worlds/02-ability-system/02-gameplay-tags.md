---
id: s2-gameplay-tags
title: Gameplay tags name states instead of booleans
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [data, tags]
terms: [gameplay-tags, fname, build-cs]
prerequisites: [s2-ability-plan]
xp: 30
estimatedMinutes: 8
concepts:
  - A gameplay tag is a dotted name registered once, and a container holds a set of them
  - Asking a container about a parent tag also matches the tags below it, but not the other way round
  - Native tags are declared in a header and defined in a .cpp, so no project settings are needed
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a hero's tag container holds `Status.Burning.Strong`. Code asks the container `HasTag` with the tag `Status.Burning`. What does it answer?"
choices:
  - False, because the two names are not the same
  - True, because the container's tag sits below the one asked about
  - A compile error, because HasTag only takes exact names
  - True only if Status.Burning was also added by hand
answerIndex: 1
explanation: Tags form a tree, and a container remembers the parents of every tag it holds, so asking about a parent matches any tag below it.
```

# Card

A hero can be planted, stunned, burning, or invisible, and moves care about those states. A boolean per state grows into a pile of fields that every system must know by name. **Gameplay tags** replace the pile with names: `DojoS2.State.Rooted` is one tag, and the dots make a tree, so `DojoS2.State` is its parent.

A tag is not a free string. Every tag is registered once with the engine's tag manager, which is why a typo in a tag name fails instead of quietly never matching. `FGameplayTag` holds one registered tag, and `FGameplayTagContainer` holds a set of them. Both are `USTRUCT`s, so they show in the Details panel with a picker that lists only registered tags.

Asking a container a question:

- `HasTag(Tag)` is true when the container holds that tag or a tag below it. A container with `DojoS2.State.Rooted` answers true for `DojoS2.State`.
- `HasTagExact(Tag)` ignores the tree: only the exact tag counts.
- `HasAny(Other)` is true when the container matches any tag of another container, with the same parent rule. `HasAll(Other)` needs every one.

The parent rule runs one way. The container you ask must hold the deeper tag: a container with only `DojoS2.State` answers false for `DojoS2.State.Rooted`. So "may this move start?" asks the user's tags whether they have any of the move's blocking tags, `UserTags.HasAny(BlockedByTags)`. Asked the other way round, a move blocked by the whole `DojoS2.State` branch would never notice a rooted user.

Tags come from two places. Designers add them in Project Settings, under Gameplay Tags, which writes them to a config file. Programmers can also declare them in C++ as native tags: `UE_DECLARE_GAMEPLAY_TAG_EXTERN(Name)` in a header, and `UE_DEFINE_GAMEPLAY_TAG(Name, "A.B")` or `UE_DEFINE_GAMEPLAY_TAG_COMMENT` in exactly one `.cpp`. Code that uses tags needs the `GameplayTags` module in the module's `.Build.cs`; the sandbox already has it.

Do not confuse gameplay tags with actor tags. `AActor::Tags` is a plain array of `FName`s, checked with `ActorHasTag`; it has no tree and no registry. It is handy for finding things in a level. Gameplay tags are for game state that rules check.

# Example

```cpp
// DojoExTags.h
namespace DojoExTags
{
	UE_DECLARE_GAMEPLAY_TAG_EXTERN(Status_Burning);
}

// DojoExTags.cpp
namespace DojoExTags
{
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Status_Burning, "DojoEx.Status.Burning", "On fire and taking damage over time.");
}

// Anywhere that includes DojoExTags.h
FGameplayTagContainer HeroTags;
HeroTags.AddTag(DojoExTags::Status_Burning);

const bool bOnFire = HeroTags.HasTag(DojoExTags::Status_Burning);
```

# Questions

```yaml
- id: fill-has-any
  type: fill-blank
  prompt: "To ask whether a user carries any tag in a move's BlockedByTags, parents included, write UserTags.___(BlockedByTags)."
  acceptedAnswers: [HasAny]
  explanation: HasAny matches when the container holds any of the other container's tags or a tag below one of them; HasAnyExact would skip the tree.
- id: parent-direction
  type: multiple-choice
  prompt: "A container holds only `DojoS2.State`. What does `HasTag(DojoS2.State.Rooted)` answer?"
  choices:
    - True, because Rooted sits under State
    - True only with HasTagExact
    - False, because the container does not hold Rooted or anything below it
    - It depends on the order the tags were registered
  answerIndex: 2
  explanation: The container you ask must hold the deeper tag; a parent in the container does not match a child you ask about.
- id: spot-blocked-direction
  type: spot-the-bug
  prompt: A move is blocked by the whole DojoS2.State branch, yet it starts while its user is rooted. Which line is wrong?
  code: |
    bool UDojoExMove::IsBlockedBy(const FGameplayTagContainer& UserTags) const
    {
    	return BlockedByTags.HasAny(UserTags);
    }
  bugLine: 3
  fix: Ask the user's tags, which hold the deeper tag, whether they have any of the blocking tags.
  explanation: "BlockedByTags holds the parent DojoS2.State and the user holds DojoS2.State.Rooted; parent matching only works when the container you ask holds the deeper tag."
- id: tags-or-actor-tags
  type: multiple-choice
  prompt: You want rules to check whether a hero is planted, with a typo caught early and a parent tag that matches every kind of planted. Which fits?
  choices:
    - A gameplay tag in an FGameplayTagContainer
    - A name in AActor::Tags checked with ActorHasTag
    - A bool on the hero class
    - An FString compared with ==
  answerIndex: 0
  explanation: Gameplay tags are registered and form a tree; actor tags are plain names with no registry and no parents.
- id: explain-tags
  type: explain-in-one-sentence
  prompt: In one sentence, say why a move checks the user's gameplay tags instead of reading a bool such as bIsRooted on the hero.
  modelAnswer: The move asks a container of registered tags, so it needs no knowledge of the hero's class and a new state is a new tag rather than a new field every system must know.
  rubric:
    - Says the move does not need to know the hero's class or fields
    - Says new states are added as tags without new code in every system
  explanation: Tags turn states into data that any system can check through one container.
```
