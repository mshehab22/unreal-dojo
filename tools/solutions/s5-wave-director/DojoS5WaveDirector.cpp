#include "DojoS5WaveDirector.h"

#include "Engine/World.h"
#include "Quests/s5-pool/DojoS5Beetle.h"
#include "Quests/s5-pool/DojoS5PoolComponent.h"
#include "Quests/s5-wave-plan/DojoS5Hatch.h"
#include "Quests/s5-wave-plan/DojoS5WavePlan.h"
#include "TimerManager.h"

/** Turns ticking off; the director runs on timers. */
ADojoS5WaveDirector::ADojoS5WaveDirector()
{
	PrimaryActorTick.bCanEverTick = false;
}

/** Chooses the plan, the pool, the viewer, and the hatches. */
void ADojoS5WaveDirector::Setup(UDojoS5WavePlan* NewPlan, UDojoS5PoolComponent* NewPool, AActor* NewViewer, const TArray<ADojoS5Hatch*>& NewHatches)
{
	Plan = NewPlan;
	Pool = NewPool;
	Viewer = NewViewer;
	Hatches.Reset();

	for (ADojoS5Hatch* Hatch : NewHatches)
	{
		if (Hatch != nullptr)
		{
			Hatches.Add(Hatch);
		}
	}

	NextHatch = 0;
}

/** Starts wave 1 when the director is idle or done and has a plan and a pool. */
bool ADojoS5WaveDirector::StartNight()
{
	if (State == EDojoS5DirectorState::EDS_Wave || State == EDojoS5DirectorState::EDS_Rest || Plan == nullptr || Pool == nullptr)
	{
		return false;
	}

	NextHatch = 0;
	StartWave(1);
	return true;
}

/** Stops everything, puts every beetle back to sleep, and goes back to idle. */
void ADojoS5WaveDirector::StopNight()
{
	GetWorldTimerManager().ClearTimer(SpawnTimer);
	GetWorldTimerManager().ClearTimer(RestTimer);

	if (Pool != nullptr)
	{
		Pool->ReleaseAll();
	}

	State = EDojoS5DirectorState::EDS_Idle;
	Wave = 0;
	Alive = 0;
	LeftToSpawn = 0;
	NextHatch = 0;
}

/** What the director is doing right now. */
EDojoS5DirectorState ADojoS5WaveDirector::GetState() const
{
	return State;
}

/** The wave running or just finished. */
int32 ADojoS5WaveDirector::GetWave() const
{
	return Wave;
}

/** How many beetles of this wave are loose right now. */
int32 ADojoS5WaveDirector::GetAlive() const
{
	return Alive;
}

/** How many beetles of this wave have not come out yet. */
int32 ADojoS5WaveDirector::GetLeftToSpawn() const
{
	return LeftToSpawn;
}

/** Stops the timers when the director leaves play. */
void ADojoS5WaveDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearAllTimersForObject(this);

	Super::EndPlay(EndPlayReason);
}

/** Begins a wave: sets its numbers, announces it, starts the spawn timer, and sends the first beetle at once. */
void ADojoS5WaveDirector::StartWave(int32 NewWave)
{
	Wave = NewWave;
	State = EDojoS5DirectorState::EDS_Wave;
	Alive = 0;
	LeftToSpawn = Plan->GetBeetleCount(Wave);

	OnWaveStarted.Broadcast(Wave, LeftToSpawn);

	GetWorldTimerManager().SetTimer(SpawnTimer, this, &ADojoS5WaveDirector::TrySpawn, Plan->SpawnInterval, true);
	TrySpawn();
}

/** One spawn attempt: sends a beetle out of a hidden hatch if any are left and the live limit allows. */
void ADojoS5WaveDirector::TrySpawn()
{
	if (State != EDojoS5DirectorState::EDS_Wave || LeftToSpawn <= 0)
	{
		GetWorldTimerManager().ClearTimer(SpawnTimer);
		return;
	}

	if (Alive >= Plan->MaxAlive)
	{
		return;
	}

	ADojoS5Hatch* Hatch = PickHatch();

	if (Hatch == nullptr)
	{
		return;
	}

	ADojoS5Beetle* Beetle = Pool->Acquire(Hatch->GetActorLocation());

	if (Beetle == nullptr)
	{
		return;
	}

	// A pooled beetle comes back wave after wave; a second identical binding would count each swat twice.
	Beetle->OnDefeated.AddUniqueDynamic(this, &ADojoS5WaveDirector::HandleBeetleDefeated);
	++Alive;
	--LeftToSpawn;

	if (LeftToSpawn == 0)
	{
		GetWorldTimerManager().ClearTimer(SpawnTimer);
	}
}

/** The rest is over, so the next wave begins. */
void ADojoS5WaveDirector::EndRest()
{
	if (State == EDojoS5DirectorState::EDS_Rest)
	{
		StartWave(Wave + 1);
	}
}

/** A beetle of this wave was swatted: it goes back to the pool, and the wave may be cleared. */
void ADojoS5WaveDirector::HandleBeetleDefeated(ADojoS5Beetle* Beetle)
{
	if (State != EDojoS5DirectorState::EDS_Wave || Pool == nullptr || !Pool->Release(Beetle))
	{
		return;
	}

	Alive = FMath::Max(0, Alive - 1);

	// Nothing loose is not enough: the player may be faster than the spawn timer, so beetles still to come keep the wave open.
	if (Alive > 0 || LeftToSpawn > 0)
	{
		return;
	}

	GetWorldTimerManager().ClearTimer(SpawnTimer);

	if (Plan->IsFinalWave(Wave))
	{
		State = EDojoS5DirectorState::EDS_Done;
		OnWaveCleared.Broadcast(Wave);
		return;
	}

	State = EDojoS5DirectorState::EDS_Rest;
	OnWaveCleared.Broadcast(Wave);
	OnRestStarted.Broadcast(Wave + 1, Plan->RestSeconds);

	// A listener may have stopped the night while it heard the news.
	if (State != EDojoS5DirectorState::EDS_Rest)
	{
		return;
	}

	if (Plan->RestSeconds > 0.f)
	{
		GetWorldTimerManager().SetTimer(RestTimer, this, &ADojoS5WaveDirector::EndRest, Plan->RestSeconds, false);
	}
	else
	{
		EndRest();
	}
}

/** The next hatch, in turn after the last one used, that is out of the viewer's sight. */
ADojoS5Hatch* ADojoS5WaveDirector::PickHatch()
{
	const int32 Count = Hatches.Num();

	for (int32 Step = 0; Step < Count; ++Step)
	{
		const int32 Index = (NextHatch + Step) % Count;
		ADojoS5Hatch* Hatch = Hatches[Index];

		if (IsValid(Hatch) && Hatch->IsOutOfSight(Viewer))
		{
			NextHatch = (Index + 1) % Count;
			return Hatch;
		}
	}

	return nullptr;
}
