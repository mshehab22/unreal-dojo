---
id: f6-data-assets
title: Data Assets
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [data]
terms: [data-asset, primary-data-asset, tsoftobjectptr]
prerequisites: [f5-follower]
xp: 25
estimatedMinutes: 7
concepts:
  - A data asset is a UObject saved in the Content Browser that holds numbers and references, not behavior
  - Code holds a pointer to the asset and reads from it, so designers change the data without code
  - A primary data asset adds an ID the Asset Manager can list and load
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: ten blasters in a level all point at the same DA_Pistol asset. A designer raises DA_Pistol's damage while the game runs. What happens?"
choices:
  - Nothing until the level is reloaded
  - Only blasters placed after the change use it
  - Every blaster that reads the asset when it fires uses the new damage
  - The editor makes ten copies of the asset, one per blaster
answerIndex: 2
explanation: There is one asset object in memory, and every blaster holds a pointer to it, so all of them see the change the next time they read it.
```

# Card

Code that hard-codes `Damage = 12` mixes two jobs: what a weapon does and how strong it is. A **data asset** moves the second job out of code.

You write a small C++ class that derives from `UDataAsset` and has only UPROPERTY fields: damage, clip size, a display name, a mesh. Once it compiles, a designer right-clicks in the Content Browser, picks Miscellaneous, then Data Asset, chooses your class, and gets an asset they can fill in Details and save. They can make as many as they like, DA_Pistol, DA_Rifle, DA_Cannon, without a programmer.

Gameplay code then holds a `TObjectPtr<UDojoWeaponData>` UPROPERTY, set in Details, and reads from it: `Weapon->Damage`. The asset is one shared object, so every actor that points at it reads the same numbers, and it costs one load however many actors use it. Read the value when you need it rather than copying it into the actor at BeginPlay, or an edited asset will not reach actors that already copied.

A data asset can hold references to other assets too. Holding a mesh or a sound as a `TSoftObjectPtr` keeps it as a path, so loading the data asset does not drag the mesh into memory with it; a later card covers loading those on demand.

**Primary data assets** (`UPrimaryDataAsset`) add an identity, an `FPrimaryAssetId` such as `Weapon:DA_Rifle`, that the Asset Manager understands. With it, code can list every weapon in the project without referencing each one, and load only the ones it needs. A small game can use plain data assets; a shop with two hundred items, or content that ships later, benefits from primary ones.

Data assets are one of the two main homes for designer data in Unreal. Data Tables are the other, and the next card compares them.

# Example

```cpp
/** How one kind of jump pad launches whatever steps on it. */
UCLASS(BlueprintType)
class UDojoJumpPadData : public UDataAsset
{
	GENERATED_BODY()

public:
	/** Upward speed given to whatever steps on the pad. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Jump Pad")
	float LaunchSpeed = 1200.f;

	/** The sound played on launch, loaded only when needed. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Jump Pad")
	TSoftObjectPtr<USoundBase> LaunchSound;
};

// On the pad actor: one pointer, set in Details to DA_SmallPad or DA_BigPad.
UPROPERTY(EditAnywhere, Category = "Jump Pad")
TObjectPtr<UDojoJumpPadData> PadData;
```

# Questions

```yaml
- id: base-class
  type: fill-blank
  prompt: "A C++ class designers can turn into assets from the Data Asset menu derives from U___."
  acceptedAnswers: [DataAsset]
  explanation: UDataAsset is the base; UPrimaryDataAsset derives from it.
- id: why-asset
  type: multiple-choice
  prompt: "Why put a weapon's damage in a data asset instead of a UPROPERTY on each weapon Blueprint?"
  choices:
    - Data assets are faster to read every frame
    - One asset is shared by every weapon that uses it, and new weapons need no new class
    - UPROPERTYs on Blueprints cannot be edited
  answerIndex: 1
  explanation: The asset is one shared object and a new weapon is a new asset, not a new class.
- id: spot-copy
  type: spot-the-bug
  prompt: A designer changes DA_Pistol's damage while playing, but blasters that were already placed keep the old damage. Which line causes it?
  code: |
    void ADojoBlaster::BeginPlay()
    {
    	Super::BeginPlay();
    	CachedDamage = Weapon->Damage;
    }
  bugLine: 4
  fix: Read Weapon->Damage when firing instead of copying it at BeginPlay.
  explanation: The copy is taken once, so later edits to the asset never reach it.
- id: primary-why
  type: multiple-choice
  prompt: "What does a primary data asset add over a plain data asset?"
  choices:
    - A Tick function
    - An ID the Asset Manager can list and load without hard references
    - The ability to hold UPROPERTYs
  answerIndex: 1
  explanation: The primary asset ID lets the Asset Manager find and load assets of a type on request.
- id: explain-split
  type: explain-in-one-sentence
  prompt: In one sentence, say what job a data asset takes away from gameplay code.
  modelAnswer: It holds the numbers and references that tune a thing, so the code only says what the thing does and designers change how strong it is without code.
  rubric:
    - Mentions the numbers or tuning moving out of code
    - Mentions designers changing them without a programmer
  explanation: Separating what something does from how strong it is lets both change on their own.
```
