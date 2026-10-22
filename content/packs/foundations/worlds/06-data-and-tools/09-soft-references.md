---
id: f6-soft-references
title: Soft references and loading on demand
order: 9
kind: concept
difficulty: 3
patterns: []
skills: [data, memory]
terms: [tsoftobjectptr, static-mesh-component, primary-data-asset]
prerequisites: [f6-level-curve]
xp: 25
estimatedMinutes: 8
concepts:
  - A hard reference loads its asset with whatever holds it; a soft reference holds only a path
  - LoadSynchronous loads now; the streamable manager loads in the background
  - Choose soft references for big assets that are not always needed
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a shop data asset lists 50 weapon meshes as TObjectPtr<UStaticMesh>. The player opens the shop and looks at one. How many of the meshes are in memory?"
choices:
  - One, the one on screen
  - All 50, loaded with the shop asset
  - None until the shop is closed
  - Only the ones that were looked at before
answerIndex: 1
explanation: A hard reference loads its asset whenever the object holding it loads, so all 50 come in with the shop.
```

# Card

Every `TObjectPtr` UPROPERTY that points at an asset is a **hard reference**. When the object that holds it loads, the asset loads too, and so does everything that asset hard-references. That is right for things you always need, such as a blaster's weapon data. It is wasteful for a catalog: fifty meshes in memory to show one.

A **soft reference**, `TSoftObjectPtr<UStaticMesh>`, holds the asset's path, such as `/Game/Weapons/SM_Rifle.SM_Rifle`, and nothing else. In Details it looks like an asset picker, but picking an asset stores the path. A soft reference can be:

- **Null.** No path set; `IsNull()` is true.
- **Unloaded.** A path is set but the asset is not in memory; `Get()` returns nullptr.
- **Loaded.** `Get()` returns the object.

Two ways to turn a path into an object:

- **`LoadSynchronous()`** loads it now and returns it, or nullptr if the path leads nowhere. The game thread waits while it reads from disk, which is fine for something small and needed immediately.
- **The streamable manager** loads in the background: `UAssetManager::GetStreamableManager().RequestAsyncLoad(Path, Callback)` calls you back when the asset is ready, and keeps it in memory while you hold the returned handle. Blueprint's Async Load Asset node does the same. Use it for anything large, or anything you can see coming, such as loading a boss's meshes before its arena door opens.

`TSoftClassPtr<T>` is the same idea for classes, such as a Blueprint enemy class to spawn later. Primary data assets and the Asset Manager build on soft references to list and load whole groups of assets by type.

Once loaded, an asset is used like any other. A **static mesh component** (`UStaticMeshComponent`) draws one static mesh: give it the loaded mesh with `SetStaticMesh`.

A soft reference does not keep an asset loaded. If nothing else holds the loaded mesh, garbage collection may free it, so whatever needs it afterwards should hold a hard pointer, such as the mesh component that shows it.

# Example

```cpp
/** Every helmet the player could wear, by path, so only the worn one is loaded. */
UPROPERTY(EditAnywhere, Category = "Wardrobe")
TArray<TSoftObjectPtr<UStaticMesh>> Helmets;

void ADojoMannequin::Wear(int32 Index)
{
	if (!Helmets.IsValidIndex(Index) || Helmets[Index].IsNull()) return;

	if (UStaticMesh* Helmet = Helmets[Index].LoadSynchronous())
	{
		HelmetMesh->SetStaticMesh(Helmet);
	}
}
```

# Questions

```yaml
- id: holds-what
  type: multiple-choice
  prompt: "What does a TSoftObjectPtr store?"
  choices:
    - A loaded copy of the asset
    - The asset's path, and a pointer once it is loaded
    - A weak pointer that keeps the asset loaded
  answerIndex: 1
  explanation: It is a path that can be resolved to an object when the asset is in memory.
- id: fill-load
  type: fill-blank
  prompt: "To load a soft-referenced mesh right now and get it back, call Mesh.___()."
  acceptedAnswers: [LoadSynchronous]
  explanation: LoadSynchronous loads the asset if needed and returns it, or nullptr.
- id: spot-get
  type: spot-the-bug
  prompt: A wardrobe works when the helmet was shown earlier in the session, but a fresh helmet never appears. Which line is wrong?
  code: |
    void ADojoMannequin::Wear(int32 Index)
    {
    	if (!Helmets.IsValidIndex(Index)) return;
    	HelmetMesh->SetStaticMesh(Helmets[Index].Get());
    }
  bugLine: 4
  fix: Load it with LoadSynchronous, or an async load, instead of Get.
  explanation: Get only returns an asset that is already in memory; it never loads.
- id: when-async
  type: multiple-choice
  prompt: "A boss's 300 MB of meshes are needed when the player opens its arena door. Which load fits?"
  choices:
    - LoadSynchronous when the door opens
    - An async load through the streamable manager, started as the player approaches
    - A hard reference on the level
  answerIndex: 1
  explanation: A background load started early avoids a hitch at the door and keeps the meshes out of memory until then.
- id: explain-soft
  type: explain-in-one-sentence
  prompt: In one sentence, say when a soft reference is better than a hard one.
  modelAnswer: When the asset is big or only sometimes needed, because a soft reference keeps it out of memory until the code chooses to load it.
  rubric:
    - Mentions size or only sometimes needed
    - Mentions loading being deferred to when the code asks
  explanation: Soft references put loading under the code's control.
```
