---
id: s3-savegame-properties
title: SaveGame properties and archives
order: 4
kind: concept
difficulty: 3
patterns: []
skills: [saving, reflection]
terms: [savegame-property, uproperty, reflection]
prerequisites: [s3-save-record]
xp: 30
estimatedMinutes: 9
concepts:
  - The SaveGame specifier marks which properties of an actor are progress
  - An archive with ArIsSaveGame set writes only the marked properties into bytes, and reads them back the same way
  - The proxy archive writes object references as paths that can be found again
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a lantern has `UPROPERTY(SaveGame) bool bLit` and `UPROPERTY(EditAnywhere) FLinearColor Tint`. While it is lit with a red tint, code writes the lantern into bytes with an archive whose ArIsSaveGame flag is set, changes both values, and reads the bytes back. What comes back?"
choices:
  - Both values, because both are UPROPERTYs
  - Only bLit; Tint keeps the value it was changed to
  - Neither, because actors cannot be written to bytes
  - Only Tint, because it is editable
answerIndex: 1
explanation: With ArIsSaveGame set, the property writer skips every property that is not marked SaveGame, in both directions.
```

# Card

A save record can store an actor's state as bytes, but something has to decide which of the actor's properties those bytes hold. Writing each field by hand works and grows with every field. Unreal can do it from reflection instead.

Mark the properties that are progress with the `SaveGame` specifier: `UPROPERTY(SaveGame) bool bOpen;`. The flag means nothing on its own; it is read by an archive that asks for save game data. In the glossary these are **SaveGame properties**.

To write an actor's marked properties into bytes:

- `FMemoryWriter Writer(Bytes, true);` (header `Serialization/MemoryWriter.h`) writes into a `TArray<uint8>` from its start. The `true` marks it as a persistent archive.
- `FObjectAndNameAsStringProxyArchive Archive(Writer, true);` (header `Serialization/ObjectAndNameAsStringProxyArchive.h`) wraps it so object references are written as the object's path and found again by that path when read. A plain memory archive cannot write object references at all; it stops on an assertion.
- `Archive.ArIsSaveGame = true;` tells the property writer to skip every property that is not marked `SaveGame`.
- `Archive.ArNoDelta = true;` makes it write every marked property. By default the writer skips a property whose value equals the class default, which keeps level files small; in a save that skip is a trap, because loading leaves a skipped property at whatever value the actor holds when it loads, not at the default.
- `Actor->Serialize(Archive);` walks the actor's reflected properties and writes the marked ones.

Reading back is the same lines with `FMemoryReader Reader(Bytes, true);` (header `Serialization/MemoryReader.h`) in place of the writer: `Serialize` sees a loading archive and fills the marked properties from the bytes, leaving every other property as it was.

The properties are written with their names, so adding a new SaveGame property later does not break old bytes; it simply keeps its default when loading bytes that never held it. Renaming one does lose the old value.

The bytes do not move the actor: its transform lives in its components, not in its own marked properties, so an actor that must return to a saved place keeps that place in a marked property of its own.

A `USaveGame` object itself is written by `SaveGameToSlot` without `ArIsSaveGame`, so every `UPROPERTY` on the save object is saved, marked or not. The flag is for actors and components, where most properties are not progress.

# Example

```cpp
/** Writes an actor's SaveGame properties into bytes. */
TArray<uint8> DojoExCapture(AActor* Actor)
{
	TArray<uint8> Bytes;
	FMemoryWriter Writer(Bytes, true);
	FObjectAndNameAsStringProxyArchive Archive(Writer, true);
	Archive.ArIsSaveGame = true;
	Archive.ArNoDelta = true;
	Actor->Serialize(Archive);
	return Bytes;
}

/** Reads bytes from DojoExCapture back into the same kind of actor. */
void DojoExRestore(AActor* Actor, const TArray<uint8>& Bytes)
{
	FMemoryReader Reader(Bytes, true);
	FObjectAndNameAsStringProxyArchive Archive(Reader, true);
	Archive.ArIsSaveGame = true;
	Archive.ArNoDelta = true;
	Actor->Serialize(Archive);
}
```

# Questions

```yaml
- id: fill-specifier
  type: fill-blank
  prompt: "To have a door's open flag written by an archive that asks for save game data, declare it UPROPERTY(___) bool bOpen;"
  acceptedAnswers: [SaveGame]
  explanation: The SaveGame specifier sets the property flag that archives with ArIsSaveGame look for.
- id: flag-on-archive
  type: multiple-choice
  prompt: An actor's properties are marked SaveGame, but the bytes written from it also hold every other property. What was left out?
  choices:
    - Setting ArIsSaveGame to true on the archive
    - Marking the actor class Blueprintable
    - Calling SaveGameToSlot before Serialize
    - Using FMemoryReader instead of FMemoryWriter
  answerIndex: 0
  explanation: Without ArIsSaveGame the archive writes every serializable property and ignores the SaveGame flag.
- id: spot-reader-writer
  type: spot-the-bug
  prompt: This should put a lantern's saved properties back from Bytes, but the lantern never changes, and the saved bytes now hold its current values. Which line is wrong?
  code: |
    void DojoExRestore(AActor* Lantern, TArray<uint8>& Bytes)
    {
    	FMemoryWriter Archive(Bytes, true);
    	FObjectAndNameAsStringProxyArchive Proxy(Archive, true);
    	Proxy.ArIsSaveGame = true;
    	Lantern->Serialize(Proxy);
    }
  bugLine: 3
  fix: Read from the bytes with an FMemoryReader so Serialize loads the properties instead of writing them out again.
  explanation: Serialize writes when its archive is saving and reads when it is loading; a writer starts at the beginning of the array and overwrites the checkpoint with the lantern's current values.
- id: why-proxy
  type: multiple-choice
  prompt: Why wrap the memory writer in FObjectAndNameAsStringProxyArchive instead of serializing straight into it?
  choices:
    - It compresses the bytes
    - It writes object references as paths and finds them again when reading, which a plain memory archive cannot do at all
    - It is the only archive that can set ArIsSaveGame
    - It makes Serialize skip transient properties
  answerIndex: 1
  explanation: A plain memory archive asserts when it meets an object reference; the proxy writes the referenced object's path and looks it up again on load.
- id: explain-savegame-flag
  type: explain-in-one-sentence
  prompt: In one sentence, say how an actor's SaveGame properties end up in a save and come back.
  modelAnswer: An archive with ArIsSaveGame set writes only the SaveGame-marked properties into bytes when the actor is serialized, and the same kind of archive reading those bytes puts just those properties back.
  rubric:
    - Names the SaveGame mark and the ArIsSaveGame flag on the archive
    - Says the same serialization runs in both directions with a writer and a reader
  explanation: Reflection lists the properties; the flag on the archive chooses which ones travel.
```
