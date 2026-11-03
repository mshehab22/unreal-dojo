#include "DojoM7DoorChime.h"

#include "DojoM7LockedDoor.h"

ADojoM7DoorChime::ADojoM7DoorChime()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM7DoorChime::Listen(ADojoM7LockedDoor* Door)
{
	if (!IsValid(Door)) return;

	Door->OnUnlocked.AddUniqueDynamic(this, &ADojoM7DoorChime::HandleUnlocked);
}

int32 ADojoM7DoorChime::GetRings() const
{
	return Rings;
}

ADojoM7LockedDoor* ADojoM7DoorChime::GetLastDoor() const
{
	return LastDoor;
}

AActor* ADojoM7DoorChime::GetLastVisitor() const
{
	return LastVisitor;
}

void ADojoM7DoorChime::HandleUnlocked(ADojoM7LockedDoor* Door, AActor* Visitor)
{
	Rings++;
	LastDoor = Door;
	LastVisitor = Visitor;
}
